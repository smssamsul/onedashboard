import { api } from "../api";

/* ======================
   ✅ KEHADIRAN (ATTENDANCE) MODULE
====================== */

/** GET daftar kehadiran untuk satu produk (lintas semua sesi/jadwal produk itu) */
export async function getKehadiran(produkId) {
  try {
    const res = await api(`/sales/kehadiran?produk_id=${produkId}`, {
      method: "GET",
      disableToast: true,
    });
    return res.success === true && Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    console.error("❌ getKehadiran() - Error:", error);
    return [];
  }
}

/** POST tandai hadir manual (admin) */
export async function manualCheckin(jadwalId, customerId) {
  try {
    const res = await api("/sales/kehadiran", {
      method: "POST",
      body: JSON.stringify({ jadwal_id: jadwalId, customer_id: customerId }),
    });
    return res.success ? res.data : null;
  } catch (error) {
    console.error("❌ manualCheckin() - Error:", error);
    throw error;
  }
}

/** POST scan QR tiket kehadiran per-order (staff scan QR peserta) */
export async function scanQrCheckin(jadwalId, qrToken) {
  const res = await api("/sales/kehadiran/scan-qr", {
    method: "POST",
    body: JSON.stringify({ jadwal_id: jadwalId, qr_token: qrToken }),
    disableToast: true,
  });
  return res;
}

/** DELETE (batalkan) kehadiran (admin) */
export async function deleteKehadiran(id) {
  try {
    const res = await api(`/sales/kehadiran/${id}`, { method: "DELETE" });
    return res.success === true;
  } catch (error) {
    console.error("❌ deleteKehadiran() - Error:", error);
    throw error;
  }
}
