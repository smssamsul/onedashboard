import { NextResponse } from 'next/server';
import { BACKEND_URL } from "@/config/env";


export async function POST(request) {
  try {
    const body = await request.json();

    // Validasi field wajib sesuai requirement backend
    const requiredFields = ['nama', 'wa', 'email', 'produk', 'harga', 'total_harga', 'metode_bayar', 'sumber'];
    const missingFields = requiredFields.filter(field => !body[field] && body[field] !== 0);

    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, message: `Field wajib tidak lengkap: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Siapkan payload sesuai format backend
    const payload = {
      nama: String(body.nama),
      wa: String(body.wa),
      email: String(body.email),
      alamat: body.alamat ? String(body.alamat) : null,
      provinsi: body.provinsi || null,
      kabupaten: body.kabupaten || null,
      kecamatan: body.kecamatan || null,
      kode_pos: body.kode_pos || null,
      produk: parseInt(body.produk, 10),
      harga: String(body.harga),
      ongkir: String(body.ongkir || '0'),
      total_harga: String(body.total_harga),
      metode_bayar: String(body.metode_bayar),
      sumber: String(body.sumber),
      custom_value: Array.isArray(body.custom_value) ? body.custom_value : [],
      // Tambahkan default nilai untuk field opsional jika ada
      ...(body.down_payment !== undefined && body.down_payment !== null ? { down_payment: String(body.down_payment) } : {}),
      ...(body.status_pembayaran !== undefined && body.status_pembayaran !== null ? { status_pembayaran: Number(body.status_pembayaran) } : {}),
      bundling: body.bundling !== undefined ? String(body.bundling) : "",
    };

    // Proxy ke backend
    // Timeout 15 detik untuk menghindari hang
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${BACKEND_URL}/api/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parse response
    const data = await response.json().catch(() => null);

    // Handle error dari backend
    if (!response.ok || !data) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Gagal membuat order',
          error: data?.error || 'Unknown backend error',
        },
        { status: response.status || 500 }
      );
    }

    // Success - return response langsung dari backend
    return NextResponse.json({
      success: true,
      message: data?.message || 'Order berhasil dibuat',
      data: data?.data || data,
    });

  } catch (error) {
    console.error('❌ [ORDER] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal terhubung ke server. Coba lagi nanti.',
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}
