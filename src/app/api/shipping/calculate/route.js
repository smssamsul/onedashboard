import { NextResponse } from 'next/server';

/**
 * Next.js API Route untuk menghitung ongkir menggunakan Komerce OpenAPI
 * 
 * Endpoint: GET /api/shipping/calculate?shipper_destination_id=...&receiver_destination_id=...&weight=...&item_value=...&cod=...
 * 
 * Hardcode API Key (untuk testing):
 * - x-api-key: mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb
 * 
 * TODO: Pindahkan ke process.env.KOMERCE_API_KEY
 */
const API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const KOMERCE_BASE_URL = 'https://api-sandbox.collaborator.komerce.id/tariff/api/v1';
const RAJAONGKIR_API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/basic';
const ORIGIN_CITY_ID = '73655'; // Kelapa Dua, Kabupaten Tangerang, Banten

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get query parameters
    const shipper_destination_id = searchParams.get('shipper_destination_id') || '';
    const receiver_destination_id = searchParams.get('receiver_destination_id') || '';
    const weight = searchParams.get('weight') || '1000';
    const item_value = searchParams.get('item_value') || '0';
    const cod = searchParams.get('cod') || '0';
    const courier = searchParams.get('courier') || 'jne';

    // Validasi minimal - shipper dan receiver wajib
    if (!shipper_destination_id || !receiver_destination_id) {
      // Silent error - return empty object
      return NextResponse.json({
        success: true,
        message: 'Parameter tidak lengkap',
        price: 0,
        etd: '',
        data: {}
      }, { status: 200 });
    }

    // Build URL dengan query parameters
    const params = new URLSearchParams();
    params.append('shipper_destination_id', shipper_destination_id);
    params.append('receiver_destination_id', receiver_destination_id);
    params.append('weight', weight);
    params.append('item_value', item_value);
    params.append('cod', cod);

    const costUrl = `${KOMERCE_BASE_URL}/calculate?${params.toString()}`;

    let response;
    try {
      // Fetch dengan timeout 15 detik
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      response = await fetch(costUrl, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
    } catch (fetchError) {
      // Tangani timeout dan network error - log untuk debugging
      if (fetchError.name === 'AbortError') {
        console.error('[SHIPPING_CALCULATE] Request timeout:', costUrl);
      } else {
        console.error('[SHIPPING_CALCULATE] Fetch failed:', fetchError.message, 'URL:', costUrl);
      }
      // Fallback ke RajaOngkir API
      console.log('[SHIPPING_CALCULATE] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(receiver_destination_id, parseInt(weight, 10), courier);
      } catch (fallbackError) {
        console.error('[SHIPPING_CALCULATE] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: 'Gagal terhubung ke server. Silakan coba lagi.',
          price: 0,
          etd: '',
          data: {}
        }, { status: 200 });
      }
    }

    // Tangani HTTP error (400/401/422/500) - log untuk debugging
    if (!response || !response.ok) {
      const status = response?.status || 0;
      const responseTextPreview = await response.text().catch(() => '');
      console.error('[SHIPPING_CALCULATE] HTTP error:', status, 'Response:', responseTextPreview.substring(0, 500));
      
      // Tangani berbagai status code
      if (status === 400 || status === 401 || status === 422) {
        // Bad request, unauthorized, atau unprocessable entity
        return NextResponse.json({
          success: false,
          message: 'Request tidak valid. Pastikan kota tujuan sudah dipilih.',
          price: 0,
          etd: '',
          data: {}
        }, { status: 200 });
      }
      
      // Error lainnya
      return NextResponse.json({
        success: false,
        message: `Gagal menghitung ongkir (HTTP ${status}). Silakan coba lagi.`,
        price: 0,
        etd: '',
        data: {}
      }, { status: 200 });
    }

    // Parse response text
    const responseText = await response.text();

    // Tangani response kosong - coba fallback
    if (!responseText || responseText.trim().length === 0) {
      console.error('[SHIPPING_CALCULATE] Empty response from API');
      console.log('[SHIPPING_CALCULATE] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(receiver_destination_id, parseInt(weight, 10), courier);
      } catch (fallbackError) {
        console.error('[SHIPPING_CALCULATE] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: 'Tidak ada data ongkir yang ditemukan',
          price: 0,
          etd: '',
          data: {}
        }, { status: 200 });
      }
    }

    // Parse JSON - log error untuk debugging
    let json;
    try {
      json = JSON.parse(responseText);
      console.log('[SHIPPING_CALCULATE] Response parsed successfully, keys:', Object.keys(json));
    } catch (parseError) {
      // Log error untuk debugging
      console.error('[SHIPPING_CALCULATE] JSON parse error:', parseError.message);
      console.error('[SHIPPING_CALCULATE] Raw response (first 500 chars):', responseText.substring(0, 500));
      return NextResponse.json({
        success: false,
        message: 'Format response tidak valid dari server',
        price: 0,
        etd: '',
        data: {}
      }, { status: 200 });
    }

    // Handle berbagai format response dari Komerce
    // Format bisa: { data: {...} } atau langsung object atau { result: {...} }
    let costData = {};

    if (json.data && typeof json.data === 'object') {
      // Format: { data: {...} }
      costData = json.data;
    } else if (json.result && typeof json.result === 'object') {
      // Format: { result: {...} }
      costData = json.result;
    } else if (json.success && json.data && typeof json.data === 'object') {
      // Format: { success: true, data: {...} }
      costData = json.data;
    } else if (typeof json === 'object' && !Array.isArray(json)) {
      // Format: langsung object
      costData = json;
    } else {
      // Format tidak dikenal - log untuk debugging dan coba fallback
      console.error('[SHIPPING_CALCULATE] Unknown response format. Response:', JSON.stringify(json).substring(0, 1000));
      console.log('[SHIPPING_CALCULATE] Trying fallback to RajaOngkir API...');
      try {
        return await fallbackToRajaOngkir(receiver_destination_id, parseInt(weight, 10), courier);
      } catch (fallbackError) {
        console.error('[SHIPPING_CALCULATE] Fallback also failed:', fallbackError);
        return NextResponse.json({
          success: false,
          message: 'Format response tidak dikenal dari server',
          price: 0,
          etd: '',
          data: {}
        }, { status: 200 });
      }
    }

    // Normalize data untuk frontend
    // Extract price/cost dari berbagai kemungkinan field
    const normalizedData = {
      price: costData.price || costData.cost || costData.total_cost || costData.ongkir || 0,
      etd: costData.etd || costData.estimated_delivery || costData.delivery_time || '',
      courier: costData.courier || costData.shipping_method || '',
      service: costData.service || costData.service_type || '',
      raw: costData // Include raw data untuk debugging
    };

    // Return normalized data dengan format standar
    // Pastikan selalu return price dan etd di level atas untuk kompatibilitas frontend
    return NextResponse.json({
      success: true,
      message: 'Berhasil menghitung ongkir',
      price: normalizedData.price || 0,
      etd: normalizedData.etd || '',
      data: normalizedData
    }, { status: 200 });

  } catch (error) {
    // Catch-all error handler - log untuk debugging
    console.error('[SHIPPING_CALCULATE] Unexpected error:', error);
    
    // Fallback ke RajaOngkir API
    console.log('[SHIPPING_CALCULATE] Trying fallback to RajaOngkir API...');
    try {
      return await fallbackToRajaOngkir(receiver_destination_id, parseInt(weight, 10), courier);
    } catch (fallbackError) {
      console.error('[SHIPPING_CALCULATE] Fallback also failed:', fallbackError);
      return NextResponse.json({
        success: false,
        message: `Terjadi kesalahan: ${error.message || 'Unknown error'}`,
        price: 0,
        etd: '',
        data: {}
      }, { status: 200 });
    }
  }
}

