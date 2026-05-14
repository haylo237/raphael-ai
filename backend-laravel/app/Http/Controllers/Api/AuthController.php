<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:120',
            'phone' => 'required|string|max:32|unique:users,phone',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => ['nullable', Rule::in(['patient', 'health_worker'])],
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'password' => $data['password'],
                'role' => $data['role'] ?? 'patient',
            ]);

            if ($user->role === 'patient') {
                [$first, $last] = $this->splitName($user->name);
                PatientProfile::create([
                    'code' => $this->nextPatientCode(),
                    'user_id' => $user->id,
                    'first_name' => $first,
                    'last_name' => $last,
                    'phone' => $user->phone,
                ]);
            }

            return $user;
        });

        return $this->tokenResponse($user, 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'phone' => 'required_without:email|string',
            'email' => 'required_without:phone|email',
            'password' => 'required|string',
        ]);

        $user = User::query()
            ->when($data['phone'] ?? null, fn ($q, $p) => $q->where('phone', $p))
            ->when($data['email'] ?? null, fn ($q, $e) => $q->where('email', $e))
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        return $this->tokenResponse($user);
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();
        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['hospital', 'patientProfile', 'staffProfile.hospital']);
        return response()->json(['user' => $user]);
    }

    protected function tokenResponse(User $user, int $status = 200)
    {
        $token = $user->createToken('raphael')->plainTextToken;
        $user->load(['hospital', 'patientProfile', 'staffProfile.hospital']);

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $user,
        ], $status);
    }

    protected function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name));
        $first = array_shift($parts) ?? $name;
        $last = trim(implode(' ', $parts));
        return [$first, $last ?: '—'];
    }

    protected function nextPatientCode(): string
    {
        $n = (PatientProfile::max('id') ?? 0) + 1;
        return 'RAP-' . str_pad((string) $n, 6, '0', STR_PAD_LEFT);
    }
}
