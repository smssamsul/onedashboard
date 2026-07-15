"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { loginCustomer } from "@/lib/customerAuth";
import "@/styles/sales/otp.css";

const OTP_VALID_DURATION = 5 * 60; // 5 menit

// ✅ FIX: Pisahkan komponen yang menggunakan useSearchParams untuk Suspense boundary
function VerifyOrderOTPPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_VALID_DURATION);
  const [timerActive, setTimerActive] = useState(true);
  const [orderData, setOrderData] = useState(null);
  const inputs = useRef([]);

  // ✅ Facebook Pixel: Subscribe event ketika user berada di halaman OTP verifikasi order
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fbq !== "function") {
      return;
    }
    try {
      window.fbq("track", "Subscribe");
      if (process.env.NODE_ENV === "development") {
        console.log("[FB PIXEL] Subscribe event triggered on verify-order page");
      }
    } catch (e) {
      console.error("[FB PIXEL] Error triggering Subscribe event:", e);
    }
  }, []);

  // Load order data dari localStorage
  useEffect(() => {
    const stored = localStorage.getItem("pending_order");
    if (!stored) {
      router.replace("/");
      return;
    }

    try {
      const data = JSON.parse(stored);
      setOrderData(data);
    } catch {
      router.replace("/");
    }
  }, [router]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive]);

  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = Math.floor(timeLeft % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const resetOtpTimer = () => {
    setTimeLeft(OTP_VALID_DURATION);
    setTimerActive(true);
  };

  const handleChange = (e, index) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value) {
      const newOtp = [...otp];
      newOtp[index] = value.slice(-1);
      setOtp(newOtp);
      if (index < 5) inputs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
      inputs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pastedData) {
      const newOtp = [...otp];
      pastedData.split("").forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      const lastIndex = Math.min(pastedData.length, 5);
      inputs.current[lastIndex]?.focus();
    }
  };

  // Verify OTP - WAJIB sebelum ke payment
  // Menggunakan route /api/otp/verify
  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");

    if (code.length < 6) {
      setMessage("Masukkan 6 digit kode OTP.");
      return;
    }

    if (!orderData?.customerId) {
      setMessage("Sesi telah berakhir. Silakan mulai ulang pemesanan.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Ambil token dari localStorage jika ada
      const token = localStorage.getItem("customer_token");

      // Menggunakan route /api/otp/verify (9.2 Verifikasi OTP Customer)
      const response = await fetch("/api/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_id: orderData.customerId,
          otp: code,
        }),
      });

      const result = await response.json();

      console.log("[VERIFY_ORDER] OTP Verify response:", result);

      if (result.success) {
        setMessage("Verifikasi berhasil!");
        setTimerActive(false);
        toast.success("OTP Verified!");

        // Ambil orderData dari localStorage untuk memastikan data masih ada
        // (karena state mungkin belum ter-update)
        const storedOrder = localStorage.getItem("pending_order");
        let currentOrderData = orderData;

        if (storedOrder) {
          try {
            currentOrderData = JSON.parse(storedOrder);
            console.log("[VERIFY_ORDER] Order data from localStorage:", currentOrderData);
          } catch (e) {
            console.error("[VERIFY_ORDER] Error parsing stored order:", e);
          }
        }

        // Log orderData untuk debug
        console.log("[VERIFY_ORDER] Order data before login:", currentOrderData);
        console.log("[VERIFY_ORDER] Email from order:", currentOrderData?.email);

        // Setelah verifikasi OTP berhasil, login otomatis dengan email dari form landing page
        // Password default dari backend: 123456
        if (currentOrderData?.email) {
          console.log("[VERIFY_ORDER] Attempting auto-login with email:", currentOrderData.email);

          // Login dengan password default dari backend: 123456
          const loginResult = await loginCustomer({
            email: currentOrderData.email,
            password: "123456", // Password default dari backend
          });

          console.log("[VERIFY_ORDER] Login result:", loginResult);

          if (loginResult.success) {
            console.log("[VERIFY_ORDER] Auto-login successful! Redirecting to dashboard...");
            toast.success("Login berhasil! Mengarahkan ke dashboard...");

            // Simpan data order ke localStorage dengan key yang persisten untuk payment page
            // Jangan hapus pending_order, tapi simpan juga ke customer_order_data untuk referensi
            if (currentOrderData) {
              // Simpan data order lengkap termasuk metode pembayaran dan order ID
              const orderDataForPayment = {
                orderId: currentOrderData.orderId,
                paymentMethod: currentOrderData.paymentMethod,
                productName: currentOrderData.productName,
                totalHarga: currentOrderData.totalHarga,
                nama: currentOrderData.nama,
                email: currentOrderData.email,
                wa: currentOrderData.wa,
                downPayment: currentOrderData.downPayment,
                customerId: currentOrderData.customerId,
                timestamp: Date.now(), // Untuk tracking kapan data disimpan
              };

              // Simpan ke localStorage dengan key yang tidak akan dihapus
              localStorage.setItem("customer_order_data", JSON.stringify(orderDataForPayment));
              console.log("[VERIFY_ORDER] Saved order data for payment:", orderDataForPayment);
            }

            // Jangan hapus pending_order dulu, biarkan tetap ada untuk fallback
            // localStorage.removeItem("pending_order");

            // Redirect ke halaman pembayaran (default landing dashboard)
            await new Promise((r) => setTimeout(r, 500));
            router.replace("/customer/dashboard/payment");
            return;
          } else {
            // Jika login gagal, tampilkan error dan tetap redirect ke payment
            console.error("[VERIFY_ORDER] Auto-login failed, falling back to payment page");
            toast.error("Login otomatis gagal. Silakan login manual di halaman customer.");

            // Fallback: redirect ke payment page seperti sebelumnya
            await new Promise((r) => setTimeout(r, 500));
            redirectToPayment(currentOrderData);
          }
        } else {
          // Jika tidak ada email, fallback ke payment page
          console.warn("[VERIFY_ORDER] No email found in order data, redirecting to payment");
          await new Promise((r) => setTimeout(r, 500));
          redirectToPayment(currentOrderData);
        }
      } else {
        setMessage(result.message || "Kode OTP salah atau sudah kadaluarsa.");
      }
    } catch (error) {
      console.error("[VERIFY_ORDER] OTP Verify error:", error);
      setMessage("Terjadi kesalahan saat memverifikasi OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Clear data dan redirect ke landing page
  const clearAndRedirect = (landingUrl) => {
    // Clear semua state
    setOtp(["", "", "", "", "", ""]);
    setMessage("");
    setLoading(false);
    setResending(false);
    setTimeLeft(OTP_VALID_DURATION);
    setTimerActive(false);
    setOrderData(null);

    // Clear localStorage
    localStorage.removeItem("pending_order");

    // Redirect ke landing page
    setTimeout(() => {
      router.replace(landingUrl);
    }, 500);
  };

  // Redirect ke payment sesuai metode
  const redirectToPayment = (orderDataParam = null) => {
    // Gunakan parameter jika ada, jika tidak gunakan state
    const dataToUse = orderDataParam || orderData;

    if (!dataToUse) {
      console.error("[VERIFY_ORDER] Order data tidak ditemukan untuk redirect");
      toast.error("Data order tidak ditemukan. Silakan coba lagi.");
      return;
    }

    const { paymentMethod, productName, totalHarga } = dataToUse;

    console.log("[VERIFY_ORDER] Redirecting to payment with method:", paymentMethod);

    // Hapus pending order dari localStorage setelah data sudah diambil
    localStorage.removeItem("pending_order");

    const method = String(paymentMethod || "manual").toLowerCase();

    switch (method) {
      case "ewallet":
        console.log("[VERIFY_ORDER] Calling Midtrans e-wallet");
        callMidtrans("ewallet", dataToUse);
        break;
      case "cc":
        console.log("[VERIFY_ORDER] Calling Midtrans credit card");
        callMidtrans("cc", dataToUse);
        break;
      case "va":
        console.log("[VERIFY_ORDER] Calling Midtrans virtual account");
        callMidtrans("va", dataToUse);
        break;
      case "manual":
      default:
        console.log("[VERIFY_ORDER] Redirecting to manual payment page");
        // Manual transfer - langsung redirect ke payment page
        const query = new URLSearchParams({
          product: productName || "",
          harga: totalHarga || "0",
          via: paymentMethod || "manual",
          sumber: dataToUse?.sumber || "website",
        });

        // Tambahkan down_payment dan order_id jika ada (untuk workshop)
        if (dataToUse?.downPayment) {
          query.append("down_payment", dataToUse.downPayment);
        }
        if (dataToUse?.orderId) {
          query.append("order_id", dataToUse.orderId);
        }

        router.push(`/payment?${query.toString()}`);

        // Redirect halaman verify-order kembali ke landing page dan kosongkan data
        const landingUrl = dataToUse?.landingUrl || "/";
        clearAndRedirect(landingUrl);
        break;
    }
  };

  // Call Midtrans API
  const callMidtrans = async (type, orderDataParam = null) => {
    // Gunakan parameter jika ada, jika tidak gunakan state
    const dataToUse = orderDataParam || orderData;

    if (!dataToUse) {
      console.error("[VERIFY_ORDER] Order data tidak ditemukan untuk Midtrans");
      toast.error("Data order tidak ditemukan. Silakan coba lagi.");
      return;
    }

    const { nama, email, totalHarga, productName, orderId } = dataToUse;
    const API_BASE = "/api";

    let endpoint = "";
    switch (type) {
      case "ewallet":
        endpoint = `${API_BASE}/midtrans/create-snap-ewallet`;
        break;
      case "cc":
        endpoint = `${API_BASE}/midtrans/create-snap-cc`;
        break;
      case "va":
        endpoint = `${API_BASE}/midtrans/create-snap-va`;
        break;
      default:
        console.error("[VERIFY_ORDER] Payment type tidak valid:", type);
        toast.error("Metode pembayaran tidak valid");
        return;
    }

    console.log("[VERIFY_ORDER] Calling Midtrans endpoint:", endpoint);
    console.log("[VERIFY_ORDER] Payload:", { name: nama, email, amount: totalHarga, product_name: productName, order_id: orderId });

    try {
      const payload = {
        name: nama,
        email: email,
        amount: totalHarga,
        product_name: productName,
        order_id: orderId,
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await response.json();
      console.log("[VERIFY_ORDER] Midtrans response:", json);

      // Sesuai dokumentasi: response harus memiliki success: true dan redirect_url
      if (json.success === true && json.redirect_url) {
        console.log("[VERIFY_ORDER] Opening Midtrans in new tab:", json.redirect_url);

        // Simpan snap_token dan order_id dari Midtrans jika ada
        if (json.snap_token) {
          sessionStorage.setItem("midtrans_snap_token", json.snap_token);
        }
        if (json.order_id) {
          sessionStorage.setItem("midtrans_order_id_midtrans", json.order_id);
        }
        if (orderId) {
          sessionStorage.setItem("midtrans_order_id", String(orderId));
        }

        // Buka Midtrans payment page di tab baru sesuai dokumentasi
        window.open(json.redirect_url, "_blank");

        // Redirect halaman verify-order kembali ke landing page dan kosongkan data
        const landingUrl = dataToUse?.landingUrl || "/";
        clearAndRedirect(landingUrl);
      } else {
        console.error("[VERIFY_ORDER] Midtrans tidak mengembalikan redirect_url atau success false:", json);
        toast.error(json.message || "Gagal membuat transaksi");
        // Jika gagal, redirect ke payment page manual
        const query = new URLSearchParams({
          product: productName || "",
          harga: totalHarga || "0",
        });
        router.push(`/payment?${query.toString()}`);
      }
    } catch (err) {
      console.error("[VERIFY_ORDER] Midtrans error:", err);
      toast.error("Terjadi kesalahan saat memproses pembayaran");
      // Jika error, redirect ke payment page manual
      const query = new URLSearchParams({
        product: productName || "",
        harga: totalHarga || "0",
      });
      router.push(`/payment?${query.toString()}`);
    }
  };

  // Resend OTP
  // Menggunakan route /api/otp/resend (9.3 Re-send OTP Customer)
  const handleResend = async () => {
    if (!orderData?.customerId || !orderData?.wa) {
      setMessage("Sesi telah berakhir. Silakan mulai ulang pemesanan.");
      return;
    }

    setResending(true);
    setMessage("");

    try {
      // Ambil token dari localStorage jika ada
      const token = localStorage.getItem("customer_token");

      // Menggunakan route /api/otp/resend
      const response = await fetch("/api/otp/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_id: orderData.customerId,
          wa: orderData.wa,
        }),
      });

      const result = await response.json();

      console.log("[VERIFY_ORDER] OTP Resend response:", result);

      if (result.success) {
        setMessage("Kode OTP baru telah dikirim ke WhatsApp Anda!");
        setOtp(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
        resetOtpTimer();
        toast.success("OTP terkirim!");
      } else {
        setMessage(result.message || "Gagal mengirim ulang OTP.");
      }
    } catch (error) {
      console.error("[VERIFY_ORDER] OTP Resend error:", error);
      setMessage("Terjadi kesalahan saat mengirim ulang OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="verify-page-wrapper">
      <div className="verify-card">
        {/* Header */}
        <div className="verify-header">
          <img src="/assets/logo.png" alt="Logo" className="brand-logo" />
          <h1>Verifikasi Pesanan</h1>
          <p className="subtitle">
            Masukkan 6 digit kode yang dikirim ke WhatsApp
            {orderData?.wa && (
              <span className="phone-number">
                {orderData.wa.replace(/(\d{2})(\d{3})(\d{4})(\d+)/, "+$1 $2-$3-$4")}
              </span>
            )}
          </p>
        </div>

        {/* Product Summary */}
        {orderData?.productName && (
          <div className="order-summary">
            <div className="summary-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div className="summary-details">
              <div className="product-name">{orderData.productName}</div>
              {orderData.totalHarga && (
                <div className="product-price">
                  Rp {Number(orderData.totalHarga).toLocaleString("id-ID")}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="verify-form">
          <div className="otp-input-container" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(e, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                ref={(el) => (inputs.current[i] = el)}
                className={`otp-digit ${digit ? "filled" : ""}`}
                autoComplete="one-time-code"
                placeholder="-"
              />
            ))}
          </div>

          <div className="timer-section">
            <div className={`status-indicator ${timeLeft > 0 ? 'active' : 'expired'}`}></div>
            <span className="timer-text">
              {timeLeft > 0 ? (
                <>Kode berlaku selama <strong>{formatTimeLeft()}</strong></>
              ) : (
                "Kode telah kedaluwarsa"
              )}
            </span>
          </div>

          {message && (
            <div className={`message-alert ${message.includes("berhasil") ? "success" : "error"}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            className="verify-button"
            disabled={loading || timeLeft === 0}
          >
            {loading ? (
              <span className="loading-state">
                <span className="spinner"></span> Memverifikasi...
              </span>
            ) : "Verifikasi & Bayar"}
          </button>

          <button
            type="button"
            className="resend-link"
            onClick={!resending ? handleResend : undefined}
            disabled={resending || timerActive}
          >
            {resending ? "Mengirim ulang..." : "Kirim ulang kode OTP"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .verify-page-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f8fafc;
          padding: 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .verify-card {
          background: white;
          width: 100%;
          max-width: 420px;
          padding: 40px;
          border-radius: 24px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }

        .verify-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .brand-logo {
          height: 40px;
          margin-bottom: 24px;
          object-fit: contain;
        }

        .verify-header h1 {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 12px 0;
          letter-spacing: -0.5px;
        }

        .subtitle {
          font-size: 14px;
          line-height: 1.6;
          color: #64748b;
          margin: 0;
        }

        .phone-number {
          display: block;
          font-weight: 600;
          color: #0f172a;
          margin-top: 4px;
        }

        .order-summary {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .summary-icon {
          width: 40px;
          height: 40px;
          background: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #f59e0b;
          border: 1px solid #f1f5f9;
          flex-shrink: 0;
        }

        .summary-details {
          flex: 1;
          overflow: hidden;
        }

        .product-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .product-price {
          font-size: 13px;
          color: #64748b;
          font-family: monospace; 
          font-weight: 600;
        }

        .otp-input-container {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-bottom: 24px;
        }

        .otp-digit {
          width: 48px;
          height: 56px;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 24px;
          font-weight: 600;
          text-align: center;
          color: #0f172a;
          background: white;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          outline: none;
        }

        .otp-digit:focus {
          border-color: #f59e0b;
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15);
          transform: translateY(-2px);
        }

        .otp-digit.filled {
          background-color: #fffbeb;
          border-color: #fcd34d;
        }

        .otp-digit::placeholder {
          color: #cbd5e1;
          font-weight: 400;
        }

        .timer-section {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 24px;
          font-size: 13px;
          color: #64748b;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #cbd5e1;
        }

        .status-indicator.active {
          background-color: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
        }

        .status-indicator.expired {
          background-color: #ef4444;
        }

        .timer-text strong {
          color: #0f172a;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }

        .message-alert {
          padding: 12px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
          margin-bottom: 24px;
        }

        .message-alert.success {
          background-color: #f0fdf4;
          color: #16a34a;
          border: 1px solid #bbf7d0;
        }

        .message-alert.error {
          background-color: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .verify-button {
          width: 100%;
          padding: 16px;
          background: linear-gradient(to bottom, #f59e0b, #d97706);
          color: white;
          border: none;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.3);
          position: relative;
          overflow: hidden;
        }

        .verify-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 12px -1px rgba(217, 119, 6, 0.4);
        }

        .verify-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .verify-button:disabled {
          background: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }

        .loading-state {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2.5px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .resend-link {
          display: block;
          width: 100%;
          text-align: center;
          margin-top: 20px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s;
        }

        .resend-link:hover:not(:disabled) {
          color: #f59e0b;
        }

        .resend-link:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Mobile Optimization */
        @media (max-width: 480px) {
          .verify-card {
            padding: 24px;
            max-width: 100%;
          }
          
          .verify-header h1 {
            font-size: 20px;
          }
          
          .otp-digit {
            width: 40px;
            height: 48px;
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}

// ✅ FIX: Wrap dengan Suspense untuk useSearchParams (Next.js requirement)
export default function VerifyOrderOTPPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <p>Loading...</p>
      </div>
    }>
      <VerifyOrderOTPPageContent />
    </Suspense>
  );
}
