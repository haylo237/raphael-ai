<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PulseNetworkContext extends Model
{
    protected $fillable = [
        'emergency_case_id', 'reachable', 'network_quality', 'roaming',
        'identity_verified', 'sim_swap_detected', 'qod_requested', 'qod_status',
    ];

    protected $casts = [
        'reachable' => 'boolean',
        'roaming' => 'boolean',
        'identity_verified' => 'boolean',
        'sim_swap_detected' => 'boolean',
        'qod_requested' => 'boolean',
    ];
}
