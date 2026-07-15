<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     *
     * @param  \Illuminate\Console\Scheduling\Schedule  $schedule
     * @return void
     */

    protected $commands = [
        \App\Console\Commands\SendFollowupCron::class,
        \App\Console\Commands\RabbitMQStatus::class,
        \App\Console\Commands\SendTrainerReminderCron::class,
        \App\Console\Commands\BackfillKodeOrder::class,
        \App\Console\Commands\CancelUnpaidOrdersCron::class,
        \App\Console\Commands\SendScheduledBroadcastCron::class,
    ];
    
    protected function schedule(Schedule $schedule)
    {
        $schedule->command('followup:send')->hourly()->withoutOverlapping();
        $schedule->command('trainer:reminder')->hourly()->withoutOverlapping();
        $schedule->command('orders:cancel-unpaid')->daily()->withoutOverlapping();
        $schedule->command('broadcast:send-scheduled')->everyMinute()->withoutOverlapping();
        // $schedule->command('inspire')->hourly();
    }

    /**
     * Register the commands for the application.
     *
     * @return void
     */
    protected function commands()
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
