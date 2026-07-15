"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import "@/styles/sales/otp.css";
import { getCustomerSession } from "@/lib/customerAuth";

const OTP_VALID_DURATION = 5 * 60; // 5 minutes in seconds

export default function CustomerOTPPage() {
  const router = useRouter();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  const [wa, setWa] = useState(null);
  const [timeLeft, setTimeLeft] = useState(OTP_VALID_DURATION);
  const [timerActive, setTimerActive] = useState(true);
  const inputs = useRef([]);

  const resetOtpTimer = () => {
    setTimeLeft(OTP_VALID_DURATION);
    setTimerActive(true);
  };

  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(timeLeft % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  useEffect(() => {
    const session = getCustomerSession();
    if (!session.user || !session.user.id) {
      console.error("❌ [OTP] No user data, redirecting to login");
      router.replace("/customer");
      return;
    }

    // Cek apakah user sudah verifikasi
    const isVerified = session.user.verifikasi === 1 || session.user.verifikasi === "1";
    console.log("🔵 [OTP] User verification status:", isVerified);
    console.log("🔵 [OTP] User verifikasi value:", session.user.verifikasi);

    // Jika sudah verifikasi, langsung ke dashboard
    if (isVerified) {
      console.log("✅ [OTP] User already verified, redirecting to dashboard");
      router.replace("/customer/dashboard");
      return;
    }

    const customerIdValue = session.user.id;
    const waNumber = session.user.wa || session.user.phone;

    setCustomerId(customerIdValue);
    setWa(waNumber);
    console.log("🔵 [OTP] Customer ID:", customerIdValue);
    console.log("🔵 [OTP] WA:", waNumber);
    resetOtpTimer();
  }, [router]);

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

  useEffect(() => {
    if (timeLeft === 0) {
      setMessage((prev) => prev || "Kode OTP telah kedaluwarsa. Kirim ulang kode untuk melanjutkan.");
    }
  }, [timeLeft]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setMessage("Masukkan 6 digit kode OTP.");
      return;
    }

    if (!customerId) {
      setMessage("Data customer tidak ditemukan. Silakan login kembali.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      console.log("🔵 [OTP] Verifying OTP...");

      const token = localStorage.getItem("customer_token");
      const response = await fetch("/api/customer/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_id: customerId,
          otp: code,
        }),
      });

      const result = await response.json();
      console.log("[OTP] Verify response:", result);

      if (result.success) {
        setMessage("Verifikasi berhasil!");
        setTimerActive(false);
        toast.success("Verifikasi berhasil!");
        localStorage.setItem("customer_show_update_modal", "1");

        // Update user data di localStorage dengan data dari response API
        const session = getCustomerSession();
        if (session.user && result.data) {
          const updatedUser = {
            ...session.user,
            verifikasi: result.data.verifikasi || 1,
            nama: result.data.nama || session.user.nama,
            customer_id: result.data.customer_id || session.user.id || session.user.customer_id,
          };
          localStorage.setItem("customer_user", JSON.stringify(updatedUser));
          console.log("✅ [OTP] User data updated with verification:", updatedUser);
        } else if (session.user) {
          // Fallback jika tidak ada data dari response
          session.user.verifikasi = 1;
          localStorage.setItem("customer_user", JSON.stringify(session.user));
          console.log("✅ [OTP] User data updated (fallback):", session.user);
        }

        // Redirect ke dashboard setelah verifikasi berhasil
        setTimeout(() => {
          router.replace("/customer/dashboard");
        }, 500);
      } else {
        setMessage(result.message || "Kode OTP salah atau sudah kadaluarsa.");
      }
    } catch (error) {
      console.error("❌ [OTP] Error:", error);
      setMessage("Terjadi kesalahan saat memverifikasi OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!customerId || !wa) {
      setMessage("Data customer tidak ditemukan. Silakan login kembali.");
      return;
    }

    setResending(true);
    setMessage("");

    try {
      console.log("🔵 [OTP] Resending OTP...");

      // Format nomor WA (pastikan format 62xxxxxxxxxx)
      let waNumber = wa.trim();
      if (waNumber.startsWith("0")) {
        waNumber = "62" + waNumber.substring(1);
      } else if (!waNumber.startsWith("62")) {
        waNumber = "62" + waNumber;
      }

      const token = localStorage.getItem("customer_token");

      if (!token) {
        setMessage("Token tidak ditemukan. Silakan login kembali.");
        toast.error("Token tidak ditemukan. Silakan login kembali.");
        setResending(false);
        return;
      }

      const response = await fetch("/api/customer/otp/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_id: customerId,
          wa: waNumber,
        }),
      });

      const result = await response.json();
      console.log("[OTP] Resend response:", result);

      if (result.success) {
        setMessage("Kode OTP baru telah dikirim ke WhatsApp Anda!");
        toast.success("OTP terkirim!");
        // Reset OTP input
        setOtp(["", "", "", "", "", ""]);
        if (inputs.current[0]) {
          inputs.current[0].focus();
        }
        resetOtpTimer();
      } else {
        setMessage(result.message || "Gagal mengirim ulang OTP.");
      }
    } catch (error) {
      console.error("❌ [OTP] Error resending:", error);
      setMessage("Terjadi kesalahan saat mengirim ulang OTP.");
    } finally {
      setResending(false);
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

  return (
    <div className="verify-page-wrapper">
      <div className="verify-card">
        <div className="verify-header">
          <img src="/assets/logo.png" alt="Logo" className="brand-logo" />
          <h1>Verifikasi WhatsApp</h1>
          <p className="subtitle">
            Kami telah mengirimkan 6 digit kode ke WhatsApp
            {wa && (
              <span className="phone-number">
                {wa.replace(/(\d{2})(\d{3})(\d{4})(\d+)/, "+$1 $2-$3-$4")}
              </span>
            )}
          </p>
        </div>

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
            ) : "Verifikasi Sekarang"}
          </button>

          <button
            type="button"
            className="resend-link"
            onClick={!resending ? handleResend : undefined}
            disabled={resending || timerActive}
          >
            {resending ? "Mengirim ulang..." : "Kirim Ulang OTP"}
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
