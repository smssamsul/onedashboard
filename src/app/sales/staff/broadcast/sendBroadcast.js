"use client";

import { useState } from "react";
import "@/styles/sales/pesanan.css";
import "primeicons/primeicons.css";

export default function SendBroadcast({ broadcast, onClose, onSend }) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  // Parse target data
  let targetData = {};
  try {
    if (broadcast?.target) {
      targetData = typeof broadcast.target === "string" 
        ? JSON.parse(broadcast.target) 
        : broadcast.target;
    }
  } catch (e) {
    console.error("Error parsing target:", e);
  }

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      "1": "Draft",
      "2": "Terjadwal",
      "3": "Terkirim",
      "4": "Dibatalkan",
    };
    return statusMap[status?.trim()] || status || "-";
  };

  const handleSend = async () => {
    if (!broadcast?.id) return;

    setSending(true);
    setError("");

    try {
      if (onSend) {
        await onSend(broadcast.id);
        onClose();
      }
    } catch (err) {
      console.error("Error in send handler:", err);
      setError(err.message || "Terjadi kesalahan saat mengirim broadcast");
    } finally {
      setSending(false);
    }
  };

  if (!broadcast) return null;

  return (
    <div className="orders-modal-overlay" onClick={onClose}>
      <div className="orders-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px", maxHeight: "90vh" }}>
        <div className="orders-modal-header">
          <h2>Kirim Broadcast</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        <div className="orders-modal-body" style={{ overflowY: "auto", flex: 1 }}>
          {error && (
            <div className="dashboard-alert" style={{ marginBottom: "1rem" }}>
              {error}
            </div>
          )}

          <div className="orders-section">
            <h4>Informasi Broadcast</h4>
            <div className="orders-row">
              <p>Nama Broadcast</p>
              <strong>{broadcast.nama || "-"}</strong>
            </div>
            <div className="orders-row">
              <p>Pesan</p>
              <div style={{ maxWidth: "100%", wordBreak: "break-word" }}>
                <strong>{broadcast.pesan || "-"}</strong>
              </div>
            </div>
            <div className="orders-row">
              <p>Status</p>
              <strong>{getStatusLabel(broadcast.status)}</strong>
            </div>
            <div className="orders-row">
              <p>Tanggal Kirim</p>
              <strong>{formatDate(broadcast.tanggal_kirim)}</strong>
            </div>
            <div className="orders-row">
              <p>Dibuat</p>
              <strong>{formatDate(broadcast.create_at)}</strong>
            </div>
          </div>

          <div className="orders-section">
            <h4>Target Broadcast</h4>
            <div className="orders-row">
              <p>Produk</p>
              <strong>
                {targetData.produk && Array.isArray(targetData.produk)
                  ? targetData.produk.length > 0
                    ? targetData.produk.join(", ")
                    : "Semua Produk"
                  : targetData.produk
                  ? String(targetData.produk)
                  : "Semua Produk"}
              </strong>
            </div>
            {targetData.status_order && (
              <div className="orders-row">
                <p>Status Order</p>
                <strong>{targetData.status_order}</strong>
              </div>
            )}
            {targetData.status_pembayaran && (
              <div className="orders-row">
                <p>Status Pembayaran</p>
                <strong>{targetData.status_pembayaran}</strong>
              </div>
            )}
            <div className="orders-row">
              <p>Total Target</p>
              <strong>{broadcast.total_target || "0"} customer</strong>
            </div>
          </div>

          <div style={{ 
            marginTop: "1.5rem", 
            padding: "1rem", 
            background: "#f0f9ff", 
            borderRadius: "8px",
            border: "1px solid #bae6fd"
          }}>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "#0369a1" }}>
              <strong>Perhatian:</strong> Broadcast akan dikirim ke semua target customer yang sesuai dengan filter. Pastikan pesan sudah benar sebelum mengirim.
            </p>
          </div>
        </div>

        <div className="orders-modal-footer">
          <button 
            type="button" 
            className="orders-button orders-button--ghost" 
            onClick={onClose} 
            disabled={sending}
          >
            Batal
          </button>
          <button 
            type="button" 
            className="orders-button orders-button--primary" 
            onClick={handleSend} 
            disabled={sending}
          >
            {sending ? "Mengirim..." : "Kirim Broadcast"}
          </button>
        </div>
      </div>
    </div>
  );
}
