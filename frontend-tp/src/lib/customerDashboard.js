import { toast } from "react-hot-toast";

// Gunakan proxy Next.js untuk mencegah masalah CORS
const BASE_URL = "/api/customer";

function buildUrl(endpoint) {
  if (endpoint.startsWith("http")) return endpoint;
  return `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export async function fetchCustomerDashboard(tokenFromCaller) {
  const token = tokenFromCaller || localStorage.getItem("customer_token");

  if (!token) {
    const message = "Token tidak ditemukan. Silakan login kembali.";
    toast.error(message);
    throw new Error(message);
  }

  const url = buildUrl("/dashboard");

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("❌ [CUSTOMER_DASHBOARD] Failed to parse JSON:", parseError);
    }

    if (!response.ok || data?.success !== true) {
      // Jangan throw error fatal untuk dashboard, mungkin user baru
      console.warn("⚠️ [CUSTOMER_DASHBOARD] Dashboard data fetch warning:", data?.message);
    }

    return data?.data || {};
  } catch (error) {
    console.error("❌ [CUSTOMER_DASHBOARD] Error:", error);
    throw error;
  }
}

// Function baru untuk fetch profile specific (Status Verifikasi lebih akurat)
export async function fetchCustomerProfile(tokenFromCaller) {
  const token = tokenFromCaller || localStorage.getItem("customer_token");

  if (!token) return null;

  const url = buildUrl("/customer"); // /api/customer/customer

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data?.data || null;
  } catch (error) {
    console.error("❌ [CUSTOMER_PROFILE] Error:", error);
    return null;
  }
}
