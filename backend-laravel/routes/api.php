<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmergencyController;
use App\Http\Controllers\Api\HospitalController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\VitalsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true, 'service' => 'raphael-backend']);

Route::prefix('api')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::get('/patients', [PatientController::class, 'index']);
        Route::get('/patients/search', [PatientController::class, 'search']);
        Route::post('/patients', [PatientController::class, 'store'])
            ->middleware('role:health_worker,nurse,doctor,receptionist,hospital_admin');
        Route::get('/patients/{patient}', [PatientController::class, 'show']);
        Route::patch('/patients/{patient}', [PatientController::class, 'update'])
            ->middleware('role:health_worker,nurse,doctor,receptionist,hospital_admin');

        Route::get('/patients/{patient}/vitals', [VitalsController::class, 'index']);
        Route::post('/patients/{patient}/vitals', [VitalsController::class, 'store'])
            ->middleware('role:health_worker,nurse,doctor');

        Route::get('/emergencies', [EmergencyController::class, 'index']);
        Route::post('/emergencies', [EmergencyController::class, 'store']);
        Route::get('/emergencies/{emergency}', [EmergencyController::class, 'show']);
        Route::post('/emergencies/{emergency}/accept', [EmergencyController::class, 'accept']);
        Route::post('/emergencies/{emergency}/resolve', [EmergencyController::class, 'resolve']);
        Route::post('/emergencies/{emergency}/escalate', [EmergencyController::class, 'escalate']);

        Route::get('/hospitals', [HospitalController::class, 'index']);
        Route::get('/hospitals/{hospital}', [HospitalController::class, 'show']);
    });
});
