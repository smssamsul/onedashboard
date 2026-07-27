<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tampilan timeline butuh titik awal bar, bukan cuma tenggat.
     * Sebelum ini tanggal mulai tidak pernah dicatat, jadi data lama
     * di-backfill dengan tanggal task dibuat.
     */
    public function up(): void
    {
        if (!Schema::hasTable('task') || Schema::hasColumn('task', 'tanggal_mulai')) {
            return;
        }

        Schema::table('task', function (Blueprint $table) {
            $table->date('tanggal_mulai')->nullable()->after('deskripsi');
        });

        DB::table('task')->whereNull('tanggal_mulai')->update([
            'tanggal_mulai' => DB::raw('created_at::date'),
        ]);
    }

    public function down(): void
    {
        if (Schema::hasTable('task') && Schema::hasColumn('task', 'tanggal_mulai')) {
            Schema::table('task', function (Blueprint $table) {
                $table->dropColumn('tanggal_mulai');
            });
        }
    }
};
