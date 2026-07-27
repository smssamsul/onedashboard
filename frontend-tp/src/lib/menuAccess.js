/**
 * Menu Access API Functions
 * Manajemen menu master + matrix hak akses per departemen & jabatan
 */

import { api } from "./api";
import { API_ENDPOINTS } from "@/config/api";

/**
 * GET /api/hr/departemen
 * @returns {Promise<Array>}
 */
export async function getDepartemenList() {
  const res = await api(API_ENDPOINTS.admin.departemen, { method: "GET" });
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  return res.data || res || [];
}

/**
 * GET /api/admin/jabatan
 * @returns {Promise<Array>}
 */
export async function getJabatanList() {
  const res = await api(API_ENDPOINTS.admin.jabatan, { method: "GET" });
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  return res.data || res || [];
}

/**
 * GET /api/admin/menu
 * @param {object} params - optional { departemen_id, search }
 * @returns {Promise<Array>}
 */
export async function getMenuList(params = {}) {
  const query = new URLSearchParams(params).toString();
  const endpoint = query ? `${API_ENDPOINTS.admin.menu}?${query}` : API_ENDPOINTS.admin.menu;
  const res = await api(endpoint, { method: "GET" });
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  return res.data || res || [];
}

/**
 * POST /api/admin/menu
 * @param {object} menuData
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function createMenu(menuData) {
  const res = await api(API_ENDPOINTS.admin.menu, {
    method: "POST",
    body: JSON.stringify(menuData),
  });

  return {
    success: res.success,
    message: res.message,
    data: res.data,
    errors: res.errors,
  };
}

/**
 * PUT /api/admin/menu/{id}
 * @param {number|string} id
 * @param {object} menuData
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function updateMenu(id, menuData) {
  const res = await api(API_ENDPOINTS.admin.menuById(id), {
    method: "PUT",
    body: JSON.stringify(menuData),
  });

  return {
    success: res.success,
    message: res.message,
    data: res.data,
    errors: res.errors,
  };
}

/**
 * DELETE /api/admin/menu/{id}
 * @param {number|string} id
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteMenu(id) {
  const res = await api(API_ENDPOINTS.admin.menuById(id), {
    method: "DELETE",
  });

  return {
    success: res.success,
    message: res.message,
  };
}

/**
 * GET /api/admin/menu-akses?departemen_id=&jabatan_id=
 * @param {number|string} departemenId
 * @param {number|string} jabatanId
 * @returns {Promise<Array>} daftar menu + flag granted
 */
export async function getMenuAkses(departemenId, jabatanId) {
  const query = new URLSearchParams({
    departemen_id: departemenId,
    jabatan_id: jabatanId,
  }).toString();
  const res = await api(`${API_ENDPOINTS.admin.menuAkses}?${query}`, { method: "GET" });
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  return res.data || res || [];
}

/**
 * POST /api/admin/menu-akses/save
 * @param {{departemen_id: number|string, jabatan_id: number|string, menu_ids: Array<number>}} payload
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function saveMenuAkses(payload) {
  const res = await api(API_ENDPOINTS.admin.menuAksesSave, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    success: res.success,
    message: res.message,
    errors: res.errors,
  };
}

/**
 * GET /api/me/menu-access
 * @returns {Promise<Array>}
 */
export async function getMyMenuAccess() {
  const res = await api(API_ENDPOINTS.me.menuAccess, { method: "GET" });
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  return res.data || res || [];
}
