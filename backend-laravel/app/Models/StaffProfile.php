<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaffProfile extends Model
{
    protected $fillable = [
        'user_id', 'hospital_id', 'staff_code', 'specialty', 'department', 'license_number',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function hospital()
    {
        return $this->belongsTo(Hospital::class);
    }
}
