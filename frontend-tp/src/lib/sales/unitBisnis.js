/**
 * Unit Bisnis API Functions
 * Sama polanya dengan lib/sales/kategori.js
 */

import { api } from "../api";
import { API_ENDPOINTS } from "@/config/api";

export async function getUnitBisnis() {
  const res = await api(API_ENDPOINTS.sales.unitBisnis, { method: "GET" });
  return Array.isArray(res.data) ? res.data : [];
}

export async function addUnitBisnis(nama) {
  const res = await api(API_ENDPOINTS.sales.unitBisnis, {
    method: "POST",
    body: JSON.stringify({ nama }),
  });

  return res.success ? res.data : null;
}

export async function updateUnitBisnis(id, nama) {
  const res = await api(API_ENDPOINTS.sales.unitBisnisById(id), {
    method: "PUT",
    body: JSON.stringify({ nama }),
  });

  return res.success ? res.data : null;
}

export async function deleteUnitBisnis(id) {
  const res = await api(API_ENDPOINTS.sales.unitBisnisById(id), {
    method: "DELETE",
  });

  return res.success;
}
