<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Hospital;

class HospitalController extends Controller
{
    public function index()
    {
        return response()->json(['data' => Hospital::orderBy('name')->get()]);
    }

    public function show(Hospital $hospital)
    {
        $hospital->load(['staff.user']);
        return response()->json(['data' => $hospital]);
    }
}
