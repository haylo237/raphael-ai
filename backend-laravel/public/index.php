<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (! file_exists(__DIR__.'/../vendor/autoload.php')) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Gateway not initialized. Run: composer install inside backend-laravel/.',
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

require __DIR__.'/../vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
