<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PulseLog extends Model
{
    protected $fillable = [
        'emergency_case_id', 'endpoint', 'request_payload', 'response_payload', 'latency_ms', 'success',
    ];

    protected $casts = [
        'request_payload' => 'array',
        'response_payload' => 'array',
        'success' => 'boolean',
    ];
}
