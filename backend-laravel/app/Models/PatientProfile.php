<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PatientProfile extends Model
{
    protected $fillable = [
        'code', 'user_id', 'registered_by_user_id',
        'first_name', 'last_name', 'date_of_birth', 'age', 'gender',
        'phone', 'blood_group', 'address',
        'emergency_contact_name', 'emergency_contact_phone',
        'allergies', 'conditions', 'medications', 'notes',
    ];

    protected $casts = [
        'allergies' => 'array',
        'conditions' => 'array',
        'medications' => 'array',
        'date_of_birth' => 'date',
    ];

    protected $appends = ['full_name'];

    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function vitals()
    {
        return $this->hasMany(Vitals::class)->latest('recorded_at');
    }

    public function emergencyCases()
    {
        return $this->hasMany(EmergencyCase::class, 'patient_id');
    }

    public function encounters()
    {
        return $this->hasMany(Encounter::class, 'patient_id');
    }
}
