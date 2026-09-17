<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\LeadLpwa;
use Illuminate\Support\Collection;

/**
 * Daftar nomor WA yang dianggap "lead valid" - ada namanya di lead_lpwas
 * (data lead Meta Ads) DAN sudah pernah punya order. Dipakai bareng oleh:
 * - PercakapanController::scopeHanyaLeadValid() (filter tampilan live di
 *   halaman Analisa Leads)
 * - RefreshKategoriLead command (isi kolom percakapan.kategori_lead, biar
 *   command backfill/reklasifikasi AI bisa skip nomor nyasar tanpa perlu
 *   hitung ulang query ini tiap kali)
 *
 * CATATAN: pencocokan murni by nilai nomor WA (tidak ada foreign key di
 * skema), jadi customer yang nomornya beda format (0 vs 62) atau order-nya
 * belum ter-link dengan benar bisa saja keliru dianggap "bukan lead" -
 * lihat catatan di RefreshKategoriLead soal kenapa ini tidak dipakai utk
 * menghapus data, cuma utk skip biaya AI.
 */
class LeadValidasiService
{
    public function waLeadValid(): Collection
    {
        $waLeadLpwa = LeadLpwa::whereNotNull('no_wa')->where('no_wa', '!=', '')->pluck('no_wa');
        $waPunyaOrder = Customer::whereHas('orders')->whereNotNull('wa')->where('wa', '!=', '')->pluck('wa');

        return $waLeadLpwa->intersect($waPunyaOrder)->unique()->values();
    }
}
