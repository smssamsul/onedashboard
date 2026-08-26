<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tambah kolom customer_type (lead/customer) dan scaffold kolom scoring.
     * Logika scoring BELUM diimplementasikan — kolom disiapkan untuk masa depan.
     */
    public function up(): void
    {
        Schema::table('customer', function (Blueprint $table) {
            // === Pemisahan Lead vs Customer ===
            // Default 'lead' — semua customer baru masuk sebagai lead dulu
            if (!Schema::hasColumn('customer', 'customer_type')) {
                $table->enum('customer_type', ['lead', 'customer'])
                    ->default('lead')
                    ->after('status');
            }

            // === Scaffold Kolom Scoring (belum digunakan, disiapkan untuk logika nanti) ===
            // Rule-based score: dari sinyal data (profil, follow-up, recency, dll.) — max 70
            if (!Schema::hasColumn('customer', 'rule_score')) {
                $table->smallInteger('rule_score')->default(0)->after('customer_type');
            }

            // AI score: dari analisis percakapan WA via LLM — max 30
            if (!Schema::hasColumn('customer', 'ai_score')) {
                $table->smallInteger('ai_score')->default(0)->after('rule_score');
            }

            // Total gabungan rule_score + ai_score — max 100
            if (!Schema::hasColumn('customer', 'total_score')) {
                $table->smallInteger('total_score')->default(0)->after('ai_score');
            }

            // Label berdasarkan total_score: 'hot'(80+), 'warm'(55+), 'cold'(30+), 'frozen'(<30)
            if (!Schema::hasColumn('customer', 'score_label')) {
                $table->string('score_label', 10)->default('cold')->after('total_score');
            }

            // Kolom AI scoring (diisi saat AI scoring diimplementasikan)
            if (!Schema::hasColumn('customer', 'ai_reasoning')) {
                $table->text('ai_reasoning')->nullable()->after('score_label');
            }
            if (!Schema::hasColumn('customer', 'ai_recommended_action')) {
                $table->text('ai_recommended_action')->nullable()->after('ai_reasoning');
            }
            if (!Schema::hasColumn('customer', 'ai_sentiment')) {
                $table->string('ai_sentiment', 20)->nullable()->after('ai_recommended_action');
            }

            // Timestamp kapan score terakhir dihitung
            if (!Schema::hasColumn('customer', 'score_updated_at')) {
                $table->timestamp('score_updated_at')->nullable()->after('ai_sentiment');
            }
        });

        // Index untuk performa query filter & sort
        Schema::table('customer', function (Blueprint $table) {
            if (!Schema::hasIndex('customer', 'idx_customer_customer_type')) {
                $table->index('customer_type', 'idx_customer_customer_type');
            }
            if (!Schema::hasIndex('customer', 'idx_customer_total_score')) {
                $table->index('total_score', 'idx_customer_total_score');
            }
            if (!Schema::hasIndex('customer', 'idx_customer_score_label')) {
                $table->index('score_label', 'idx_customer_score_label');
            }
        });
    }

    /**
     * Sengaja no-op: kolomnya kemungkinan sudah ada sebelum migration ini
     * dijalankan (bukan dibuat olehnya), jadi down() tidak boleh drop kolom
     * begitu saja - berisiko menghapus data produksi asli.
     */
    public function down(): void
    {
        //
    }
};
