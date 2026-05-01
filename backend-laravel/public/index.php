<?php

declare(strict_types=1);

define('LARAVEL_START', microtime(true));

/*
 * If the Laravel vendor directory is not present, fail gracefully with an
 * actionable error instead of a PHP fatal error.
 */
if (! file_exists(__DIR__.'/../vendor/autoload.php')) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Gateway not initialized. Run: composer install inside backend-laravel/.',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Illuminate\Http\Request::capture());
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function json_response(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

if ($path === '/health' && $method === 'GET') {
    json_response(200, [
        'status' => 'ok',
        'service' => 'backend-gateway',
    ]);
}

if ($path === '/cases' && $method === 'POST') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw ?: '{}', true);

    if (!is_array($input)) {
        json_response(400, ['error' => 'Invalid JSON payload']);
    }

    if (empty($input['symptoms']) || !is_array($input['symptoms'])) {
        json_response(422, ['error' => 'Field `symptoms` is required and must be an array']);
    }

    $pulseClient = new PulseClient(getenv('PULSE_ENGINE_URL') ?: 'http://localhost:8001');

    $payload = [
        'patient_id' => $input['patient_id'] ?? 'demo-patient',
        'symptoms' => $input['symptoms'],
        'urgency' => $input['urgency'] ?? 'normal',
        'network_quality' => $input['network_quality'] ?? 'fair',
        'device_reachable' => $input['device_reachable'] ?? true,
        'location' => $input['location'] ?? 'unknown',
    ];

    $result = $pulseClient->decide($payload);
    if (($result['ok'] ?? false) !== true) {
        json_response(502, [
            'error' => $result['error'] ?? 'Decision service unavailable',
        ]);
    }

    json_response(200, [
        'gateway' => 'backend-laravel',
        'case' => [
            'received' => $payload,
        ],
        'decision' => $result['data'],
    ]);
}

json_response(404, ['error' => 'Route not found']);
