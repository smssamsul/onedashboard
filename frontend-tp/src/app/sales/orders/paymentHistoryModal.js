"use client";

import { useState, useEffect } from "react";
import { BACKEND_URL } from "@/config/env";

export default function PaymentHistoryModal({ orderId, isOpen, onClose }) {
  const [paymentHistoryData, setPaymentHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && orderId) {
      fetchPaymentHistory();
    } else {
      // Reset data saat modal ditutup
      setPaymentHistoryData(null);
      setError("");
    }
  }, [isOpen, orderId]);

  const fetchPaymentHistory = async () => {
    if (!orderId) return;
    
    setLoading(true);
    setError("");
    setPaymentHistoryData(null);
    
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token tidak ditemukan");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/sales/order-payment/by-order/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      
      if (json.success && json.data) {
        setPaymentHistoryData(json.data);
      } else {
        setError(json.message || "Gagal memuat riwayat pembayaran");
      }
    } catch (err) {
      console.error("Error fetching payment history:", err);
      setError("Terjadi kesalahan saat memuat riwayat pembayaran");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="orders-modal-overlay" 
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}
      >
        <div 
          className="orders-modal-card" 
          style={{ 
            width: "min(800px, 95vw)", 
            maxHeight: "90vh", 
            display: "flex", 
            flexDirection: "column",
            position: "relative",
            zIndex: 10000,
            backgroundColor: "#fff",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="orders-modal-header" style={{
            padding: "1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start"
          }}>
            <div>
              <p className="orders-modal-eyebrow" style={{
                fontSize: "0.875rem",
                color: "#6b7280",
                margin: "0 0 0.25rem",
                fontWeight: 500
              }}>Riwayat Pembayaran</p>
              <h2 style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 600,
                color: "#111827"
              }}>Data Pembayaran Order #{paymentHistoryData?.order?.id || orderId || "-"}</h2>
            </div>
            <button 
              className="orders-modal-close" 
              onClick={onClose} 
              type="button" 
              aria-label="Tutup modal"
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#6b7280",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "32px",
                height: "32px",
                borderRadius: "4px",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f3f4f6";
                e.target.style.color = "#111827";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = "transparent";
                e.target.style.color = "#6b7280";
              }}
            >
              <i className="pi pi-times" />
            </button>
          </div>

          {/* Body */}
          <div 
            className="orders-modal-body" 
            style={{ 
              overflowY: "auto", 
              flex: 1, 
              padding: "1.5rem" 
            }}
          >
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem", color: "#ff6c00" }} />
                <p style={{ marginTop: "1rem", color: "#6b7280" }}>Memuat data...</p>
              </div>
            ) : error ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ color: "#dc2626" }}>{error}</p>
                <button
                  onClick={fetchPaymentHistory}
                  style={{
                    marginTop: "1rem",
                    padding: "0.5rem 1rem",
                    background: "#ff6c00",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: 500
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = "#c85400";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = "#ff6c00";
                  }}
                >
                  Coba Lagi
                </button>
              </div>
            ) : paymentHistoryData ? (
              <>
                {/* Order Info */}
                <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
                  <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Informasi Order</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", fontSize: "0.875rem" }}>
                    <div>
                      <span style={{ color: "#6b7280" }}>Customer:</span>
                      <strong style={{ display: "block", color: "#111827" }}>{paymentHistoryData.order?.customer_rel?.nama || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280" }}>Produk:</span>
                      <strong style={{ display: "block", color: "#111827" }}>{paymentHistoryData.order?.produk_rel?.nama || "-"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#6b7280" }}>Total Harga:</span>
                      <strong style={{ display: "block", color: "#111827" }}>Rp {Number(paymentHistoryData.order?.total_harga || 0).toLocaleString("id-ID")}</strong>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                {paymentHistoryData.summary && (
                  <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                    <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Ringkasan</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", fontSize: "0.875rem" }}>
                      <div>
                        <span style={{ color: "#6b7280" }}>Total Amount:</span>
                        <strong style={{ display: "block", color: "#111827" }}>Rp {Number(paymentHistoryData.summary.total_amount || 0).toLocaleString("id-ID")}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Total Paid:</span>
                        <strong style={{ display: "block", color: "#059669" }}>Rp {Number(paymentHistoryData.summary.total_paid || 0).toLocaleString("id-ID")}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Remaining:</span>
                        <strong style={{ display: "block", color: "#dc2626" }}>Rp {Number(paymentHistoryData.summary.remaining || 0).toLocaleString("id-ID")}</strong>
                      </div>
                      <div>
                        <span style={{ color: "#6b7280" }}>Jumlah Pembayaran:</span>
                        <strong style={{ display: "block", color: "#111827" }}>{paymentHistoryData.summary.count_payments || 0}x</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payments List */}
                <div>
                  <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Daftar Pembayaran</h3>
                  {paymentHistoryData.payments && paymentHistoryData.payments.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {paymentHistoryData.payments.map((payment, idx) => {
                        // Ambil status payment individual (bukan order status)
                        // 1 = Menunggu Approve Finance (Pending)
                        // 2 = Data sudah di approve (Approved)
                        // 3 = Data di tolak (Rejected)
                        const paymentStatus = payment.status;
                        const paymentStatusNum = 
                          paymentStatus === null || paymentStatus === undefined
                            ? 1 // Default ke 1 (Pending) jika null/undefined
                            : Number(paymentStatus);

                        // Tentukan label dan style berdasarkan payment.status
                        let statusLabel, statusBg, statusColor;
                        
                        if (paymentStatusNum === 2) {
                          // Data sudah di approve
                          statusLabel = "Approved";
                          statusBg = "#d1fae5";
                          statusColor = "#065f46";
                        } else if (paymentStatusNum === 3) {
                          // Data di tolak
                          statusLabel = "Rejected";
                          statusBg = "#fee2e2";
                          statusColor = "#991b1b";
                        } else {
                          // 1 atau null/undefined = Menunggu Approve Finance
                          statusLabel = "Pending";
                          statusBg = "#fef3c7";
                          statusColor = "#92400e";
                        }

                        return (
                        <div key={payment.id || idx} style={{ padding: "1rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                            <div>
                              <strong style={{ fontSize: "0.95rem", color: "#111827" }}>Pembayaran ke {payment.payment_ke || idx + 1}</strong>
                              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                {payment.tanggal ? new Date(payment.tanggal).toLocaleString("id-ID", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                }) : "-"}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "1.1rem", color: "#059669" }}>Rp {Number(payment.amount || 0).toLocaleString("id-ID")}</strong>
                              <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                <span
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    background: statusBg,
                                    color: statusColor,
                                    fontWeight: 600,
                                  }}
                                >
                                  {statusLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.5rem", fontSize: "0.875rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                            <div>
                              <span style={{ color: "#6b7280" }}>Metode:</span>
                              <strong style={{ display: "block", color: "#111827" }}>{payment.payment_method?.toUpperCase() || "-"}</strong>
                            </div>
                            {payment.bukti_pembayaran && (
                              <div>
                                <span style={{ color: "#6b7280" }}>Bukti:</span>
                                <a 
                                  href={`${BACKEND_URL}/storage/${payment.bukti_pembayaran}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: "block", color: "#c85400", textDecoration: "underline" }}
                                >
                                  Lihat Bukti
                                </a>
                              </div>
                            )}
                            {payment.catatan && (
                              <div style={{ gridColumn: "1 / -1" }}>
                                <span style={{ color: "#6b7280" }}>Catatan:</span>
                                <p style={{ margin: "0.25rem 0 0", color: "#111827" }}>{payment.catatan}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )})}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                      <p>Belum ada riwayat pembayaran</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
                <p>Gagal memuat data</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="orders-modal-footer" style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.5rem"
          }}>
            <button 
              type="button" 
              onClick={onClose} 
              className="orders-btn orders-btn--primary"
              style={{
                padding: "0.625rem 1.25rem",
                background: "#ff6c00",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.875rem",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => {
                e.target.style.background = "#c85400";
              }}
              onMouseLeave={(e) => {
                e.target.style.background = "#ff6c00";
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

