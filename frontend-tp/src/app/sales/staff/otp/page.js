"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/styles/sales/otp.css";
import { getCustomerSession, verifyCustomerOTP, resendCustomerOTP } from "@/lib/customerAuth";
import UpdateCustomerModal from "@/app/customer/dashboard/updateCustomer";

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
  const [showUpdateModal, setShowUpdateModal] = useState(false);
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
      console.error("[OTP] No user data, redirecting to login");
      router.replace("/customer");
      return;
    }
    
    // Cek apakah user sudah verifikasi
    const isVerified = session.user.verifikasi === 1 || session.user.verifikasi === "1";
    console.log("[OTP] User verification status:", isVerified);
    console.log("[OTP] User verifikasi value:", session.user.verifikasi);
    
    // Jika sudah verifikasi, langsung ke dashboard
    if (isVerified) {
      console.log("[OTP] User already verified, redirecting to dashboard");
      router.replace("/customer/dashboard");
      return;
    }
    
    setCustomerId(session.user.id);
    setWa(session.user.wa || session.user.phone);
    console.log("[OTP] Customer ID:", session.user.id);
    console.log("[OTP] WA:", session.user.wa || session.user.phone);
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
      console.log("[OTP] Verifying OTP...");
      const result = await verifyCustomerOTP(customerId, code);
      
      if (result.success) {
        setMessage("Verifikasi berhasil!");
        setTimerActive(false);
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
          console.log("[OTP] User data updated with verification:", updatedUser);
        } else if (session.user) {
          // Fallback jika tidak ada data dari response
          session.user.verifikasi = 1;
          localStorage.setItem("customer_user", JSON.stringify(session.user));
          console.log("[OTP] User data updated (fallback):", session.user);
        }
        
        // Tampilkan modal updateCustomer setelah verifikasi berhasil
        setShowUpdateModal(true);
      } else {
        setMessage(result.message || "Kode OTP salah atau sudah kadaluarsa.");
      }
    } catch (error) {
      console.error("[OTP] Error:", error);
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
      console.log("[OTP] Resending OTP...");
      const result = await resendCustomerOTP(customerId, wa);
      
      if (result.success) {
        setMessage("Kode OTP baru telah dikirim ke WhatsApp Anda!");
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
      console.error("[OTP] Error resending:", error);
      setMessage("Terjadi kesalahan saat mengirim ulang OTP.");
    } finally {
      setResending(false);
    }
  };

  const handleUpdateCustomerSuccess = () => {
    // Setelah update customer berhasil, redirect ke dashboard
    setTimeout(() => {
      router.replace("/customer/dashboard");
    }, 500);
  };

  return (
    <>
      <div className="otp-container">
        <div className="otp-box">
          <h1 className="otp-title">Verifikasi OTP</h1>
          <p className="otp-desc">
            Masukkan 6 digit kode OTP yang telah dikirim ke WhatsApp atau email kamu.
            <br />
            <span style={{ fontSize: "0.85rem", color: "#ef4444", marginTop: "0.5rem", display: "block" }}>
              OTP berlaku selama 5 menit {timeLeft > 0 ? `(tersisa ${formatTimeLeft()})` : "(kedaluwarsa)"}
            </span>
          </p>

          <form onSubmit={handleSubmit} className="otp-form">
            <div className="otp-input-group">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(e, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                  ref={(el) => (inputs.current[i] = el)}
                  className="otp-input"
                />
              ))}
            </div>

            {message && <p className="otp-message">{message}</p>}

            <button type="submit" className="otp-btn" disabled={loading}>
              {loading ? "Memverifikasi..." : "Verifikasi"}
            </button>

            {/* 🔸 Kirim ulang kode bukan button lagi */}
            <p 
              className="otp-resend" 
              onClick={handleResend}
              style={{
                cursor: resending ? "not-allowed" : "pointer",
                opacity: resending ? 0.6 : 1,
              }}
            >
              {resending ? "Mengirim ulang..." : "Kirim ulang kode OTP"}
            </p>
          </form>
        </div>
      </div>

      {/* Modal Update Customer */}
      {showUpdateModal && (
        <UpdateCustomerModal
          isOpen={showUpdateModal}
          onClose={() => {
            // Jangan tutup modal, harus lengkapi data dulu
          }}
          onSuccess={handleUpdateCustomerSuccess}
          title="Lengkapi Data Customer"
        />
      )}
    </>
  );
}
