<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vitals extends Model
{
    protected $table = 'vitals';

    protected $fillable = [
        'patient_profile_id', 'recorded_by_user_id', 'encounter_id',
        'temperature_c', 'heart_rate', 'systolic_bp', 'diastolic_bp',
        'respiratory_rate', 'oxygen_saturation', 'weight_kg', 'height_cm',
        'notes', 'recorded_at',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientProfile::class, 'patient_profile_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }
}
