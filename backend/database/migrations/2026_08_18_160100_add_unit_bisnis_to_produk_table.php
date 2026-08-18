<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nullable (beda dari kategori yang wajib) - produk lama belum ada yang
     * terisi unit bisnisnya, dan tidak semua produk perlu tergolong ke unit
     * bisnis tertentu. onDelete set null: hapus unit bisnis tidak boleh ikut
     * menghapus produk yang menempel padanya.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('produk', 'unit_bisnis')) {
            Schema::table('produk', function (Blueprint $table) {
                $table->foreignId('unit_bisnis')->nullable()->after('kategori')
                    ->constrained('unit_bisnis')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('produk', 'unit_bisnis')) {
            Schema::table('produk', function (Blueprint $table) {
                $table->dropForeign(['unit_bisnis']);
                $table->dropColumn('unit_bisnis');
            });
        }
    }
};