// Fallback function ke RajaOngkir API
async function fallbackToRajaOngkir(destination, weight = 1000, courier = 'jne') {
  try {
    // Build URL-encoded body untuk RajaOngkir
    const params = new URLSearchParams();
    params.append('origin', ORIGIN_CITY_ID);
    params.append('destination', String(destination));
    params.append('weight', String(weight));
    params.append('courier', String(courier).toLowerCase());

    const response = await fetch(`${RAJAONGKIR_BASE_URL}/cost`, {
      method: 'POST',
      headers: {
        'key': RAJAONGKIR_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
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

    const result = json.rajaongkir?.results?.[0];
    if (!result || !result.costs || result.costs.length === 0) {
      throw new Error('No costs available from RajaOngkir');
    }

    const cost = result.costs[0];
    const price = parseInt(cost.value || 0, 10);
    const etd = cost.etd || '';

    console.log('[SHIPPING_CALCULATE] Fallback to RajaOngkir successful, price:', price);
    
    return NextResponse.json({
      success: true,
      message: 'Berhasil menghitung ongkir (via RajaOngkir)',
      price: price,
      etd: etd,
      data: {
        price: price,
        etd: etd,
        courier: courier,
        service: cost.service || ''
      }
    }, { status: 200 });
  } catch (error) {
    console.error('[SHIPPING_CALCULATE] Fallback to RajaOngkir failed:', error);
    throw error;
  }
}

