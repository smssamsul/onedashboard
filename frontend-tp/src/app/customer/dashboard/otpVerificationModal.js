"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function OTPVerificationModal({ customerInfo, onClose, onOTPSent, allowClose = true }) {
  const router = useRouter();
  const [sendingOTP, setSendingOTP] = useState(false);

  const handleSendOTP = async () => {
    if (!customerInfo) {
      toast.error("Data customer tidak ditemukan");
      return;
    }

    if (!customerInfo.wa) {
      toast.error("Nomor WhatsApp tidak ditemukan");
      return;
    }

    const token = localStorage.getItem("customer_token");
    if (!token) {
      toast.error("Token tidak ditemukan. Silakan login ulang.");
      return;
    }

    setSendingOTP(true);

    try {
      // Format nomor WA (pastikan format 62xxxxxxxxxx)
      let waNumber = customerInfo.wa.trim();
      if (waNumber.startsWith("0")) {
        waNumber = "62" + waNumber.substring(1);
      } else if (!waNumber.startsWith("62")) {
        waNumber = "62" + waNumber;
      }

      const payload = {
        customer_id: customerInfo.id || customerInfo.customer_id,
        wa: waNumber,
      };

      console.log("🟢 [SEND_OTP] Sending OTP request:", payload);

      const response = await fetch("/api/customer/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      console.log("🟢 [SEND_OTP] Response:", data);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Gagal mengirim OTP");
      }

      if (data?.success) {
        toast.success(data?.message || "OTP berhasil dikirim ke WhatsApp Anda");
        // Panggil callback onOTPSent untuk handle alur selanjutnya (updateCustomer modal)
        if (onOTPSent) {
          onOTPSent(data);
        }
        // Jangan langsung redirect, biarkan dashboard yang handle alurnya
        // Redirect akan dilakukan setelah updateCustomer modal selesai
      } else {
        throw new Error(data?.message || "Gagal mengirim OTP");
      }
    } catch (error) {
      console.error("❌ [SEND_OTP] Error:", error);
      toast.error(error.message || "Gagal mengirim OTP. Coba lagi nanti.");
    } finally {
      setSendingOTP(false);
    }
  };

  return (
    <div 
      className="modal-overlay" 
      onClick={allowClose && onClose ? onClose : undefined}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <h2>Verifikasi OTP</h2>
          {allowClose && onClose && (
            <button className="modal-close" onClick={onClose}>
              ✕
            </button>
          )}
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ color: "#374151", lineHeight: "1.6", marginBottom: "1rem" }}>
              Untuk keamanan akun Anda, kami perlu memverifikasi nomor WhatsApp Anda.
            </p>
            <div
              style={{
                backgroundColor: "#EFF6FF",
                border: "1px solid #3B82F6",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: 0, color: "#1E40AF", fontSize: "0.875rem", lineHeight: "1.5" }}>
                <strong>Nomor WhatsApp:</strong> {customerInfo?.wa || "-"}
              </p>
              {customerInfo?.id && (
                <p style={{ margin: "0.5rem 0 0 0", color: "#1E40AF", fontSize: "0.875rem", lineHeight: "1.5" }}>
                  <strong>Customer ID:</strong> {customerInfo.id}
                </p>
              )}
            </div>
            <p style={{ color: "#6B7280", fontSize: "0.875rem", lineHeight: "1.5" }}>
              Klik tombol di bawah untuk mengirim kode OTP ke nomor WhatsApp Anda.
            </p>
          </div>
        </div>

        <div className="modal-footer" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-save"
            onClick={handleSendOTP}
            disabled={sendingOTP}
            style={{
              opacity: sendingOTP ? 0.6 : 1,
              cursor: sendingOTP ? "not-allowed" : "pointer",
            }}
          >
            {sendingOTP ? "Mengirim..." : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

