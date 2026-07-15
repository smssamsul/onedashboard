// /lib/followup.js
import { api } from "@/lib/api";

const BASE = "/admin/template-follup";

// =============================
// 4.1 GET TEMPLATE LIST
// =============================
export async function getFollowupTemplates(produk_id) {
  if (!produk_id) {
    console.warn("⛔ produk_id tidak ada. GET followup dibatalkan.");
    return { success: true, data: [] };
  }

  try {
    return await api(BASE, {
      method: "POST",
      body: JSON.stringify({ produk_id }),
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("getFollowupTemplates error:", err);
    return { success: false, message: err.message || "Gagal memanggil API" };
  }
}

// =============================
// 4.2 CREATE TEMPLATE (POST /store)
// =============================
export async function createFollowupTemplate(payload) {
  /*
    payload wajib berisi:
    - nama
    - produk
    - text
    - type
    - event
    - status
  */

  try {
    return await api(`${BASE}/store`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("createFollowupTemplate error:", err);
    return { success: false, message: err.message || "Gagal membuat template follow up" };
  }
}
