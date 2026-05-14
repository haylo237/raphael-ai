<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class QueueEntry extends Model
{
    protected $fillable = [
        'uuid', 'patient_id', 'hospital_id', 'assigned_doctor_user_id',
        'reason', 'priority', 'status',
    ];

    protected static function booted(): void
    {
        static::creating(function (QueueEntry $entry) {
            $entry->uuid ??= (string) Str::uuid();
        });
    }

    public function patient()
    {
        return $this->belongsTo(PatientProfile::class, 'patient_id');
    }

    public function doctor()
    {
        return $this->belongsTo(User::class, 'assigned_doctor_user_id');
    }
}
