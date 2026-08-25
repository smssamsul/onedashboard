import { toast } from "react-hot-toast";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api/customer";

function buildUrl(endpoint) {
  if (endpoint.startsWith("http")) return endpoint;
  return `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

function handleUnauthorized() {
  localStorage.removeItem("customer_token");
  localStorage.removeItem("customer_user");
  toast.error("Sesi berakhir. Silakan login kembali.");
  window.location.href = "/customer";
}

export async function customerFetch(endpoint, options = {}) {
  const token = localStorage.getItem("customer_token");
  const url = buildUrl(endpoint);


  const headers = {
    Accept: "application/json",
    ...(options.body instanceof FormData
      ? {}
      : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  if (options.body && !(options.body instanceof FormData)) {
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    ...options,
    headers,
  });


  let data;
  try {
    data = await response.json();
  } catch (error) {
    console.error("❌ [CUSTOMER_FETCH] Failed to parse JSON:", error);
    data = null;
  }

  if (response.status === 401) {
    console.error("❌ [CUSTOMER_FETCH] Unauthorized (401)");
    handleUnauthorized();
    throw Object.assign(new Error("Unauthorized"), {
      status: 401,
      data,
    });
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Terjadi kesalahan (${response.status} ${response.statusText})`;
    console.error("❌ [CUSTOMER_FETCH] Response not ok:", message);
    console.error("❌ [CUSTOMER_FETCH] Error data:", data);
    throw Object.assign(new Error(message), {
      status: response.status,
      data,
    });
  }

  return data;
}

export async function loginCustomer(payload) {

  if (!payload?.email || !payload?.password) {
    console.error("❌ [LOGIN_CUSTOMER] Missing email or password");
    throw new Error("Email dan password wajib diisi.");
  }

  // Gunakan fetch langsung untuk handle 401 dengan lebih baik
  const url = buildUrl("/login");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });


    let data;
    try {
      data = await response.json();
    } catch (e) {
      console.error("❌ [LOGIN_CUSTOMER] Failed to parse JSON:", e);
      data = null;
    }

    // Tangani 401 Unauthorized dengan mengembalikan pesan yang jelas
    if (response.status === 401 || data?.message === "Unauthenticated.") {
      console.warn("⚠️ [LOGIN_CUSTOMER] Unauthorized (401) - invalid credentials");
      toast.error("Email atau password salah. Silakan periksa kembali.");
      return {
        success: false,
        message: "Email atau password salah. Silakan coba lagi.",
        needsVerification: false,
        user: null,
        token: null,
      };
    }

    // Handle success response (200 OK)
    if (response.ok) {
      // Simpan token jika ada (WAJIB untuk kirim OTP)
      if (data?.token) {
        localStorage.setItem("customer_token", data.token);
      } else {
        console.error("❌ [LOGIN_CUSTOMER] No token in response!");
      }

      // Simpan user data jika ada
      if (data?.user) {
        localStorage.setItem("customer_user", JSON.stringify(data.user));
      }

      // Cek apakah login berhasil (ada token dan success = true)
      if (data?.success === true && data?.token) {
        toast.success(data?.message || "Login berhasil.");

        // Cek apakah user sudah verifikasi (handle string "1", number 1, dan boolean true)
        const verifikasiValue = data?.user?.verifikasi;
        const isVerified = verifikasiValue === 1 || verifikasiValue === "1" || verifikasiValue === true;
        const needsVerification = !isVerified;


        return {
          success: true,
          message: data?.message || "Login berhasil.",
          user: data?.user,
          token: data?.token,
          needsVerification: needsVerification,
        };
      } else {
        // Response OK tapi tidak ada token atau success = false
        console.warn("⚠️ [LOGIN_CUSTOMER] Response OK but no token or success=false");
        console.warn("⚠️ [LOGIN_CUSTOMER] data.success:", data?.success);
        console.warn("⚠️ [LOGIN_CUSTOMER] data.token exists:", !!data?.token);

        const errorMessage = data?.message || "Email atau password salah.";
        toast.error(errorMessage);
        return {
          success: false,
          message: errorMessage,
        };
      }
    } else {
      // Response tidak OK (bukan 200)
      console.error("❌ [LOGIN_CUSTOMER] Response not OK:", response.status);
      const errorMessage = data?.message || "Email atau password salah.";
      toast.error(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    }
  } catch (error) {
    console.error("❌ [LOGIN_CUSTOMER] Error caught:", error);
    console.error("❌ [LOGIN_CUSTOMER] Error message:", error.message);

    toast.error(error.message || "Login gagal.");

    return {
      success: false,
      message: error.message || "Login gagal.",
    };
  }
}

