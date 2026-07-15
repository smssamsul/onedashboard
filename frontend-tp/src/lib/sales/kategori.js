/**
 * Categories API Functions
 * Centralized functions untuk category management
 * Menggunakan API_ENDPOINTS untuk konsistensi
 */

import { api } from "../api";
import { API_ENDPOINTS } from "@/config/api";

/**
 * 📘 GET - Ambil semua kategori (Sales)
 * @returns {Promise<Array>} Array of categories
 */
export async function getKategori() {
  const res = await api(API_ENDPOINTS.sales.categories, { method: "GET" });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * 🟢 POST - Tambah kategori baru (Sales)
 * @param {string} nama - Category name
 * @returns {Promise<object|null>} Created category or null
 */
export async function addKategori(nama) {
  const res = await api(API_ENDPOINTS.sales.categories, {
    method: "POST",
    body: JSON.stringify({ nama }),
  });

  return res.success ? res.data : null;
}

/**
 * 🟡 PUT - Update kategori berdasarkan ID (Sales)
 * @param {number|string} id - Category ID
 * @param {string} nama - Updated category name
 * @returns {Promise<object|null>} Updated category or null
 */
export async function updateKategori(id, nama) {
  const res = await api(API_ENDPOINTS.sales.categoryById(id), {
    method: "PUT",
    body: JSON.stringify({ nama }),
  });

  return res.success ? res.data : null;
}

/**
 * 🔴 DELETE - Hapus kategori berdasarkan ID (Sales)
 * @param {number|string} id - Category ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteKategori(id) {
  const res = await api(API_ENDPOINTS.sales.categoryById(id), {
    method: "DELETE",
  });

  return res.success;
}
