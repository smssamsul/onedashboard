import { NextResponse } from 'next/server';

/**
 * Backend API Route untuk search kota/subdistrict dari RajaOngkir V2 Basic
 * 
 * Hardcode untuk testing (nanti bisa pindahkan ke environment variable):
 * - API_KEY: mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb
 * 
 * TODO: Pindahkan ke process.env.RAJAONGKIR_API_KEY
 */
const API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/basic'; // V2 Basic

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // RajaOngkir V2 Basic menggunakan header 'key'
    let response;
    try {
      response = await fetch(`${RAJAONGKIR_BASE_URL}/city`, {
        method: 'GET',
        headers: {
          'key': API_KEY,
          'Content-Type': 'application/json'
        }
      });
    } catch (fetchError) {
      console.error('[RAJAONGKIR_CITIES] Fetch failed:', fetchError.message);
      return NextResponse.json(
        {
          success: false,
          message: 'Gagal terhubung ke RajaOngkir API',
          data: []
        },
        { status: 200 }
      );
    }

    console.log('[RAJAONGKIR_CITIES] Response status:', response.status);
    console.log('[RAJAONGKIR_CITIES] Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('[RAJAONGKIR_CITIES] Raw response status:', response.status);
    console.log('[RAJAONGKIR_CITIES] Raw response (first 1000 chars):', responseText.substring(0, 1000));

    // Check HTTP status
    if (!response.ok) {
      console.warn('[RAJAONGKIR_CITIES] HTTP error:', response.status, responseText.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          message: `HTTP ${response.status}: Gagal mengambil data dari RajaOngkir`,
          data: []
        },
        { status: 200 }
      );
    }

    let json;
    try {
      json = JSON.parse(responseText);
    } catch (err) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.error('[RAJAONGKIR_CITIES] JSON parse error:', err.message);
      console.error('[RAJAONGKIR_CITIES] Full response:', responseText);
      return NextResponse.json(
        {
          success: false,
          message: 'Response dari RajaOngkir bukan JSON',
          data: [] // Return empty array agar frontend tidak error
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    console.log('[RAJAONGKIR_CITIES] Parsed JSON keys:', Object.keys(json));
    console.log('[RAJAONGKIR_CITIES] Parsed JSON sample:', JSON.stringify(json).substring(0, 1000));

    // Validate top-level structure
    // RajaOngkir bisa return error langsung atau dalam struktur rajaongkir
    if (!json) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.warn("[RAJAONGKIR_CITIES] Empty response");
      return NextResponse.json(
        {
          success: false,
          message: "Response kosong dari RajaOngkir",
          data: [] // Return empty array agar frontend tidak error
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Check if it's an error response (bisa langsung error atau dalam rajaongkir.status)
    if (json.status && json.status.code !== 200) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.warn("[RAJAONGKIR_CITIES] Error response:", json);
      return NextResponse.json(
        {
          success: false,
          message: json.status.description || json.message || "Gagal mengambil data kota",
          data: [] // Return empty array agar frontend tidak error
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Check if response has rajaongkir wrapper
    // Handle berbagai format response yang mungkin
    let results = null;
    let statusCode = null;
    let statusMsg = null;

    if (json.rajaongkir) {
      // Format: { rajaongkir: { status: {...}, results: [...] } }
      results = json.rajaongkir.results;
      statusCode = json.rajaongkir.status?.code;
      statusMsg = json.rajaongkir.status?.description;
    } else if (Array.isArray(json)) {
      // Format: langsung array (kemungkinan kecil, tapi handle)
      results = json;
      statusCode = 200;
    } else if (json.results && Array.isArray(json.results)) {
      // Format: { results: [...] }
      results = json.results;
      statusCode = json.status?.code || 200;
      statusMsg = json.status?.description;
    } else {
      // Format tidak dikenal - log detail untuk debugging
      console.error("[RAJAONGKIR_CITIES] Unknown response format!");
      console.error("[RAJAONGKIR_CITIES] Response keys:", Object.keys(json));
      console.error("[RAJAONGKIR_CITIES] Response type:", typeof json);
      console.error("[RAJAONGKIR_CITIES] Full response (first 2000 chars):", JSON.stringify(json).substring(0, 2000));
      
      // Coba cek apakah ini error message
      if (json.message || json.error || json.description) {
        const errorMsg = json.message || json.error || json.description;
        console.error("[RAJAONGKIR_CITIES] Error message from API:", errorMsg);
        return NextResponse.json(
          {
            success: false,
            message: errorMsg || "Format response tidak dikenal dari RajaOngkir",
            data: [] // Return empty array agar frontend tidak error
          },
          { status: 200 } // Return 200 agar frontend tidak throw error
        );
      }
      
      // Jika benar-benar tidak dikenal, return empty array
      return NextResponse.json(
        {
          success: false,
          message: "Format response tidak dikenal dari RajaOngkir",
          data: [] // Return empty array agar frontend tidak error
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Validate status
    if (statusCode !== 200 && statusCode !== null) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.warn("[RAJAONGKIR_CITIES] Status error:", statusCode, statusMsg);
      return NextResponse.json(
        {
          success: false,
          message: statusMsg || "Gagal mengambil data kota",
          data: [] // Return empty array agar frontend tidak error
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    // Check if results exist
    if (!results || !Array.isArray(results)) {
      // Handle error dengan baik, jangan lempar error ke frontend
      console.warn('[RAJAONGKIR_CITIES] No results array:', results);
      return NextResponse.json(
        {
          success: false,
          message: "Data kota tidak ditemukan",
          data: [] // Return empty array agar frontend tidak error
        },
        { status: 200 } // Return 200 agar frontend tidak throw error
      );
    }

    console.log('[RAJAONGKIR_CITIES] Found', results.length, 'cities');

    let list = results;

    // Local filter
    if (search) {
      list = list.filter(
        (c) =>
          c.city_name?.toLowerCase().includes(search) ||
          c.province?.toLowerCase().includes(search)
      );
    }

    // Format response sesuai yang diharapkan frontend
    const formattedCities = list.map(city => ({
      city_id: city.city_id,
      city_name: city.city_name,
      province_id: city.province_id,
      province_name: city.province,
      type: city.type || '',
      postal_code: city.postal_code || '',
      label: `${city.city_name}, ${city.province}`.trim(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedCities,
      count: formattedCities.length
    });
  } catch (e) {
    // Handle semua error dengan baik, jangan lempar error ke frontend
    console.error('[RAJAONGKIR_CITIES] Error:', e);
    return NextResponse.json(
      { 
        success: false, 
        message: e.message || 'Terjadi kesalahan saat mengambil data kota',
        data: [] // Return empty array agar frontend tidak error
      },
      { status: 200 } // Return 200 agar frontend tidak throw error
    );
  }
}