export function getCustomerSession() {
  if (typeof window === "undefined") {
    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  const token = localStorage.getItem("customer_token");
  const raw = localStorage.getItem("customer_user");
  let user = null;

  if (raw) {
    try {
      user = JSON.parse(raw);
    } catch {
      user = null;
    }
  }

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
  };
}

// OTP Functions - Use Next.js proxy
const OTP_BASE_URL = "/api/customer";

export async function sendCustomerOTP(customerId, wa, tokenFromCaller) {
  const token = tokenFromCaller || localStorage.getItem("customer_token");

  if (!token) {
    const message = "Token tidak ditemukan. Silakan login kembali.";
    toast.error(message);
    return {
      success: false,
      message,
    };
  }

  try {
    const response = await fetch(`${OTP_BASE_URL}/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        customer_id: customerId,
        wa,
      }),
    });

    const data = await response.json();

    if (!response.ok || data?.success !== true) {
      const message =
        data?.message || "Gagal mengirim OTP. Silakan coba lagi.";
      toast.error(message);
      return {
        success: false,
        message,
        data,
      };
    }

    toast.success(data?.message || "OTP berhasil dikirim.");
    return data;
  } catch (error) {
    console.error("❌ [SEND_CUSTOMER_OTP] Error:", error);
    const message = error?.message || "Gagal mengirim OTP.";
    toast.error(message);
    return {
      success: false,
      message,
    };
  }
}



export async function verifyCustomerOTP(customerId, otp) {

  const token = localStorage.getItem("customer_token");

  try {
    const response = await fetch(`${OTP_BASE_URL}/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        customer_id: customerId,
        otp: otp,
      }),
    });

    const data = await response.json();

    if (response.ok && data?.success === true) {

      // Update user data dengan verifikasi = 1 dari response
      const currentUser = getCustomerSession().user;
      if (currentUser && data?.data) {
        const updatedUserData = {
          ...currentUser,
          verifikasi: data.data.verifikasi || 1,
          nama: data.data.nama || currentUser.nama,
          customer_id: data.data.customer_id || currentUser.id || currentUser.customer_id,
        };
        localStorage.setItem("customer_user", JSON.stringify(updatedUserData));
      }

      toast.success(data?.message || "OTP valid, akun telah diverifikasi");
      return {
        success: true,
        message: data?.message || "OTP valid, akun telah diverifikasi",
        data: data?.data,
      };
    } else {
      console.error("❌ [VERIFY_OTP] Failed:", data?.message);
      toast.error(data?.message || "Kode OTP salah atau sudah kadaluarsa");
      return {
        success: false,
        message: data?.message || "Kode OTP salah atau sudah kadaluarsa",
      };
    }
  } catch (error) {
    console.error("❌ [VERIFY_OTP] Error:", error);
    toast.error("Terjadi kesalahan saat memverifikasi OTP");
    return {
      success: false,
      message: error.message || "Terjadi kesalahan saat memverifikasi OTP",
    };
  }
}

export async function resendCustomerOTP(customerId, wa) {

  // Ambil token dari localStorage
  const token = localStorage.getItem("customer_token");

  if (!token) {
    console.error("❌ [RESEND_OTP] No token found");
    toast.error("Token tidak ditemukan. Silakan login kembali.");
    return {
      success: false,
      message: "Token tidak ditemukan. Silakan login kembali.",
    };
  }

  try {
    const response = await fetch(`${OTP_BASE_URL}/otp/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        customer_id: customerId,
        wa,
      }),
    });

    const data = await response.json();

    if (!response.ok || data?.success !== true) {
      const message = data?.message || "Gagal mengirim ulang OTP.";
      toast.error(message);
      return {
        success: false,
        message,
        data,
      };
    }

    toast.success(data?.message || "OTP berhasil dikirim ulang.");
    return data;
  } catch (error) {
    console.error("❌ [RESEND_OTP] Error:", error);
    const message = error?.message || "Gagal mengirim ulang OTP.";
    toast.error(message);
    return {
      success: false,
      message,
    };
  }
}

