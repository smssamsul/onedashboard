<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

class RegistrationParserService
{
    /**
     * Parse registration data from WhatsApp message
     * Format yang diharapkan:
     * Nama: [nama]
     * Email: [email]
     * No Telp: [no_telp]
     * Produk yang diminati: [produk]
     */
    public function parse(string $message): ?array
    {
        $lines = explode("\n", trim($message));
        $data = [];
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;
            
            // Parse format "Label: Value"
            if (preg_match('/^(.+?):\s*(.+)$/i', $line, $matches)) {
                $label = strtolower(trim($matches[1]));
                $value = trim($matches[2]);
                
                if (empty($value)) continue;
                
                // Map label ke field
                if (str_contains($label, 'nama')) {
                    $data['nama'] = $value;
                } elseif (str_contains($label, 'email')) {
                    $data['email'] = $value;
                } elseif (str_contains($label, 'telp') || str_contains($label, 'telepon') || str_contains($label, 'hp') || str_contains($label, 'wa')) {
                    $data['no_telp'] = $this->cleanPhoneNumber($value);
                } elseif (str_contains($label, 'produk')) {
                    $data['produk'] = $value;
                }
            }
        }
        
        // Validasi minimal: nama dan no telp harus ada
        if (empty($data['nama']) || empty($data['no_telp'])) {
            return null;
        }
        
        return $data;
    }
    
    /**
     * Clean phone number (remove non-numeric, add 62 prefix if needed)
     */
    private function cleanPhoneNumber(string $phone): string
    {
        // Remove all non-numeric characters
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Remove leading 0 and add 62
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . $phone;
        }
        
        return $phone;
    }
    
    /**
     * Check if message looks like registration data
     */
    public function isRegistrationFormat(string $message): bool
    {
        $messageLower = strtolower($message);
        
        // Check if contains registration keywords
        $keywords = ['nama:', 'email:', 'telp:', 'telepon:', 'produk:'];
        $foundKeywords = 0;
        
        foreach ($keywords as $keyword) {
            if (str_contains($messageLower, $keyword)) {
                $foundKeywords++;
            }
        }
        
        // If found at least 2 keywords, likely registration format
        return $foundKeywords >= 2;
    }
}
