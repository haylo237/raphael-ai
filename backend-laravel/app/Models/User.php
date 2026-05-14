<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name', 'phone', 'email', 'password', 'role', 'hospital_id', 'phone_verified_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'phone_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }

    public function patientProfile()
    {
        return $this->hasOne(PatientProfile::class, 'user_id');
    }

    public function staffProfile()
    {
        return $this->hasOne(StaffProfile::class, 'user_id');
    }

    public function hasRole(string|array $roles): bool
    {
        return in_array($this->role, (array) $roles, true);
    }
}
