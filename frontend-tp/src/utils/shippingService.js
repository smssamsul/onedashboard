/**
 * Shipping Service - Helper functions untuk API calls
 */

/**
 * Get provinces
 * @returns {Promise<Array>} Array of province objects { id, name }
 */
export async function getProvinces() {
  try {
    const response = await fetch('https://app.ternakproperti.com/api/shipping/provinces');

    if (!response || !response.ok) {
      return [];
    }

    const json = await response.json();

    if (!json || !json.success) {
      return [];
    }

    return Array.isArray(json.data) ? json.data : [];
  } catch (error) {
    console.error('[SHIPPING_SERVICE] getProvinces error:', error);
    return [];
  }
}

/**
 * Get cities by province ID
 * @param {number|string} provinceId - Province ID
 * @returns {Promise<Array>} Array of city objects { id, name, province_id }
 */
export async function getCities(provinceId) {
  try {
    if (!provinceId) {
      return [];
    }

    const response = await fetch(`https://app.ternakproperti.com/api/shipping/cities?province_id=${encodeURIComponent(provinceId)}`);

    if (!response || !response.ok) {
      return [];
    }

    const json = await response.json();

    if (!json || !json.success) {
      return [];
    }

    return Array.isArray(json.data) ? json.data : [];
  } catch (error) {
    console.error('[SHIPPING_SERVICE] getCities error:', error);
    return [];
  }
}

/**
 * Get districts by city ID
 * @param {number|string} cityId - City ID
 * @returns {Promise<Array>} Array of district objects { id, district_id, name, city_id }
 */
export async function getDistricts(cityId) {
  try {
    if (!cityId) {
      return [];
    }

    const response = await fetch(`https://app.ternakproperti.com/api/shipping/districts?city_id=${encodeURIComponent(cityId)}`);

    if (!response || !response.ok) {
      return [];
    }

    const json = await response.json();

    if (!json || !json.success) {
      return [];
    }

    return Array.isArray(json.data) ? json.data : [];
  } catch (error) {
    console.error('[SHIPPING_SERVICE] getDistricts error:', error);
    return [];
  }
}

/**
 * Hitung ongkir domestic
 * @param {Object} params
 * @param {number} params.origin - Origin district ID
 * @param {number} params.destination - Destination district ID
 * @param {number} params.weight - Berat dalam gram
 * @param {string} params.courier - Courier code (single courier: "jne", "sicepat", etc)
 * @param {number} params.province_id - Province ID (optional but may be required by API)
 * @returns {Promise<Array>} Array of shipping cost objects { courier, service, description, etd, cost }
 */
export async function calculateDomesticCost({
  origin,
  destination,
  weight,
  courier,
  province_id,
  destination_search,
  destination_postal_code,
  destination_area_id,
  item_value,
}) {
  try {
    if (!weight || !courier) {
      return [];
    }

    const response = await fetch('https://app.ternakproperti.com/api/shipping/calculate-domestic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        origin,
        destination,
        weight,
        courier,
        province_id,
        destination_search,
        destination_postal_code,
        destination_area_id,
        item_value,
      })
    });

    if (!response || !response.ok) {
      return [];
    }

    const json = await response.json();

    if (!json || !json.success) {
      return [];
    }

    return Array.isArray(json.data) ? json.data : [];
  } catch (error) {
    console.error('[SHIPPING_SERVICE] calculateDomesticCost error:', error);
    return [];
  }
}
