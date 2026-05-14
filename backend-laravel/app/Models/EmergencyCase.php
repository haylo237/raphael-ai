<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmergencyCase extends Model
{
    protected $fillable = [
        'code', 'patient_id', 'created_by_user_id', 'assigned_hospital_id', 'accepted_by_user_id',
        'patient_name', 'phone', 'emergency_type', 'priority', 'status',
        'symptoms', 'location_hint', 'latitude', 'longitude',
        'network_quality', 'device_reachable',
        'pulse_response_json', 'decision_json', 'timeline_json', 'explanation_json',
        'accepted_at', 'resolved_at',
    ];

    protected $casts = [
        'pulse_response_json' => 'array',
        'decision_json' => 'array',
        'timeline_json' => 'array',
        'explanation_json' => 'array',
        'device_reachable' => 'boolean',
        'accepted_at' => 'datetime',
        'resolved_at' => 'datetime',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function patient()
    {
        return $this->belongsTo(PatientProfile::class, 'patient_id');
    }

    public function assignedHospital()
    {
        return $this->belongsTo(Hospital::class, 'assigned_hospital_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function acceptedBy()
    {
        return $this->belongsTo(User::class, 'accepted_by_user_id');
    }

    public function events()
    {
        return $this->hasMany(EmergencyCaseEvent::class)->orderBy('occurred_at');
    }

    public function pulseLogs()
    {
        return $this->hasMany(PulseLog::class);
    }

    public function networkContext()
    {
        return $this->hasOne(PulseNetworkContext::class);
    }
}
