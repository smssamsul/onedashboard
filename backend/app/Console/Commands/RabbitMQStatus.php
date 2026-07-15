<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RabbitMQService;

class RabbitMQStatus extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'rabbitmq:status';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Cek status koneksi RabbitMQ';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('🔍 Mengecek status RabbitMQ...');
        $this->newLine();

        $rabbitmqService = new RabbitMQService();

        // Ambil konfigurasi dari .env
        $host = env('RABBITMQ_HOST', 'localhost');
        $port = env('RABBITMQ_PORT', 5672);
        $managementPort = env('RABBITMQ_MANAGEMENT_PORT', 15672);
        $user = env('RABBITMQ_USER', 'admin');
        $password = env('RABBITMQ_PASSWORD', 'admin123');
        $vhost = env('RABBITMQ_VHOST', '/');
        $queueConnection = config('queue.default');

        // Tampilkan konfigurasi
        $this->line('📋 Konfigurasi:');
        $this->table(
            ['Setting', 'Value'],
            [
                ['Queue Connection', $queueConnection],
                ['Host', $host],
                ['Port (AMQP)', $port],
                ['Port (Management)', $managementPort],
                ['User', $user],
                ['VHost', $vhost],
            ]
        );
        $this->newLine();

        // Cek koneksi
        $this->info('🔌 Mencoba koneksi ke RabbitMQ Management API...');
        
        $connection = $rabbitmqService->checkConnection();

        if ($connection['connected']) {
            $this->info('✅ RabbitMQ is RUNNING dan TERHUBUNG!');
            $this->newLine();

            // Tampilkan overview
            $overview = $rabbitmqService->getOverview();
            if (!empty($overview)) {
                $this->line('📊 Overview:');
                $this->line('   RabbitMQ Version: ' . ($overview['rabbitmq_version'] ?? 'Unknown'));
                $this->line('   Erlang Version: ' . ($overview['erlang_version'] ?? 'Unknown'));
                $this->newLine();
            }

            // Cek queue connection di Laravel
            if ($queueConnection === 'rabbitmq') {
                $this->info("✅ Queue connection di Laravel: {$queueConnection}");
            } else {
                $this->warn("⚠️  Queue connection di Laravel: {$queueConnection} (bukan rabbitmq)");
                $this->line('   Update QUEUE_CONNECTION di .env menjadi "rabbitmq"');
            }

            // Tampilkan stats
            $stats = $rabbitmqService->getDashboardStats();
            if (!empty($stats) && isset($stats['stats'])) {
                $this->newLine();
                $this->line('📈 Statistics:');
                $this->table(
                    ['Metric', 'Value'],
                    [
                        ['Total Queues', $stats['stats']['total_queues'] ?? 0],
                        ['Total Messages', $stats['stats']['total_messages'] ?? 0],
                        ['Messages Ready', $stats['stats']['total_messages_ready'] ?? 0],
                        ['Messages Unacked', $stats['stats']['total_messages_unacked'] ?? 0],
                        ['Total Consumers', $stats['stats']['total_consumers'] ?? 0],
                        ['Total Connections', $stats['stats']['total_connections'] ?? 0],
                        ['Total Channels', $stats['stats']['total_channels'] ?? 0],
                    ]
                );
            }

            // Tampilkan queues
            $queues = $rabbitmqService->getQueues();
            if (!empty($queues)) {
                $this->newLine();
                $this->line('📦 Queues:');
                $queueData = [];
                foreach ($queues as $queue) {
                    $queueData[] = [
                        $queue['name'] ?? 'unknown',
                        $queue['messages'] ?? 0,
                        $queue['messages_ready'] ?? 0,
                        $queue['messages_unacknowledged'] ?? 0,
                        $queue['consumers'] ?? 0,
                    ];
                }
                $this->table(
                    ['Queue Name', 'Messages', 'Ready', 'Unacked', 'Consumers'],
                    $queueData
                );
            }

            $this->newLine();
            $this->info('📊 Management UI: http://localhost:' . $managementPort);
            $this->info('   Username: ' . $user);
            $this->info('   Password: ' . str_repeat('*', strlen($password)));
            
            return Command::SUCCESS;
        } else {
            $this->error('❌ RabbitMQ is NOT running atau tidak bisa diakses!');
            $this->newLine();
            $this->error('Error: ' . ($connection['error'] ?? 'Unknown error'));
            $this->newLine();
            $this->warn('💡 Solusi:');
            $this->line('   1. Pastikan RabbitMQ sudah running');
            $this->line('   2. Jika pakai Docker: docker-compose up -d rabbitmq');
            $this->line('   3. Cek host/port di .env sesuai dengan setup Anda');
            $this->line('   4. Pastikan Management Plugin sudah diaktifkan');
            $this->line('   5. Cek firewall tidak block port ' . $managementPort);
            
            return Command::FAILURE;
        }
    }
}

