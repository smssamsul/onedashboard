/**
 * RajaOngkir V2 Basic API - Frontend Helper (Menggunakan Backend API Routes)
 * 
 * Frontend tidak bisa langsung akses RajaOngkir karena CORS dan pembatasan API Key.
 * Jadi menggunakan Next.js API routes sebagai backend proxy.
 * 
 * Backend API Routes:
 * - GET /api/rajaongkir/cities?search=... (untuk search kota/subdistrict)
 * - POST /api/rajaongkir/cost (untuk hitung ongkir)
 */

/**
 * Search kota/subdistrict via backend API route
 * @param {string} query - Search query (bisa mulai dari 1 huruf)
 * @returns {Promise<Array>} Array of city/subdistrict objects
 */
export async function searchCities(query = '') {
  try {
    // Jika query kosong, return empty array
    if (!query || query.trim().length === 0) {
      return [];
    }

    // Fetch via backend API route (mengatasi CORS)
    const url = `/api/rajaongkir/cities?search=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    // Tangani response kosong atau error HTTP
    if (!response || !response.ok) {
      // Silent error - tidak tampilkan ke user, cukup return empty array
      console.warn('[RAJAONGKIR] Search cities failed:', response?.status);
      return [];
    }

    const json = await response.json();

    // Tangani response bukan JSON atau format tidak sesuai
    if (!json || !json.success) {
      // Silent error - tidak tampilkan ke user
      // Hanya log jika bukan error yang sudah diketahui (untuk menghindari spam log)
      if (json?.message && !json.message.includes('Format response tidak valid')) {
        console.warn('[RAJAONGKIR] Search cities error (silent):', json?.message);
      }
      return json?.data || []; // Return empty array jika ada error
    }

    // Return data kota/subdistrict
    return Array.isArray(json.data) ? json.data : [];

  } catch (error) {
    // Tangani semua error tanpa menampilkan ke user
    // Hanya log ke console untuk debugging
    console.warn('[RAJAONGKIR] Search cities error (silent):', error.message);
    return [];
  }
}

/**
 * Hitung ongkir via backend API route
 * @param {Object} params
 * @param {string} params.destination - City/Subdistrict ID tujuan
 * @param {number} params.weight - Berat dalam gram (default: 1000)
 * @param {string} params.courier - Kode kurir (jne, jnt, tiki, pos) - default: jne
 * @returns {Promise<{price: number, etd: string}>}
 */
export async function calculateCost({ destination, weight = 1000, courier = 'jne' }) {
  try {
    // Validasi input
    if (!destination) {
      console.warn('[RAJAONGKIR] Destination required');
      return { price: 0, etd: '' };
    }

    // Fetch via backend API route (mengatasi CORS)
    const response = await fetch('/api/rajaongkir/cost', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        destination: String(destination),
        weight: parseInt(weight, 10),
        courier: String(courier).toLowerCase(),
      }),
    });

    // Tangani HTTP error (500/400/403)
    if (!response || !response.ok) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Calculate cost failed:', response?.status);
      return { price: 0, etd: '' };
    }

    const json = await response.json();

    // Tangani response bukan JSON atau format tidak sesuai
    if (!json || !json.success) {
      // Silent error - tidak tampilkan ke user
      console.warn('[RAJAONGKIR] Calculate cost error (silent):', json?.message);
      return { price: json?.price || 0, etd: '' };
    }

    // Return hasil ongkir
    // Backend return format: { success: true, price, etd } atau { success: true, data: { price, etd } }
    const price = json.price || json.data?.price || 0;
    const etd = json.etd || json.data?.etd || '';

    return { price, etd };

  } catch (error) {
    // Tangani semua error tanpa menampilkan ke user
    // Hanya log ke console untuk debugging
    console.warn('[RAJAONGKIR] Calculate cost error (silent):', error.message);
    return { price: 0, etd: '' };
  }
}

