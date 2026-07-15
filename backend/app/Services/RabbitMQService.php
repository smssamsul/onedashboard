<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class RabbitMQService
{
    protected $host;
    protected $port;
    protected $user;
    protected $password;
    protected $baseUrl;

    public function __construct()
    {
        $this->host = env('RABBITMQ_HOST', 'localhost');
        $this->port = env('RABBITMQ_MANAGEMENT_PORT', 15672);
        $this->user = env('RABBITMQ_USER', 'admin');
        $this->password = env('RABBITMQ_PASSWORD', 'admin123');
        $this->baseUrl = "http://{$this->host}:{$this->port}/api";
    }

    /**
     * Cek koneksi ke RabbitMQ Management API
     */
    public function checkConnection(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/overview");

            if ($response->successful()) {
                return [
                    'connected' => true,
                    'status' => 'running',
                    'data' => $response->json()
                ];
            }

            return [
                'connected' => false,
                'status' => 'unreachable',
                'error' => 'Management API tidak dapat diakses'
            ];

        } catch (Exception $e) {
            return [
                'connected' => false,
                'status' => 'error',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get overview dari RabbitMQ
     */
    public function getOverview(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/overview");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error('RabbitMQ getOverview error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get semua queues
     */
    public function getQueues(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/queues");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error('RabbitMQ getQueues error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get detail queue
     */
    public function getQueueDetail(string $vhost, string $queueName): array
    {
        try {
            $vhostEncoded = urlencode($vhost);
            $queueEncoded = urlencode($queueName);
            
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/queues/{$vhostEncoded}/{$queueEncoded}");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error("RabbitMQ getQueueDetail error ({$queueName}): " . $e->getMessage());
            return [];
        }
    }

    /**
     * Get connections
     */
    public function getConnections(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/connections");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error('RabbitMQ getConnections error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get channels
     */
    public function getChannels(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/channels");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error('RabbitMQ getChannels error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get consumers
     */
    public function getConsumers(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/consumers");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error('RabbitMQ getConsumers error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Get node statistics
     */
    public function getNodes(): array
    {
        try {
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->get("{$this->baseUrl}/nodes");

            if ($response->successful()) {
                return $response->json();
            }

            return [];
        } catch (Exception $e) {
            Log::error('RabbitMQ getNodes error: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Purge queue (hapus semua pesan di queue)
     */
    public function purgeQueue(string $vhost, string $queueName): bool
    {
        try {
            $vhostEncoded = urlencode($vhost);
            $queueEncoded = urlencode($queueName);
            
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->delete("{$this->baseUrl}/queues/{$vhostEncoded}/{$queueEncoded}/contents");

            return $response->successful();
        } catch (Exception $e) {
            Log::error("RabbitMQ purgeQueue error ({$queueName}): " . $e->getMessage());
            return false;
        }
    }

    /**
     * Get messages from queue (tanpa consume - peek only)
     */
    public function getMessages(string $vhost, string $queueName, int $count = 1, bool $requeue = true): array
    {
        try {
            $vhostEncoded = urlencode($vhost);
            $queueEncoded = urlencode($queueName);
            
            // RabbitMQ API untuk get messages (peek, tidak menghapus dari queue)
            $response = Http::withBasicAuth($this->user, $this->password)
                ->timeout(5)
                ->post("{$this->baseUrl}/queues/{$vhostEncoded}/{$queueEncoded}/get", [
                    'count' => $count,
                    'ackmode' => $requeue ? 'nack_requeue_true' : 'ack_requeue_false',
                    'encoding' => 'auto'
                ]);

            if ($response->successful()) {
                $messages = $response->json();
                
                if (!is_array($messages)) {
                    return [];
                }
                
                // Decode Laravel job jika ada
                $decodedMessages = [];
                foreach ($messages as $msg) {
                    $decoded = $this->decodeLaravelJob($msg);
                    $decodedMessages[] = $decoded;
                }
                
                return $decodedMessages;
            }

            return [];
        } catch (Exception $e) {
            Log::error("RabbitMQ getMessages error ({$queueName}): " . $e->getMessage());
            return [];
        }
    }

    /**
     * Decode Laravel job message
     */
    private function decodeLaravelJob(array $message): array
    {
        try {
            $payloadStr = $message['payload'] ?? null;
            
            if (!$payloadStr) {
                return [
                    'error' => 'No payload found',
                    'raw' => $message
                ];
            }
            
            $payload = json_decode($payloadStr, true);
            
            if (!$payload) {
                return [
                    'error' => 'Invalid JSON payload',
                    'raw_payload' => $payloadStr,
                    'raw' => $message
                ];
            }
            
            $decoded = [
                'message_id' => $message['message_count'] ?? null,
                'routing_key' => $message['routing_key'] ?? null,
                'exchange' => $message['exchange'] ?? null,
                'redelivered' => $message['redelivered'] ?? false,
                'properties' => $message['properties'] ?? [],
                'payload' => $payload,
                'job_class' => $payload['displayName'] ?? 'Unknown',
                'decoded_properties' => []
            ];
            
            // Decode serialized Laravel job
            if (isset($payload['data']['command'])) {
                try {
                    $job = unserialize($payload['data']['command']);
                    
                    if ($job) {
                        // Extract job properties berdasarkan class
                        if ($job instanceof \App\Jobs\SendWhatsAppJob) {
                            $decoded['decoded_properties'] = [
                                'job_type' => 'SendWhatsAppJob',
                                'phone_no' => $job->phoneNo ?? null,
                                'message' => $job->message ?? null,
                                'woowa_key' => isset($job->woowaKey) ? substr($job->woowaKey, 0, 20) . '...' : null,
                                'max_tries' => $job->tries ?? null,
                                'timeout' => $job->timeout ?? null,
                            ];
                        } else {
                            // Generic job - extract semua public properties
                            $decoded['decoded_properties'] = [
                                'job_type' => get_class($job),
                                'properties' => get_object_vars($job)
                            ];
                        }
                    }
                } catch (\Exception $e) {
                    $decoded['decode_error'] = $e->getMessage();
                }
            }
            
            return $decoded;
            
        } catch (\Exception $e) {
            Log::error('Error decoding Laravel job: ' . $e->getMessage());
            return [
                'error' => 'Failed to decode: ' . $e->getMessage(),
                'raw' => $message
            ];
        }
    }

    /**
     * Get dashboard stats lengkap
     */
    public function getDashboardStats(): array
    {
        $connection = $this->checkConnection();
        
        if (!$connection['connected']) {
            return [
                'connected' => false,
                'error' => $connection['error'] ?? 'Tidak dapat terhubung ke RabbitMQ'
            ];
        }

        $overview = $this->getOverview();
        $queues = $this->getQueues();
        $connections = $this->getConnections();
        $channels = $this->getChannels();
        $consumers = $this->getConsumers();
        $nodes = $this->getNodes();

        // Calculate totals
        $totalMessages = 0;
        $totalMessagesReady = 0;
        $totalMessagesUnacked = 0;
        $totalConsumers = 0;

        foreach ($queues as $queue) {
            $totalMessages += $queue['messages'] ?? 0;
            $totalMessagesReady += $queue['messages_ready'] ?? 0;
            $totalMessagesUnacked += $queue['messages_unacknowledged'] ?? 0;
            $totalConsumers += $queue['consumers'] ?? 0;
        }

        return [
            'connected' => true,
            'overview' => $overview,
            'queues' => $queues,
            'connections' => $connections,
            'channels' => $channels,
            'consumers' => $consumers,
            'nodes' => $nodes,
            'stats' => [
                'total_queues' => count($queues),
                'total_messages' => $totalMessages,
                'total_messages_ready' => $totalMessagesReady,
                'total_messages_unacked' => $totalMessagesUnacked,
                'total_consumers' => $totalConsumers,
                'total_connections' => count($connections),
                'total_channels' => count($channels),
                'rabbitmq_version' => $overview['rabbitmq_version'] ?? 'Unknown',
                'erlang_version' => $overview['erlang_version'] ?? 'Unknown',
            ]
        ];
    }
}

