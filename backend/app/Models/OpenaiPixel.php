<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Pixel iklan ChatGPT (OpenAI Ads). Lihat OpenaiPixelController untuk
 * pengaturan, dan OpenaiConversionService untuk pengiriman event server-side.
 */
class OpenaiPixel extends Model
{
    protected $table = 'openai_pixels';

    protected $fillable = [
        'nama',
        'pixel_id',
        'capi_key',
        'semua_produk',
        'produk_ids',
        'aktif',
    ];

    protected $casts = [
        'capi_key' => 'encrypted',
        'semua_produk' => 'boolean',
        'produk_ids' => 'array',
        'aktif' => 'boolean',
    ];

    /** API key tidak pernah ikut ke response JSON, termasuk untuk admin. */
    protected $hidden = ['capi_key'];

    protected $appends = ['punya_capi_key'];

    public function getPunyaCapiKeyAttribute(): bool
    {
        return !empty($this->attributes['capi_key'] ?? null);
    }

    /**
     * Pixel aktif yang berlaku untuk satu produk: yang diset "semua produk",
     * atau yang daftar produk_ids-nya memuat produk ini.
     */
    public static function untukProduk(?int $produkId)
    {
        return static::where('aktif', true)->orderBy('id')->get()
            ->filter(function (self $p) use ($produkId) {
                if ($p->semua_produk) {
                    return true;
                }

                return $produkId !== null
                    && in_array($produkId, array_map('intval', $p->produk_ids ?? []), true);
            })
            ->values();
    }

    /** Daftar Pixel ID (string) untuk dikirim ke landing page / halaman payment. */
    public static function pixelIdsUntukProduk(?int $produkId): array
    {
        return static::untukProduk($produkId)->pluck('pixel_id')->unique()->values()->all();
    }
}
