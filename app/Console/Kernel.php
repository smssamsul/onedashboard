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
    ];
    
    protected function schedule(Schedule $schedule)
    {
        $schedule->command('followup:send')->hourly();
        $schedule->command('trainer:reminder')->hourly();
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
