/**
 * Users API Functions
 * Sesuai dokumentasi API backend
 */

import { api } from "./api";
import { API_ENDPOINTS } from "@/config/api";

/**
 * GET /api/admin/users
 * Tampil Data User
 * Response: { success: true, data: Array }
 * @returns {Promise<Array>} Array of users
 */
export async function getUsers() {
  const res = await api(API_ENDPOINTS.admin.users, { method: "GET" });
  // Handle response sesuai dokumentasi: { success: true, data: [...] }
  if (res.success && Array.isArray(res.data)) {
    return res.data;
  }
  // Fallback untuk kompatibilitas
  return res.data || res || [];
}

/**
 * POST /api/admin/users
 * Input Data User
 * Request: nama, email, tanggal_lahir (dd-mm-yyyy), tanggal_join (dd-mm-yyyy), 
 *          alamat, divisi (integer), level (integer), no_telp
 * @param {object} userData - User data sesuai requirement API
 * @returns {Promise<{success: boolean, data: object}>}
 */
export async function createUser(userData) {
  const res = await api(API_ENDPOINTS.admin.users, {
    method: "POST",
    body: JSON.stringify(userData),
  });

  return {
    success: res.success,
    message: res.message,
    data: res.data,
  };
}

/**
 * PUT /api/admin/users/{id}
 * Update User
 * Request: nama, email, tanggal_lahir (dd-mm-yyyy), tanggal_join (dd-mm-yyyy),
 *          alamat, divisi (integer), level (integer), no_telp
 * @param {number|string} id - User ID
 * @param {object} userData - Updated user data sesuai requirement API
 * @returns {Promise<{success: boolean, message: string, data: object}>}
 */
export async function updateUser(id, userData) {
  const res = await api(API_ENDPOINTS.admin.userById(id), {
    method: "PUT",
    body: JSON.stringify(userData),
  });

  return {
    success: res.success,
    message: res.message,
    data: res.data,
  };
}

/**
 * DELETE /api/admin/users/{id}
 * Delete User
 * @param {number|string} id - User ID
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteUser(id) {
  const res = await api(API_ENDPOINTS.admin.userById(id), {
    method: "DELETE",
  });

  return {
    success: res.success,
    message: res.message,
  };
}
