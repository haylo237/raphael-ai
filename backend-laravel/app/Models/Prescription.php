<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prescription extends Model
{
    protected $fillable = [
        'encounter_id', 'prescribed_by_user_id',
        'medication', 'dosage', 'frequency', 'duration', 'instructions',
    ];

    public function encounter()
    {
        return $this->belongsTo(Encounter::class);
    }

    public function prescribedBy()
    {
        return $this->belongsTo(User::class, 'prescribed_by_user_id');
    }
}
