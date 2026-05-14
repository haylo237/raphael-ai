<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientProfile;
use Illuminate\Http\Request;

class PatientController extends Controller
{
    public function index(Request $request)
    {
        $patients = PatientProfile::query()
            ->with(['vitals' => fn ($q) => $q->limit(1)])
            ->latest()
            ->limit(200)
            ->get();

        return response()->json(['data' => $patients]);
    }

    public function search(Request $request)
    {
        $q = trim((string) $request->query('query', ''));
        $patients = PatientProfile::query()
            ->when($q !== '', function ($builder) use ($q) {
                $builder->where(function ($w) use ($q) {
                    $w->where('first_name', 'ilike', "%{$q}%")
                      ->orWhere('last_name', 'ilike', "%{$q}%")
                      ->orWhere('code', 'ilike', "%{$q}%")
                      ->orWhere('phone', 'ilike', "%{$q}%");
                });
            })
            ->limit(50)
            ->get();

        return response()->json(['data' => $patients]);
    }

    public function show(PatientProfile $patient)
    {
        $patient->load(['vitals', 'encounters.prescriptions', 'emergencyCases']);
        return response()->json(['data' => $patient]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'first_name' => 'required|string|max:80',
            'last_name' => 'required|string|max:80',
            'phone' => 'nullable|string|max:32',
            'date_of_birth' => 'nullable|date',
            'age' => 'nullable|integer|min:0|max:130',
            'gender' => 'nullable|in:male,female,other',
            'blood_group' => 'nullable|string|max:8',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'allergies' => 'nullable|array',
            'conditions' => 'nullable|array',
            'medications' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $data['code'] = 'RAP-' . str_pad((string) ((PatientProfile::max('id') ?? 0) + 1), 6, '0', STR_PAD_LEFT);
        $data['registered_by_user_id'] = $request->user()?->id;

        $patient = PatientProfile::create($data);

        return response()->json(['data' => $patient], 201);
    }

    public function update(Request $request, PatientProfile $patient)
    {
        $data = $request->validate([
            'first_name' => 'sometimes|string|max:80',
            'last_name' => 'sometimes|string|max:80',
            'phone' => 'nullable|string|max:32',
            'date_of_birth' => 'nullable|date',
            'age' => 'nullable|integer|min:0|max:130',
            'gender' => 'nullable|in:male,female,other',
            'blood_group' => 'nullable|string|max:8',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_phone' => 'nullable|string',
            'allergies' => 'nullable|array',
            'conditions' => 'nullable|array',
            'medications' => 'nullable|array',
            'notes' => 'nullable|string',
        ]);

        $patient->update($data);
        return response()->json(['data' => $patient]);
    }
}
