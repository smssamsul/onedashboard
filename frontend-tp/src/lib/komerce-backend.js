/**
 * Komerce RajaOngkir V2 API - Frontend Helper (Menggunakan Backend API Routes)
 * 
 * Frontend tidak bisa langsung akses Komerce API karena CORS dan pembatasan API Key.
 * Jadi menggunakan Next.js API routes sebagai backend proxy.
 * 
 * Backend API Routes:
 * - GET /api/rajaongkir/search?keyword=... (untuk search destination)
 * - GET /api/rajaongkir/cost?shipper_destination_id=...&receiver_destination_id=...&weight=...&item_value=...&cod=... (untuk hitung ongkir)
 */

/**
 * Search destination via backend API route
 * @param {string} keyword - Search keyword (bisa mulai dari 1 huruf)
 * @returns {Promise<Array>} Array of destination objects
 */
export async function searchDestinations(keyword = '') {
  try {
    // Jika keyword kosong, return empty array
    if (!keyword || keyword.trim().length === 0) {
      return [];
    }

    // Fetch via backend API route (mengatasi CORS)
    const url = `/api/rajaongkir/search?keyword=${encodeURIComponent(keyword.trim())}`;
    const response = await fetch(url);

    // Tangani response kosong atau error HTTP - silent
    if (!response || !response.ok) {
      // Silent error - tidak tampilkan ke user, cukup return empty array
      return [];
    }

    const json = await response.json();

    // Tangani response bukan JSON atau format tidak sesuai - silent
    if (!json || !json.success) {
      // Silent error - tidak tampilkan ke user
      return json?.data || [];
    }

    // Return data destination
    return Array.isArray(json.data) ? json.data : [];

  } catch (error) {
    // Tangani semua error tanpa menampilkan ke user
    // Silent error - return empty array
    return [];
  }
}

/**
 * Hitung ongkir via backend API route
 * @param {Object} params
 * @param {string} params.shipper_destination_id - ID origin (alamat pengirim)
 * @param {string} params.receiver_destination_id - ID destination (alamat penerima)
 * @param {number} params.weight - Berat dalam gram (default: 1000)
 * @param {number} params.item_value - Nilai barang dalam rupiah (default: 0)
 * @param {number} params.cod - COD amount dalam rupiah (default: 0)
 * @returns {Promise<{price: number, etd: string}>}
 */
export async function calculateCost({ 
  shipper_destination_id, 
  receiver_destination_id, 
  weight = 1000, 
  item_value = 0, 
  cod = 0 
}) {
  try {
    // Validasi input minimal
    if (!shipper_destination_id || !receiver_destination_id) {
      return { price: 0, etd: '' };
    }

    // Build query string
    const params = new URLSearchParams();
    params.append('shipper_destination_id', String(shipper_destination_id));
    params.append('receiver_destination_id', String(receiver_destination_id));
    params.append('weight', String(weight));
    params.append('item_value', String(item_value));
    params.append('cod', String(cod));

    // Fetch via backend API route (mengatasi CORS)
    const url = `/api/rajaongkir/cost?${params.toString()}`;
    const response = await fetch(url);

    // Tangani HTTP error (500/400/403) - silent
    if (!response || !response.ok) {
      // Silent error - tidak tampilkan ke user
      return { price: 0, etd: '' };
    }

    const json = await response.json();

    // Tangani response bukan JSON atau format tidak sesuai - silent
    if (!json || !json.success) {
      // Silent error - tidak tampilkan ke user
      return { price: json?.price || 0, etd: json?.etd || '' };
    }

    // Return hasil ongkir
    // Backend return format: { success: true, price, etd, data: {...} }
    const price = json.price || json.data?.price || 0;
    const etd = json.etd || json.data?.etd || '';

    return { price, etd };

  } catch (error) {
    // Tangani semua error tanpa menampilkan ke user
    // Silent error - return default values
    return { price: 0, etd: '' };
  }
}

