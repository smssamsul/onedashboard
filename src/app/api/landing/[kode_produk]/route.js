import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * ⚠️ WARNING: AREA SENSITIF CACHE ⚠️
 * Route ini adalah 'Single Source of Truth' untuk data produk.
 * Arsitektur ini membypass Next.js Rewrite Proxy untuk menghindari stale data.
 * JANGAN mengubah strategi caching atau mengaktifkan revalidate tanpa diskusi arsitektur.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: Generate slug dari text
const generateSlug = (text) =>
  (text || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export async function GET(request, { params }) {
  try {
    const { kode_produk } = params;

    if (!kode_produk) {
      return NextResponse.json(
        { success: false, message: "Kode produk wajib diisi" },
        { status: 400 }
      );
    }

    // Decode URL encoding
    const decodedKode = decodeURIComponent(kode_produk);

    console.log(`[LANDING] Fetching product with kode: ${decodedKode}`);

    // Gunakan endpoint sesuai dokumentasi: /api/landing/{kode_produk}
    let response = await fetch(`${BACKEND_URL}/api/landing/${decodedKode}`, {
      method: "GET",
      cache: 'no-store',
      headers: {
        Accept: "application/json"
      }
    });

    let data = await response.json().catch(() => ({}));

    // Jika tidak ditemukan dan kode mengandung spasi, coba dengan slug
    if (!response.ok || !data.success) {
      // Jika tidak ditemukan dengan kode asli, coba dengan slug
      const slugKode = generateSlug(decodedKode);
      if (slugKode !== decodedKode) {
        console.log(`[LANDING] Product not found, trying with slug: ${slugKode}`);

        response = await fetch(`${BACKEND_URL}/api/landing/${slugKode}`, {
          method: "GET",
          cache: 'no-store',
          headers: {
            Accept: "application/json"
          }
        });

        data = await response.json().catch(() => ({}));
      }
    }

    // Jika masih tidak ditemukan, return error
    if (!response.ok || !data.success) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Produk tidak ditemukan",
        },
        { status: response.status || 404 }
      );
    }

    console.log(`[LANDING] Product found: ${data.data?.nama || data.nama}`);

    // 🔥 SOLUSI FINAL: Gunakan Response manual agar header Cache-Control murni 'no-store'
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("[LANDING] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      message: "Gagal mengambil data produk",
      error: error.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}

