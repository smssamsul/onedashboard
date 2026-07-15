import { api } from "../api";

/* ======================
   🧾 FINANCE ORDER VALIDATION MODULE
====================== */

/** 📊 GET Order Statistics (Finance) */
export async function getOrderStatistics() {
  try {
    const res = await api("/finance/order-validation/statistics", { method: "GET" });
    if (res.success && res.data) {
      return res.data;
    }
    return null;
  } catch (error) {
    console.error("❌ getOrderStatistics() - Error:", error);
    return null;
  }
}

/** 📘 GET Semua Order (Finance) */
export async function getOrders(page = 1, per_page = 15) {
  try {
    // Build query string for pagination
    const queryParams = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
    });
    
    const res = await api(`/finance/order-validation?${queryParams.toString()}`, { method: "GET" });
    
    // Logging struktur JSON lengkap sesuai requirement
    console.log("📦 getOrders() - Success:", res.success);
    console.log("📦 getOrders() - Response:", res);
    
    // Handle pagination response format (Laravel pagination)
    if (res.success === true && res.data) {
      // Check if res.data itself has pagination structure (nested)
      if (res.data.data && Array.isArray(res.data.data)) {
        // Format: { success: true, data: { data: [...], current_page, last_page, total, per_page } }
        return {
          data: res.data.data,
          current_page: res.data.current_page || page,
          last_page: res.data.last_page || 1,
          total: res.data.total || 0,
          per_page: res.data.per_page || per_page,
        };
      }
      
      // Check if response has pagination metadata at root level
      if (res.current_page !== undefined || res.last_page !== undefined) {
        // Format: { success: true, data: [...], current_page, last_page, total, per_page }
        return {
          data: Array.isArray(res.data) ? res.data : [res.data],
          current_page: res.current_page || page,
          last_page: res.last_page || 1,
          total: res.total || 0,
          per_page: res.per_page || per_page,
        };
      }
      
      // Simple array response (no pagination metadata)
      return {
        data: Array.isArray(res.data) ? res.data : [res.data],
        current_page: page,
        last_page: 1,
        total: Array.isArray(res.data) ? res.data.length : 1,
        per_page: per_page,
      };
    }
    
    // If response is already an array (legacy format)
    if (Array.isArray(res)) {
      return {
        data: res,
        current_page: page,
        last_page: 1,
        total: res.length,
        per_page: per_page,
      };
    }
    
    // Fallback: return empty
    console.warn("⚠️ getOrders() - Unexpected response format:", res);
    return {
      data: [],
      current_page: page,
      last_page: 1,
      total: 0,
      per_page: per_page,
    };
  } catch (error) {
    console.error("❌ getOrders() - Error:", error);
    return {
      data: [],
      current_page: page,
      last_page: 1,
      total: 0,
      per_page: per_page,
    };
  }
}

/** 📘 GET Order by ID (Finance) */
export async function getOrderById(id) {
  const res = await api(`/finance/order-validation/${id}`, { method: "GET" });
  return res.data?.[0] || null;
}

/** 🟢 POST Approve Order (Finance) */
export async function approveOrder(id, data = {}) {
  const res = await api(`/finance/order-validation/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  return {
    success: res.success !== false,
    message: res.message || "Order berhasil diapprove",
    data: res.data,
  };
}

/** 🔴 POST Reject Order (Finance) */
export async function rejectOrder(id, { catatan }) {
  const res = await api(`/finance/order-validation/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ catatan }),
  });
  return {
    success: res.success !== false,
    message: res.message || "Order berhasil ditolak",
    data: res.data,
  };
}
