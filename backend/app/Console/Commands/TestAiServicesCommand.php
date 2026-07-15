<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ClaudeChatService;
use App\Services\ClaudeIntentClassifierService;
use App\Services\ClaudeChatSentimentService;
use App\Services\VoyageEmbeddingService;

class TestAiServicesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'test:ai-services';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Test Claude AI and Voyage AI services';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("=== Testing Voyage AI Embeddings ===");
        $voyageService = app(VoyageEmbeddingService::class);
        $embedding = $voyageService->embed("Halo ini adalah tes dari aplikasi");
        $this->info("Berhasil membuat embedding, length: " . count($embedding));

        $this->info("\n=== Testing Claude Intent Classifier ===");
        $intentService = app(ClaudeIntentClassifierService::class);
        $intent = $intentService->classify("Saya mau daftar workshop mas");
        $this->info("Intent: " . $intent);

        $this->info("\n=== Testing Claude Sentiment Classifier ===");
        $sentimentService = app(ClaudeChatSentimentService::class);
        $sentiment = $sentimentService->classify("Kenapa barangnya jelek banget sih?");
        $this->info("Sentiment: " . $sentiment);

        $this->info("\n=== Testing Claude Chat Service ===");
        $chatService = app(ClaudeChatService::class);
        $reply = $chatService->reply("Halo, bisa tolong jelaskan apa itu Laravel?", ["Laravel adalah framework PHP untuk artisan."]);
        $this->info("Reply: " . $reply);

        $this->info("\nAll tests completed!");
    }
}
