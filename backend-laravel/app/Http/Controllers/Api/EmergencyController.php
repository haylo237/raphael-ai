<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EmergencyCase;
use App\Models\EmergencyCaseEvent;
use App\Models\Hospital;
use App\Models\PulseLog;
use App\Models\PulseNetworkContext;
use App\Services\PulseClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmergencyController extends Controller
{
    public function __construct(private readonly PulseClient $pulse) {}

    public function index(Request $request)
    {
        $cases = EmergencyCase::query()
            ->with(['patient', 'assignedHospital', 'createdBy', 'acceptedBy'])
            ->when($request->user()?->hospital_id, function ($q) use ($request) {
                if (in_array($request->user()->role, ['doctor', 'nurse', 'receptionist', 'hospital_admin'], true)) {
                    $q->where('assigned_hospital_id', $request->user()->hospital_id);
                }
            })
            ->latest()
            ->limit(100)
            ->get();

        return response()->json(['data' => $cases]);
    }

    public function show(EmergencyCase $emergency)
    {
        $emergency->load(['patient', 'assignedHospital', 'events.actor', 'pulseLogs', 'networkContext', 'createdBy', 'acceptedBy']);
        return response()->json(['data' => $emergency]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'patient_id' => 'nullable|exists:patient_profiles,id',
            'patient_name' => 'nullable|string|max:120',
            'phone' => 'nullable|string|max:32',
            'emergency_type' => 'nullable|string|max:80',
            'symptoms' => 'nullable|string',
            'location_hint' => 'nullable|string|max:255',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'network_quality' => 'nullable|string',
        ]);

        $case = DB::transaction(function () use ($data, $request) {
            $code = 'EMG-' . str_pad((string) ((EmergencyCase::max('id') ?? 0) + 1), 5, '0', STR_PAD_LEFT);

            $case = EmergencyCase::create(array_merge($data, [
                'code' => $code,
                'created_by_user_id' => $request->user()?->id,
                'status' => 'processing',
                'priority' => 'HIGH',
            ]));

            EmergencyCaseEvent::create([
                'emergency_case_id' => $case->id,
                'actor_user_id' => $request->user()?->id,
                'event' => 'CASE_CREATED',
                'detail' => 'Emergency submitted',
                'occurred_at' => now(),
            ]);

            return $case;
        });

        // Call Pulse engine
        $startedAt = microtime(true);
        $payload = [
            'patient_id' => $case->phone ?: ($case->patient?->phone ?: $case->code),
            'symptoms' => array_values(array_filter(array_map('trim', explode(',', (string) $case->symptoms)))),
            'urgency' => 'EMERGENCY',
            'network_quality' => $case->network_quality ?: 'GOOD',
            'device_reachable' => (bool) $case->device_reachable,
            'location' => $case->location_hint ?: 'unknown',
        ];

        $result = $this->pulse->decide($payload);
        $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);
        $response = $result['ok'] ? ($result['data'] ?? []) : [];

        PulseLog::create([
            'emergency_case_id' => $case->id,
            'endpoint' => '/decide',
            'request_payload' => $payload,
            'response_payload' => $result,
            'latency_ms' => $latencyMs,
            'success' => (bool) ($result['ok'] ?? false),
        ]);

        if ($result['ok']) {
            $this->applyPulseDecision($case, $response);
        } else {
            $case->update([
                'status' => 'submitted',
                'pulse_response_json' => $result,
            ]);
            EmergencyCaseEvent::create([
                'emergency_case_id' => $case->id,
                'event' => 'PULSE_UNREACHABLE',
                'detail' => $result['error'] ?? 'Pulse engine unreachable',
                'occurred_at' => now(),
            ]);
        }

        $case->load(['patient', 'assignedHospital', 'events', 'networkContext']);
        return response()->json(['data' => $case], 201);
    }

    public function accept(Request $request, EmergencyCase $emergency)
    {
        $this->authorizeStaff($request);
        $emergency->update([
            'status' => 'accepted',
            'accepted_by_user_id' => $request->user()->id,
            'accepted_at' => now(),
        ]);
        EmergencyCaseEvent::create([
            'emergency_case_id' => $emergency->id,
            'actor_user_id' => $request->user()->id,
            'event' => 'ACCEPTED',
            'detail' => 'Case accepted by ' . $request->user()->name,
            'occurred_at' => now(),
        ]);
        return response()->json(['data' => $emergency->fresh(['patient', 'assignedHospital', 'events'])]);
    }

    public function resolve(Request $request, EmergencyCase $emergency)
    {
        $this->authorizeStaff($request);
        $note = $request->input('note');
        $emergency->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);
        EmergencyCaseEvent::create([
            'emergency_case_id' => $emergency->id,
            'actor_user_id' => $request->user()->id,
            'event' => 'RESOLVED',
            'detail' => $note ?: 'Resolved',
            'occurred_at' => now(),
        ]);
        return response()->json(['data' => $emergency->fresh(['events'])]);
    }

    public function escalate(Request $request, EmergencyCase $emergency)
    {
        $this->authorizeStaff($request);
        $emergency->update(['priority' => 'EMERGENCY']);
        EmergencyCaseEvent::create([
            'emergency_case_id' => $emergency->id,
            'actor_user_id' => $request->user()->id,
            'event' => 'ESCALATED',
            'detail' => $request->input('reason', 'Escalated'),
            'occurred_at' => now(),
        ]);
        return response()->json(['data' => $emergency->fresh(['events'])]);
    }

    protected function applyPulseDecision(EmergencyCase $case, array $response): void
    {
        $decision = $response['decision'] ?? [];
        $assigned = $response['assigned_hospital'] ?? null;
        $network = $response['network_context'] ?? [];
        $identity = $response['identity_context'] ?? [];
        $qod = $response['qod_session'] ?? [];
        $timeline = $response['timeline'] ?? [];
        $explanation = $response['explanation'] ?? [];

        $hospitalId = null;
        if (is_array($assigned)) {
            if (isset($assigned['id'])) {
                $hospitalId = (int) $assigned['id'];
            } elseif (! empty($assigned['name'])) {
                $hospital = Hospital::firstWhere('name', $assigned['name']);
                $hospitalId = $hospital?->id;
            }
        }

        $case->update([
            'status' => $hospitalId ? 'assigned' : 'submitted',
            'priority' => $decision['priority'] ?? $case->priority,
            'assigned_hospital_id' => $hospitalId,
            'pulse_response_json' => $response,
            'decision_json' => $decision,
            'timeline_json' => $timeline,
            'explanation_json' => $explanation,
        ]);

        PulseNetworkContext::updateOrCreate(
            ['emergency_case_id' => $case->id],
            [
                'reachable' => $network['device_reachable'] ?? $network['reachable'] ?? null,
                'network_quality' => $network['quality'] ?? $network['network_quality'] ?? null,
                'roaming' => $network['roaming']['roaming'] ?? $network['roaming'] ?? null,
                'identity_verified' => $identity['number_verification']['verified'] ?? $identity['verified'] ?? null,
                'sim_swap_detected' => $identity['sim_swap']['swapped'] ?? $identity['sim_swap'] ?? null,
                'qod_requested' => isset($qod['sessionId']) || isset($qod['session_id']) || ! empty($qod),
                'qod_status' => $qod['status'] ?? null,
            ]
        );

        foreach (($timeline ?: []) as $entry) {
            EmergencyCaseEvent::create([
                'emergency_case_id' => $case->id,
                'event' => strtoupper($entry['event'] ?? 'PULSE_STEP'),
                'detail' => is_string($entry['detail'] ?? null) ? $entry['detail'] : null,
                'payload' => $entry,
                'occurred_at' => $entry['timestamp'] ?? $entry['at'] ?? now(),
            ]);
        }
    }

    protected function authorizeStaff(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! in_array($user->role, ['doctor', 'nurse', 'hospital_admin', 'emergency_coordinator', 'super_admin'], true)) {
            abort(403, 'Only staff may modify emergency cases.');
        }
    }
}
