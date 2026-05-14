<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Hospital extends Model
{
    protected $fillable = [
        'name', 'city', 'region', 'country', 'phone', 'latitude', 'longitude', 'capabilities',
    ];

    protected $casts = [
        'capabilities' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    public function staff()
    {
        return $this->hasMany(StaffProfile::class);
    }

    public function emergencyCases()
    {
        return $this->hasMany(EmergencyCase::class, 'assigned_hospital_id');
    }
}
