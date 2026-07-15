import { toast } from "react-hot-toast";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api/customer";

function buildUrl(endpoint) {
  if (endpoint.startsWith("http")) return endpoint;
  return `${BASE_URL}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;
}

export async function submitCustomerProfile(payload) {
  const token = localStorage.getItem("customer_token");

  if (!token) {
    const message = "Token tidak ditemukan. Silakan login kembali.";
    toast.error(message);
    throw new Error(message);
  }

  const url = buildUrl("/customer");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    let data = null;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("❌ [CUSTOMER_PROFILE] Failed to parse JSON:", parseError);
      throw new Error("Respons server tidak valid.");
    }

    if (!response.ok || data?.success !== true) {
      const message = data?.message || "Gagal menyimpan data customer.";
      console.error("❌ [CUSTOMER_PROFILE] Request failed:", message);
      toast.error(message);
      throw new Error(message);
    }

    toast.success(data?.message || "Data customer berhasil disimpan.");
    return data;
  } catch (error) {
    console.error("❌ [CUSTOMER_PROFILE] Error:", error);
    const message = error?.message || "Gagal menyimpan data customer.";
    toast.error(message);
    throw new Error(message);
  }
}

