<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Encounter extends Model
{
    protected $fillable = [
        'code', 'patient_id', 'hospital_id', 'doctor_user_id', 'emergency_case_id',
        'status', 'chief_complaint', 'notes', 'started_at', 'resolved_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientProfile::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'doctor_user_id');
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    public function prescriptions()
    {
        return $this->hasMany(Prescription::class);
    }
}
