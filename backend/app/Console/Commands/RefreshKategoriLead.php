<?php

namespace App\Console\Commands;

use App\Models\Percakapan;
use App\Services\LeadValidasiService;
use Illuminate\Console\Command;

/**
 * Isi/perbarui percakapan.kategori_lead ('lead' / 'bukan_lead') - dipanggil
 * otomatis di awal leads:rescore-intent supaya reklasifikasi AI bisa skip
 * nomor nyasar dan tidak buang biaya percuma. Bisa juga dijalankan sendiri
 * kalau cuma mau refresh status tanpa jalankan reklasifikasi/skor ulang.
 *
 * PENTING: status ini CUMA menentukan mana yang diproses backfill AI -
 * tidak menyembunyikan/menghapus apapun. Menu Percakapan tetap menampilkan
 * SEMUA percakapan terlepas dari kategori_lead-nya.
 */
class RefreshKategoriLead extends Command
{
    protected $signature = 'leads:refresh-kategori {--eksekusi : Terapkan perubahan. Tanpa opsi ini hanya menampilkan pratinjau}';

    protected $description = "Isi kolom percakapan.kategori_lead ('lead'/'bukan_lead') berdasar cocok lead_lpwas + order";

    public function handle(): int
    {
        $waValid = app(LeadValidasiService::class)->waLeadValid();
        $eksekusi = (bool) $this->option('eksekusi');

        $jumlahLead = Percakapan::whereIn('phone_number', $waValid)->count();
        $jumlahBukanLead = Percakapan::whereNotIn('phone_number', $waValid)->count();

        $this->info('=== Refresh kategori_lead ===');
        $this->line("Akan ditandai 'lead': {$jumlahLead}");
        $this->line("Akan ditandai 'bukan_lead': {$jumlahBukanLead}");

        if (!$eksekusi) {
            $this->newLine();
            $this->warn('Mode pratinjau - tidak ada data yang diubah. Tambahkan --eksekusi untuk menerapkan.');
            return self::SUCCESS;
        }

        Percakapan::whereIn('phone_number', $waValid)->update(['kategori_lead' => 'lead']);
        Percakapan::whereNotIn('phone_number', $waValid)->update(['kategori_lead' => 'bukan_lead']);

        $this->info('Selesai.');

        return self::SUCCESS;
    }
}
