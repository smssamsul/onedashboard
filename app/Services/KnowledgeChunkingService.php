<?php

namespace App\Services;

class KnowledgeChunkingService
{
    // Chunk text menjadi smaller pieces untuk embedding
    public function chunkText(string $text, int $chunkSize = 500, int $overlap = 50): array
    {
        // Split by paragraphs first
        $paragraphs = preg_split('/\n\s*\n/', $text);
        $chunks = [];

        foreach ($paragraphs as $paragraph) {
            $paragraph = trim($paragraph);
            if (empty($paragraph)) {
                continue;
            }

            // If paragraph is smaller than chunk size, add as is
            if (strlen($paragraph) <= $chunkSize) {
                $chunks[] = $paragraph;
                continue;
            }

            // Split long paragraphs into sentences
            $sentences = preg_split('/(?<=[.!?])\s+/', $paragraph);
            $currentChunk = '';

            foreach ($sentences as $sentence) {
                $sentence = trim($sentence);
                if (empty($sentence)) {
                    continue;
                }

                // If adding this sentence exceeds chunk size, save current chunk
                if (strlen($currentChunk) + strlen($sentence) + 1 > $chunkSize && !empty($currentChunk)) {
                    $chunks[] = trim($currentChunk);
                    
                    // Add overlap: take last part of current chunk
                    if ($overlap > 0) {
                        $overlapText = substr($currentChunk, -$overlap);
                        $currentChunk = $overlapText . ' ' . $sentence;
                    } else {
                        $currentChunk = $sentence;
                    }
                } else {
                    $currentChunk .= ($currentChunk ? ' ' : '') . $sentence;
                }
            }

            // Add remaining chunk
            if (!empty($currentChunk)) {
                $chunks[] = trim($currentChunk);
            }
        }

        return array_filter($chunks, fn($chunk) => strlen(trim($chunk)) > 0);
    }
}
