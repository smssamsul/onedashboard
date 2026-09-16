<?php

namespace App\Services;

use App\Models\OrderCustomer;
use App\Models\OrderCustomerArsip;
use App\Models\Produk;

/**
 * Resolusi tier Workshop (Platinum/Gold/Silver/Reseat) dari sebuah order -
 * dipakai bareng oleh WorkshopReportController (rekap peserta per bulan) dan
 * CustomerController (breakdown keanggotaan per tahun), supaya logikanya
 * konsisten di dua tempat.
 *
 * Data arsip (order_customer_arsip) tidak punya kolom bundling, jadi tier
 * non-Reseat-nya ditebak dari keanggotaan customer SAAT INI - bisa meleset
 * kalau customer itu upgrade tier di tahun setelahnya, tapi ini pendekatan
 * terbaik yang bisa dilakukan dari data yang ada.
 */
class WorkshopTierResolver
{
    public const PRODUK_RESEAT_ID = 16;
    public const TIER_KEYS = ['platinum', 'gold', 'silver', 'reseat'];

    /** Semua id produk (live + arsip) yang termasuk program Workshop. */
    public function produkIds()
    {
        return Produk::whereRaw('LOWER(nama) LIKE ?', ['%workshop%'])->pluck('id');
    }

    public function resolveTierLive(OrderCustomer $order): ?string
    {
        if ((int) $order->produk === self::PRODUK_RESEAT_ID) {
            return 'reseat';
        }

        $namaBundling = strtolower(trim($order->bundling_rel->nama ?? ''));
        return in_array($namaBundling, ['platinum', 'gold', 'silver'], true) ? $namaBundling : null;
    }

    public function resolveTierArsip(OrderCustomerArsip $order): ?string
    {
        if (stripos((string) $order->produk_nama_manual, 'reseat') !== false) {
            return 'reseat';
        }

        $keanggotaan = strtolower((string) ($order->customer->keanggotaan ?? ''));
        return in_array($keanggotaan, ['platinum', 'gold', 'silver'], true) ? $keanggotaan : null;
    }
}
