<?php

use App\Http\Controllers\CaseController;
use Illuminate\Support\Facades\Route;

Route::get('/health', static function () {
    return response()->json(['status' => 'ok', 'service' => 'backend-gateway']);
});

Route::post('/cases', [CaseController::class, 'store']);
