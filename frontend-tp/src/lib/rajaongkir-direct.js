/**
 * RajaOngkir V2 Basic API - Direct Frontend Fetch
 * Fetch langsung ke RajaOngkir API tanpa backend proxy
 * 
 * Hardcode:
 * - API Key: mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb
 * - Origin ID: 73655 (Kelapa Dua, Tangerang, Banten)
 */

// Hardcode API key dan origin
const API_KEY = 'mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb';
const ORIGIN_ID = '73655'; // Kelapa Dua, Tangerang, Banten
const BASE_URL = 'https://api.rajaongkir.com/basic';

/**
 * Search kota/subdistrict dari RajaOngkir V2
 * @param {string} query - Search query (bisa mulai dari 1 huruf)
 * @returns {Promise<Array>} Array of city/subdistrict objects
 */
export async function searchCities(query = '') {
  try {
    // Jika query kosong, return empty array
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Fetch semua kota dari RajaOngkir (tidak ada endpoint search, jadi fetch semua lalu filter)
    const response = await fetch(`${BASE_URL}/city`, {
      method: 'GET',
      headers: {
        'key': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    // Tangani response kosong
    if (!response || !response.ok) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Search cities failed:', response?.status);
      return [];
    }

    const responseText = await response.text();
    
    // Tangani response bukan JSON
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (err) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Invalid JSON response');
      return [];
    }

    // Tangani format response tidak sesuai
    if (!json || !json.rajaongkir || !json.rajaongkir.results) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Invalid response structure');
      return [];
    }

    // Check status code dari RajaOngkir
    if (json.rajaongkir.status?.code !== 200) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] API error:', json.rajaongkir.status?.description);
      return [];
    }

    // Filter kota berdasarkan query (case-insensitive)
    const queryLower = query.trim().toLowerCase();
    const results = json.rajaongkir.results.filter((city) => {
      if (!city) return false;
      const cityName = (city.city_name || '').toLowerCase();
      const provinceName = (city.province || '').toLowerCase();
      return cityName.includes(queryLower) || provinceName.includes(queryLower);
    });

    // Format response untuk frontend
    return results.map(city => ({
      id: city.city_id,
      city_id: city.city_id,
      city_name: city.city_name,
      province_name: city.province,
      province_id: city.province_id,
      type: city.type || '',
      postal_code: city.postal_code || '',
      label: `${city.city_name}, ${city.province}`.trim()
    }));

  } catch (error) {
    // Tangani semua error tanpa menampilkan ke user
    // Hanya log ke console untuk debugging
    console.warn('[RAJAONGKIR] Search cities error (silent):', error.message);
    return [];
  }
}

/**
 * Hitung ongkir dari RajaOngkir V2
 * @param {Object} params
 * @param {string} params.destination - City/Subdistrict ID tujuan
 * @param {number} params.weight - Berat dalam gram (default: 1000)
 * @param {string} params.courier - Kode kurir (jne, jnt, tiki, pos)
 * @returns {Promise<{price: number, etd: string}>}
 */
export async function calculateCost({ destination, weight = 1000, courier = 'jne' }) {
  try {
    // Validasi input
    if (!destination) {
      console.warn('[RAJAONGKIR] Destination required');
      return { price: 0, etd: '' };
    }

    // Build URL-encoded body untuk RajaOngkir
    const params = new URLSearchParams();
    params.append('origin', ORIGIN_ID); // Hardcode origin
    params.append('destination', String(destination));
    params.append('weight', String(weight));
    params.append('courier', String(courier).toLowerCase());

    // Fetch ongkir dari RajaOngkir
    const response = await fetch(`${BASE_URL}/cost`, {
      method: 'POST',
      headers: {
        'key': API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    // Tangani HTTP error (500/400/403)
    if (!response || !response.ok) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Calculate cost failed:', response?.status);
      return { price: 0, etd: '' };
    }

    const responseText = await response.text();

    // Tangani response bukan JSON
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (err) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Invalid JSON response');
      return { price: 0, etd: '' };
    }

    // Tangani format response tidak sesuai
    if (!json || !json.rajaongkir) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Invalid response structure');
      return { price: 0, etd: '' };
    }

    // Check status code dari RajaOngkir
    if (json.rajaongkir.status?.code !== 200) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] API error:', json.rajaongkir.status?.description);
      return { price: 0, etd: '' };
    }

    // Parse hasil ongkir
    const results = json.rajaongkir.results;
    if (!results || !Array.isArray(results) || results.length === 0) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] No cost results');
      return { price: 0, etd: '' };
    }

    const result = results[0];
    if (!result.costs || !Array.isArray(result.costs) || result.costs.length === 0) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] No costs available');
      return { price: 0, etd: '' };
    }

    // Ambil cost pertama (biasanya REG)
    const cost = result.costs[0];
    const price = parseInt(cost.value || 0, 10);
    const etd = cost.etd || '';

    return { price, etd };

  } catch (error) {
    // Tangani semua error tanpa menampilkan ke user
    // Hanya log ke console untuk debugging
    console.warn('[RAJAONGKIR] Calculate cost error (silent):', error.message);
    return { price: 0, etd: '' };
  }
}

