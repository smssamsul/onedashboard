<?php

namespace App\Providers;

use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

use App\Models\Log;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],
    ];

    /**
     * Register any events for your application.
     *
     * @return void
     */
    public function boot()
    {
         // Event Login
    Event::listen(Login::class, function ($event) {
        Log::create([
            'user' => $event->user->id,
            'customer' => null,
            'keterangan' => '🔹 LOGIN ke sistem',
            'create_at' => now(),
            'update_at' => now(),
            'status' => 'L',
        ]);
    });

    // Event Logout
    Event::listen(Logout::class, function ($event) {
        Log::create([
            'user' => $event->user->id,
            'customer' => null,
            'keterangan' => '🔹 LOGOUT dari sistem',
            'create_at' => now(),
            'update_at' => now(),
            'status' => 'O',
        ]);
    });
    }
}
