<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom status "lead" / "bukan_lead" - dihitung dari apakah nomor WA-nya
 * ada di lead_lpwas DAN punya order (sama seperti filter hanya_lead_valid
 * di Analisa Leads), lihat App\Services\LeadValidasiService.
 *
 * Tujuannya BUKAN buat sembunyikan data di menu Percakapan (tetap tampil
 * semua di situ) - murni supaya command backfill/reklasifikasi AI
 * (leads:rescore-intent) bisa skip nomor nyasar dan tidak buang biaya AI
 * percuma ke percakapan yang bukan lead beneran.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('percakapan', function (Blueprint $table) {
            $table->string('kategori_lead', 20)->nullable()->after('status');
            $table->index('kategori_lead');
        });
    }

    public function down(): void
    {
        Schema::table('percakapan', function (Blueprint $table) {
            $table->dropIndex(['kategori_lead']);
            $table->dropColumn('kategori_lead');
        });
    }
};
