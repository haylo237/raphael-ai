<?php

declare(strict_types=1);

namespace App\Providers;

use App\Services\PulseClient;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(PulseClient::class, static fn () => new PulseClient(
            config('services.pulse.url', 'http://localhost:8001'),
        ));
    }

    public function boot(): void {}
}
