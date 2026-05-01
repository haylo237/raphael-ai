<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

final class PulseClient
{
    public function __construct(private readonly string $baseUrl) {}

    public function decide(array $payload): array
    {
        return $this->post('/decide', $payload);
    }

    public function verifyNumber(string $phoneNumber): array
    {
        return $this->post('/identity/verify-number', [
            'phone_number' => $phoneNumber,
        ]);
    }

    public function sendOtp(string $phoneNumber, int $ttlSeconds = 300): array
    {
        return $this->post('/identity/otp/send', [
            'phone_number' => $phoneNumber,
            'ttl_seconds' => $ttlSeconds,
        ]);
    }

    public function validateOtp(string $challengeId, string $otpCode): array
    {
        return $this->post('/identity/otp/validate', [
            'challenge_id' => $challengeId,
            'otp_code' => $otpCode,
        ]);
    }

    public function verifyLocation(string $phoneNumber, string $locationHint, float $radiusMeters = 120.0): array
    {
        return $this->post('/location/verify', [
            'phone_number' => $phoneNumber,
            'location_hint' => $locationHint,
            'radius_meters' => $radiusMeters,
        ]);
    }

    private function post(string $path, array $payload): array
    {
        try {
            $response = Http::timeout(8)->post("{$this->baseUrl}{$path}", $payload);

            if ($response->failed()) {
                return [
                    'ok' => false,
                    'error' => "Pulse service error ({$response->status()})",
                ];
            }

            return ['ok' => true, 'data' => $response->json()];
        } catch (ConnectionException) {
            return ['ok' => false, 'error' => 'Unable to reach Raphael Pulse service'];
        }
    }
}
