<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Tambahkan field approval_direksi ke hr_cuti
        if (Schema::hasTable('hr_cuti')) {
            Schema::table('hr_cuti', function (Blueprint $table) {
                if (!Schema::hasColumn('hr_cuti', 'approval_direksi')) {
                    $table->unsignedBigInteger('approval_direksi')->nullable()->after('approved_by');
                    $table->string('status_approval_direksi', 20)->nullable()->default('pending')->after('approval_direksi');
                    $table->text('catatan_approval_direksi')->nullable()->after('status_approval_direksi');
                    $table->timestamp('approved_direksi_at')->nullable()->after('catatan_approval_direksi');
                }
            });
        }

        // Tambahkan field approval_direksi ke hr_izin
        if (Schema::hasTable('hr_izin')) {
            Schema::table('hr_izin', function (Blueprint $table) {
                if (!Schema::hasColumn('hr_izin', 'approval_direksi')) {
                    $table->unsignedBigInteger('approval_direksi')->nullable()->after('approved_by');
                    $table->string('status_approval_direksi', 20)->nullable()->default('pending')->after('approval_direksi');
                    $table->text('catatan_approval_direksi')->nullable()->after('status_approval_direksi');
                    $table->timestamp('approved_direksi_at')->nullable()->after('catatan_approval_direksi');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Hapus field approval_direksi dari hr_cuti
        if (Schema::hasTable('hr_cuti')) {
            Schema::table('hr_cuti', function (Blueprint $table) {
                if (Schema::hasColumn('hr_cuti', 'approval_direksi')) {
                    $table->dropColumn(['approval_direksi', 'status_approval_direksi', 'catatan_approval_direksi', 'approved_direksi_at']);
                }
            });
        }

        // Hapus field approval_direksi dari hr_izin
        if (Schema::hasTable('hr_izin')) {
            Schema::table('hr_izin', function (Blueprint $table) {
                if (Schema::hasColumn('hr_izin', 'approval_direksi')) {
                    $table->dropColumn(['approval_direksi', 'status_approval_direksi', 'catatan_approval_direksi', 'approved_direksi_at']);
                }
            });
        }
    }
};
