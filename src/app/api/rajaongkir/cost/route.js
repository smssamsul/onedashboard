import { NextResponse } from 'next/server';

/**
 * Backend API Route untuk menghitung ongkir menggunakan RajaOngkir V2 Basic
 * 
 * Hardcode untuk testing (nanti bisa pindahkan ke environment variable):
 * - API_KEY: mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb
 * - ORIGIN_CITY_ID: 73655 (Kelapa Dua, Tangerang, Banten - alamat kantor)
 * 
 * TODO: Pindahkan ke process.env.RAJAONGKIR_API_KEY dan process.env.RAJAONGKIR_ORIGIN_ID
 */
const API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const ORIGIN_CITY_ID = '73655'; // Kelapa Dua, Kabupaten Tangerang, Banten
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/basic'; // V2 Basic

export async function POST(request) {
  try {

    const body = await request.json();
    const { destination, weight, courier } = body;

    // Origin hardcode, tidak perlu dari request
    const origin = ORIGIN_CITY_ID;

    // Validasi input
    // Backend menerima: destination (subdistrict ID atau city ID), weight (gram), courier (optional, default jne)
    if (!destination || !weight) {
      return NextResponse.json(
        {
          success: false,
          message: 'destination dan weight wajib diisi'
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Validasi destination harus angka (city_id atau subdistrict_id)
    if (isNaN(parseInt(destination, 10))) {
      return NextResponse.json(
        {
          success: false,
          message: 'destination harus berupa ID (angka)'
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Courier default jne jika tidak dikirim
    const courierValue = courier || 'jne';

    // Validasi weight
    const weightNum = parseInt(weight, 10);
    if (isNaN(weightNum) || weightNum < 1 || weightNum > 50000) {
      return NextResponse.json(
        {
          success: false,
          message: 'weight harus antara 1 dan 50000 gram'
        },
        { status: 400 }
      );
    }

    // Build URL-encoded body (RajaOngkir V2 Basic requires form-urlencoded)
    // CATATAN: RajaOngkir V2 Basic hanya menerima CITY_ID (bukan subdistrict_id)
    // Format: origin="73655" (hardcode), destination="23" (city_id), weight=1000, courier="jne"
    const params = new URLSearchParams();
    params.append('origin', String(origin));      // Hardcode: 73655 (Kelapa Dua, Kabupaten Tangerang)
    params.append('destination', String(destination)); // city_id tujuan
    params.append('weight', String(weightNum));
    params.append('courier', String(courierValue).toLowerCase());

    console.log('[RAJAONGKIR_COST] Requesting cost (V2 Basic):', {
      origin: String(origin),      // Hardcode: 73655
      destination: String(destination), // city_id atau subdistrict_id tujuan
      weight: weightNum,
      courier: courierValue.toLowerCase()
    });

    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      response = await fetch(`${RAJAONGKIR_BASE_URL}/cost`, {
        method: 'POST',
        headers: {
          'key': API_KEY,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
    } catch (fetchError) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.error('[RAJAONGKIR_COST] Fetch error:', fetchError);
      return NextResponse.json(
        {
          success: false,
          message: 'Gagal terhubung ke API RajaOngkir',
          price: 0
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (err) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.error('[RAJAONGKIR_COST] JSON parse error:', err.message);
      console.error('[RAJAONGKIR_COST] Raw response:', responseText.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          message: 'Response dari RajaOngkir bukan JSON',
          price: 0
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Check if RajaOngkir returned an error
    if (data.rajaongkir?.status?.code !== 200) {
      // Handle error dengan baik, jangan lempar error ke frontend
      const errorMsg = data.rajaongkir?.status?.description || 'Gagal menghitung ongkir';
      console.error('[RAJAONGKIR_COST] RajaOngkir error:', errorMsg);
      return NextResponse.json(
        {
          success: false,
          message: errorMsg,
          price: 0
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Parse RajaOngkir response and normalize
    const rajaongkir = data.rajaongkir;
    if (!rajaongkir || !rajaongkir.results || rajaongkir.results.length === 0) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.warn('[RAJAONGKIR_COST] No results from RajaOngkir');
      return NextResponse.json(
        {
          success: false,
          message: 'Tidak ada hasil ongkir untuk rute ini',
          price: 0
        },
        { status: 200 }
      );
    }

    const result = rajaongkir.results[0];
    if (!result.costs || result.costs.length === 0) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.warn('[RAJAONGKIR_COST] No costs available');
      return NextResponse.json(
        {
          success: false,
          message: 'Ongkir tidak tersedia untuk rute ini',
          price: 0
        },
        { status: 200 }
      );
    }

    // Ambil cost pertama (biasanya REG)
    const cost = result.costs[0];
    const price = parseInt(cost.value || 0, 10);
    const etd = cost.etd || '';

    // Return normalized JSON - format yang diharapkan frontend
    return NextResponse.json({
      success: true,
      price, // Langsung return price di root level untuk kemudahan frontend
      etd,
      data: {
        price,
        etd
      }
    });
  } catch (error) {
    // Handle semua error dengan baik, jangan lempar error ke frontend
    console.error('[RAJAONGKIR_COST] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Terjadi kesalahan saat menghitung ongkir',
        price: 0
      },
      { status: 200 } // Return 200 agar frontend tidak throw error
    );
  }
}
