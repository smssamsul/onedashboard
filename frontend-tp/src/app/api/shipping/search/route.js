import { NextResponse } from 'next/server';

/**
 * Next.js API Route untuk search destination menggunakan Komerce OpenAPI
 * 
 * Endpoint: GET /api/shipping/search?search=...
 * 
 * Hardcode API Key (untuk testing):
 * - x-api-key: mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb
 * 
 * TODO: Pindahkan ke process.env.KOMERCE_API_KEY
 */
const API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const KOMERCE_BASE_URL = 'https://rajaongkir.komerce.id/api/v1';
const RAJAONGKIR_API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/basic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Handle search kosong atau hanya whitespace - return empty array (bukan error)
    // Minimal 1 huruf tanpa error - jadi jika kosong, return empty array
    if (!search || search.trim().length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Search kosong',
        data: []
      }, { status: 200 });
    }

    // Build URL dengan query parameter
    // Endpoint: /destination/search?query={query}
    const keyword = search.trim();
    const searchUrl = `${KOMERCE_BASE_URL}/destination/search?query=${encodeURIComponent(keyword)}`;

    let response;
    try {
      // Fetch dengan timeout 10 detik
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'key': API_KEY,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
    } catch (fetchError) {
      // Tangani timeout dan network error - log untuk debugging
      if (fetchError.name === 'AbortError') {
        console.error('[SHIPPING_SEARCH] Request timeout:', searchUrl);
      } else {
        console.error('[SHIPPING_SEARCH] Fetch failed:', fetchError.message, 'URL:', searchUrl);
      }
      // Fallback ke RajaOngkir API
      console.log('[SHIPPING_SEARCH] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(search);
      } catch (fallbackError) {
        console.error('[SHIPPING_SEARCH] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: 'Gagal terhubung ke server. Silakan coba lagi.',
          data: []
        }, { status: 200 });
      }
    }

    // Tangani HTTP error (400/401/422/500) - log untuk debugging
    if (!response || !response.ok) {
      const status = response?.status || 0;
      const responseTextPreview = await response.text().catch(() => '');
      console.error('[SHIPPING_SEARCH] HTTP error:', status, 'Response:', responseTextPreview.substring(0, 500));
      
      // Tangani berbagai status code
      if (status === 400 || status === 401 || status === 422) {
        // Bad request, unauthorized, atau unprocessable entity
        return NextResponse.json({
          success: false,
          message: 'Request tidak valid. Silakan coba dengan kata kunci lain.',
          data: []
        }, { status: 200 });
      }
      
      // Error lainnya - coba fallback
      console.log('[SHIPPING_SEARCH] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(search);
      } catch (fallbackError) {
        console.error('[SHIPPING_SEARCH] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: `Gagal mengambil data (HTTP ${status}). Silakan coba lagi.`,
          data: []
        }, { status: 200 });
      }
    }

    // Parse response text
    const responseText = await response.text();

    // Tangani response kosong - coba fallback
    if (!responseText || responseText.trim().length === 0) {
      console.error('[SHIPPING_SEARCH] Empty response from API');
      console.log('[SHIPPING_SEARCH] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(search);
      } catch (fallbackError) {
        console.error('[SHIPPING_SEARCH] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: 'Tidak ada data yang ditemukan',
          data: []
        }, { status: 200 });
      }
    }

    // Parse JSON - log error untuk debugging
    let json;
    try {
      json = JSON.parse(responseText);
      console.log('[SHIPPING_SEARCH] Response parsed successfully, keys:', Object.keys(json));
    } catch (parseError) {
      // Log error untuk debugging
      console.error('[SHIPPING_SEARCH] JSON parse error:', parseError.message);
      console.error('[SHIPPING_SEARCH] Raw response (first 500 chars):', responseText.substring(0, 500));
      return NextResponse.json({
        success: false,
        message: 'Format response tidak valid dari server',
        data: []
      }, { status: 200 });
    }

    // Handle response dari Komerce API
    // Format: { meta: {...}, data: [...] }
    let results = [];

    if (json.data && Array.isArray(json.data)) {
      // Format: { data: [...] } atau { meta: {...}, data: [...] }
      results = json.data;
    } else if (Array.isArray(json)) {
      // Format: langsung array
      results = json;
    } else if (json.results && Array.isArray(json.results)) {
      // Format: { results: [...] }
      results = json.results;
    } else if (json.success && Array.isArray(json.data)) {
      // Format: { success: true, data: [...] }
      results = json.data;
    } else {
      // Format tidak dikenal - log untuk debugging dan coba fallback
      console.error('[SHIPPING_SEARCH] Unknown response format. Response:', JSON.stringify(json).substring(0, 1000));
      console.log('[SHIPPING_SEARCH] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(search);
      } catch (fallbackError) {
        console.error('[SHIPPING_SEARCH] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: 'Format response tidak dikenal dari server',
          data: []
        }, { status: 200 });
      }
    }

    // Normalize data untuk frontend
    // Format dari Komerce /destination/search: { district_id, district: { name }, city: { name }, province: { name } }
    // Atau format alternatif: { id, district_name, city_name, province_name }
    const normalizedData = results.map(item => {
      // Handle nested structure (district.name, city.name, province.name)
      const districtId = item.district_id || item.id || item.district?.id || '';
      const districtName = item.district?.name || item.district_name || item.district || '';
      const cityName = item.city?.name || item.city_name || item.city || '';
      const provinceName = item.province?.name || item.province_name || item.province || '';
      
      return {
        district_id: districtId,
        id: districtId, // For backward compatibility
        district_name: districtName,
        city_name: cityName,
        province_name: provinceName,
        label: `${districtName || ''}, ${cityName || ''}, ${provinceName || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
      };
    });

    // Return normalized data dengan format standar
    return NextResponse.json({
      success: true,
      message: 'Berhasil mengambil data',
      data: normalizedData
    }, { status: 200 });

  } catch (error) {
    // Catch-all error handler - log untuk debugging
    console.error('[SHIPPING_SEARCH] Unexpected error:', error);
    
    // Fallback ke RajaOngkir API
    console.log('[SHIPPING_SEARCH] Trying fallback to RajaOngkir API...');
    try {
      return await fallbackToRajaOngkir(search);
    } catch (fallbackError) {
      console.error('[SHIPPING_SEARCH] Fallback also failed:', fallbackError);
      return NextResponse.json({
        success: false,
        message: `Terjadi kesalahan: ${error.message || 'Unknown error'}`,
        data: []
      }, { status: 200 });
    }
  }
}

// Fallback function ke RajaOngkir API
async function fallbackToRajaOngkir(search) {
  try {
    // Fetch semua kota dari RajaOngkir
    const response = await fetch(`${RAJAONGKIR_BASE_URL}/city`, {
      method: 'GET',
      headers: {
        'key': RAJAONGKIR_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`RajaOngkir API returned ${response.status}`);
    }

    const responseText = await response.text();
    const json = JSON.parse(responseText);

    // Check status
    if (json.rajaongkir?.status?.code !== 200) {
      throw new Error(json.rajaongkir?.status?.description || 'RajaOngkir API error');
    }

    const results = json.rajaongkir?.results || [];
    
    // Filter berdasarkan search keyword
    const keyword = search.trim().toLowerCase();
    const filtered = results.filter(
      (c) =>
        c.city_name?.toLowerCase().includes(keyword) ||
        c.province?.toLowerCase().includes(keyword)
    );

    // Format response sesuai yang diharapkan frontend
    const formattedCities = filtered.map(city => ({
      id: city.city_id,
      destination_id: city.city_id,
      city_id: city.city_id,
      city_name: city.city_name,
      province_name: city.province,
      province_id: city.province_id,
      type: city.type || '',
      postal_code: city.postal_code || '',
      label: `${city.city_name}, ${city.province}`.trim(),
    }));

    console.log('[SHIPPING_SEARCH] Fallback to RajaOngkir successful, found', formattedCities.length, 'cities');
    
    return NextResponse.json({
      success: true,
      message: 'Berhasil mengambil data (via RajaOngkir)',
      data: formattedCities
    }, { status: 200 });
  } catch (error) {
    console.error('[SHIPPING_SEARCH] Fallback to RajaOngkir failed:', error);
    throw error;
  }
}

