/**
 * Shipping API Helper - Frontend Helper (Menggunakan Backend API Routes)
 * 
 * Frontend tidak bisa langsung akses Komerce API karena CORS dan pembatasan API Key.
 * Jadi menggunakan Next.js API routes sebagai backend proxy.
 * 
 * Backend API Routes:
 * - GET /api/shipping/search?search=... (untuk search destination)
 * - GET /api/shipping/calculate?shipper_destination_id=...&receiver_destination_id=...&weight=...&item_value=...&cod=... (untuk hitung ongkir)
 */

/**
 * Search destination via backend API route
 * @param {string} search - Search keyword (bisa mulai dari 1 huruf, tidak akan error jika kosong)
 * @returns {Promise<Array>} Array of destination objects
 */
export async function searchDestinations(search = '') {
  try {
    // Jika search kosong, return empty array (tidak error)
    if (!search || search.trim().length === 0) {
      return [];
    }

    // Fetch via backend API route (mengatasi CORS)
    const url = `/api/shipping/search?search=${encodeURIComponent(search.trim())}`;
    const response = await fetch(url);

    // Tangani response kosong atau error HTTP
    if (!response || !response.ok) {
      // Silent error untuk HTTP error - tidak log karena bisa spam console
      return [];
    }

    const json = await response.json();

    // Tangani response bukan JSON atau format tidak sesuai
    // Backend selalu return format: { success, message, data }
    if (!json || !json.success) {
      // Log error hanya jika bukan error yang umum (seperti "tidak ditemukan")
      if (json?.message && !json.message.includes('tidak ditemukan') && !json.message.includes('kosong')) {
        console.warn('[SHIPPING] Search warning:', json?.message);
      }
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
  cod = 0,
  courier = 'jne'
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
    params.append('courier', String(courier));

    // Fetch via backend API route (mengatasi CORS)
    const url = `/api/shipping/calculate?${params.toString()}`;
    const response = await fetch(url);

    // Tangani HTTP error (500/400/403)
    if (!response || !response.ok) {
      console.error('[SHIPPING] Calculate failed:', response?.status, response?.statusText);
      return { price: 0, etd: '', error: `HTTP ${response?.status}` };
    }

    const json = await response.json();

    // Tangani response bukan JSON atau format tidak sesuai
    // Backend selalu return format: { success, message, data }
    if (!json || !json.success) {
      console.error('[SHIPPING] Calculate error:', json?.message || 'Unknown error');
      return { price: json?.price || 0, etd: json?.etd || '', error: json?.message || 'Unknown error' };
    }

    // Return hasil ongkir
    // Backend return format: { success: true, price, etd, data: {...} }
    const price = json.price || json.data?.price || 0;
    const etd = json.etd || json.data?.etd || '';

    return { price, etd };

  } catch (error) {
    // Tangani semua error
    console.error('[SHIPPING] Calculate error:', error);
    return { price: 0, etd: '', error: error.message || 'Unknown error' };
  }
}
