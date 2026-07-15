<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class ChatExtractorService
{
    /**
     * Extract produk yang diminati dari chat message
     * Pattern: ambil kata setelah "ikut" atau "mau ikut" sampai ketemu "di"
     * Contoh: "Saya Mau Ikut Workshop Meta Ads di Bandung" → "Workshop Meta Ads"
     * Contoh: "hallo saya tertarik dengan seminar laravel di kota bandung"
     * 
     * @param string $message
     * @return string|null
     */
    public function extractProduct(string $message): ?string
    {
        // Pattern 1: "Mau Ikut [produk] di" atau "Ikut [produk] di"
        // Ambil semua kata setelah "ikut" atau "mau ikut" sampai ketemu "di"
        // Gunakan non-greedy match untuk mengambil semua kata sampai "di"
        if (preg_match('/(?:Mau\s+)?Ikut\s+(.+?)\s+di\s+/i', $message, $matches)) {
            $matchedProduct = trim($matches[1]);
            // Hapus kata "Kak" atau kata panggilan lainnya di akhir
            $matchedProduct = preg_replace('/\s+(Kak|Kak\.|Mas|Mas\.|Mbak|Mbak\.|Pak|Pak\.|Bu|Bu\.)$/i', '', $matchedProduct);
            // Hapus tanda baca di akhir
            $matchedProduct = rtrim($matchedProduct, '.,!?;:');
            $matchedProduct = ucwords(trim($matchedProduct));
            
            if (!empty($matchedProduct)) {
                return $matchedProduct;
            }
        }
        
        // Pattern 2: "tertarik dengan [produk] di" atau "mau [produk] di"
        if (preg_match('/(?:tertarik\s+dengan|mau)\s+(.+?)\s+di\s+/i', $message, $matches)) {
            $matchedProduct = trim($matches[1]);
            $matchedProduct = preg_replace('/\s+(Kak|Kak\.|Mas|Mas\.|Mbak|Mbak\.|Pak|Pak\.|Bu|Bu\.)$/i', '', $matchedProduct);
            $matchedProduct = rtrim($matchedProduct, '.,!?;:');
            $matchedProduct = ucwords(trim($matchedProduct));
            
            if (!empty($matchedProduct)) {
                return $matchedProduct;
            }
        }
        
        return null;
    }
    
    /**
     * Extract lokasi dari chat message
     * Pattern: ambil kata setelah "di" (bisa 1-2 kata, berakhir di spasi atau tanda baca)
     * Contoh: "di Bandung" → "Bandung"
     * Contoh: "di kota Bandung" → "kota Bandung"
     * Contoh: "di Jakarta" → "Jakarta"
     * 
     * @param string $message
     * @return string|null
     */
    public function extractLocation(string $message): ?string
    {
        // Pattern: ambil kata setelah "di" sampai ketemu kata panggilan, tanda baca, atau akhir kalimat
        // Contoh: "di Bandung Kak" → "Bandung"
        // Contoh: "di kota Bandung" → "kota Bandung"
        // Contoh: "di Bandung." → "Bandung"
        // Pattern lebih sederhana: ambil semua karakter setelah "di" sampai ketemu kata panggilan atau tanda baca
        if (preg_match('/\bdi\s+([^.,!?;:]+?)(?:\s+(?:Kak|Kak\.|Mas|Mas\.|Mbak|Mbak\.|Pak|Pak\.|Bu|Bu\.)|[.,!?;:]|$)/i', $message, $matches)) {
            $location = trim($matches[1]);
            
            // Hapus kata panggilan di akhir jika masih ada (Kak, Mas, Mbak, Pak, Bu, dll)
            $location = preg_replace('/\s+(Kak|Kak\.|Mas|Mas\.|Mbak|Mbak\.|Pak|Pak\.|Bu|Bu\.)$/i', '', $location);
            
            // Hapus tanda baca di akhir
            $location = rtrim($location, '.,!?;:');
            $location = trim($location);
            
            // Jika lokasi adalah "kota" saja, coba ambil kata berikutnya
            if (strtolower($location) === 'kota' && preg_match('/\bdi\s+kota\s+([^\s.,!?;:]+)/i', $message, $cityMatches)) {
                $location = trim($cityMatches[1]);
                $location = rtrim($location, '.,!?;:');
                $location = preg_replace('/\s+(Kak|Kak\.|Mas|Mas\.|Mbak|Mbak\.|Pak|Pak\.|Bu|Bu\.)$/i', '', $location);
            }
            
            $matchedLocation = ucwords(trim($location));
            
            if (!empty($matchedLocation) && strtolower($matchedLocation) !== 'kota') {
                return $matchedLocation;
            }
        }
        
        return null;
    }
    
    /**
     * Extract produk dan lokasi dari chat message
     * 
     * @param string $message
     * @return array ['product' => string|null, 'location' => string|null]
     */
    public function extract(string $message): array
    {
        return [
            'product' => $this->extractProduct($message),
            'location' => $this->extractLocation($message),
        ];
    }
}
