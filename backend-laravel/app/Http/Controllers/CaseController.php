<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\StoreCaseRequest;
use App\Services\PulseClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;

final class CaseController extends Controller
{
    public function __construct(private readonly PulseClient $pulse) {}

    public function store(StoreCaseRequest $request): JsonResponse
    {
        $payload = $request->validated();

        $phoneRef = (string) $payload['patient_id'];
        $isEmergency = (($payload['urgency'] ?? 'normal') === 'emergency');

        $preflight = [];

        $numberVerification = $this->pulse->verifyNumber($phoneRef);
        if (! ($numberVerification['ok'] ?? false)) {
            return response()->json(
                ['error' => $numberVerification['error'] ?? 'Number verification unavailable'],
                502,
            );
        }

        $preflight['number_verification'] = $numberVerification['data'];

        if ($isEmergency) {
            $otpSend = $this->pulse->sendOtp($phoneRef, 300);
            if (! ($otpSend['ok'] ?? false)) {
                return response()->json(
                    ['error' => $otpSend['error'] ?? 'OTP service unavailable'],
                    502,
                );
            }

            $preflight['otp_challenge'] = $otpSend['data'];

            $otpCode = (string) ($payload['otp_code'] ?? '');
            if ($otpCode === '') {
                return response()->json([
                    'error' => 'otp_code is required for emergency dispatch verification',
                    'preflight' => $preflight,
                ], 422);
            }

            $challengeId = (string) (($otpSend['data']['challenge_id'] ?? ''));
            $otpValidation = $this->pulse->validateOtp($challengeId, $otpCode);
            if (! ($otpValidation['ok'] ?? false)) {
                return response()->json(
                    ['error' => $otpValidation['error'] ?? 'OTP validation unavailable'],
                    502,
                );
            }

            if (! (($otpValidation['data']['validated'] ?? false) === true)) {
                return response()->json([
                    'error' => 'OTP validation failed',
                    'preflight' => [
                        ...$preflight,
                        'otp_validation' => $otpValidation['data'],
                    ],
                ], 422);
            }

            $preflight['otp_validation'] = $otpValidation['data'];

            $radius = (float) ($payload['verification_radius_meters'] ?? 120.0);
            $locationHint = (string) ($payload['location'] ?? 'unknown');
            $locationVerification = $this->pulse->verifyLocation($phoneRef, $locationHint, $radius);
            if (! ($locationVerification['ok'] ?? false)) {
                return response()->json(
                    ['error' => $locationVerification['error'] ?? 'Location verification unavailable'],
                    502,
                );
            }

            if (! (($locationVerification['data']['inside_area'] ?? false) === true)) {
                return response()->json([
                    'error' => 'Location verification failed for emergency dispatch',
                    'preflight' => [
                        ...$preflight,
                        'location_verification' => $locationVerification['data'],
                    ],
                ], 422);
            }

            $preflight['location_verification'] = $locationVerification['data'];
        }

        unset($payload['otp_code'], $payload['verification_radius_meters']);

        $result = $this->pulse->decide($payload);

        if (! ($result['ok'] ?? false)) {
            return response()->json(
                ['error' => $result['error'] ?? 'Decision service unavailable'],
                502,
            );
        }

        return response()->json([
            'gateway' => 'backend-laravel',
            'case' => ['received' => $payload],
            'preflight_checks' => $preflight,
            'decision' => $result['data'],
        ]);
    }
}
