<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PatientProfile;
use App\Models\Vitals;
use Illuminate\Http\Request;

class VitalsController extends Controller
{
    public function index(PatientProfile $patient)
    {
        return response()->json(['data' => $patient->vitals]);
    }

    public function store(Request $request, PatientProfile $patient)
    {
        $data = $request->validate([
            'temperature_c' => 'nullable|numeric',
            'heart_rate' => 'nullable|integer',
            'systolic_bp' => 'nullable|integer',
            'diastolic_bp' => 'nullable|integer',
            'respiratory_rate' => 'nullable|integer',
            'oxygen_saturation' => 'nullable|integer',
            'weight_kg' => 'nullable|numeric',
            'height_cm' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        $data['patient_profile_id'] = $patient->id;
        $data['recorded_by_user_id'] = $request->user()?->id;
        $data['recorded_at'] = now();

        $vitals = Vitals::create($data);

        return response()->json(['data' => $vitals], 201);
    }
}
