<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmergencyCaseEvent extends Model
{
    protected $fillable = [
        'emergency_case_id', 'actor_user_id', 'event', 'detail', 'payload', 'occurred_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function case()
    {
        return $this->belongsTo(EmergencyCase::class, 'emergency_case_id');
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
