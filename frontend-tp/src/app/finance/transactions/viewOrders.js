"use client";
import React, { useState, useEffect } from "react";
import "@/styles/finance/pesanan.css";
import "@/styles/finance/transactions-view.css";
import { BACKEND_URL } from "@/config/env";

// Helper function untuk build image URL via proxy
// Menggunakan /api/image proxy untuk menghindari CORS issues
const buildImageUrl = (path) => {
  if (!path) return null;
  
  // Jika sudah full URL (http:// atau https://), extract path-nya
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const url = new URL(path);
      // Extract path setelah domain (misal: /storage/order/bukti/xxx.png)
      let cleanPath = url.pathname;
      // Hapus leading slash
      cleanPath = cleanPath.replace(/^\/+/, "");
      // Hapus "storage/" prefix jika ada (proxy akan menambahkan)
      cleanPath = cleanPath.replace(/^storage\//, "");
      // Gunakan proxy
      return `/api/image?path=${encodeURIComponent(cleanPath)}`;
    } catch (e) {
      // Jika URL parsing gagal, coba extract path secara manual
      const match = path.match(/\/(storage\/.*)$/);
      if (match) {
        let cleanPath = match[1].replace(/^storage\//, "");
        return `/api/image?path=${encodeURIComponent(cleanPath)}`;
      }
      // Fallback: gunakan langsung (mungkin akan error CORS)
      return path;
    }
  }
  
  // Jika path sudah dimulai dengan /storage/, hapus prefix-nya
  if (path.startsWith("/storage/")) {
    let cleanPath = path.replace(/^\/storage\//, "");
    return `/api/image?path=${encodeURIComponent(cleanPath)}`;
  }
  
  // Jika path relative (seperti "order/bukti/..."), gunakan langsung
  return `/api/image?path=${encodeURIComponent(path)}`;
};

export default function ViewOrders({ order, onClose }) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch detail data dari API
  // order.id adalah ID payment validation (bukan order_id)
  // Contoh: jika response API memiliki id: 12 dan order_id: 153, kita gunakan id: 12
  useEffect(() => {
    const fetchOrderDetail = async () => {
      if (!order?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Token tidak ditemukan");
          setLoading(false);
          return;
        }

        // Menggunakan order.id (ID payment validation), bukan order_id
        // Gunakan Next.js proxy route untuk menghindari CORS issues
        const response = await fetch(
          `/api/finance/order-validation/${order.id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Parse response terlebih dahulu untuk melihat error message
        const json = await response.json();

        if (!response.ok) {
          // Jika response tidak OK, tampilkan error message dari backend
          console.error("API Error:", {
            status: response.status,
            statusText: response.statusText,
            message: json.message || json.error || "Gagal memuat data",
            json: json,
          });
          setError(json.message || json.error || `Gagal memuat data (${response.status})`);
          setLoading(false);
          return;
        }

        if (json.success && json.data) {
          setOrderData(json.data);
        } else {
          setError(json.message || "Gagal memuat data");
        }
      } catch (err) {
        console.error("Error fetching order detail:", err);
        // Jika error adalah network error atau parsing error
        if (err.message && err.message.includes("JSON")) {
          setError("Format response tidak valid. Pastikan endpoint benar.");
        } else {
          setError(`Terjadi kesalahan: ${err.message || "Gagal memuat data"}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [order?.id]);

  if (!order) return null;

  // Format tanggal
  const formatTanggal = (tanggal) => {
    if (!tanggal) return "-";
    const date = new Date(tanggal);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  // Format status validasi
  const getStatusLabel = (status) => {
    const statusCode = Number(status?.toString().trim() || 0);
    switch (statusCode) {
      case 0:
      case 1:
        return "Pending";
      case 2:
        return "Valid";
      case 3:
        return "Ditolak";
      default:
        return "-";
    }
  };

  // Format payment method
  const getPaymentMethodLabel = (method) => {
    if (!method) return "-";
    const methodMap = {
      cc: "Credit Card",
      transfer: "Transfer",
      cash: "Cash",
      ewallet: "E-Wallet",
    };
    return methodMap[method.toLowerCase()] || method.toUpperCase();
  };

  // 🔧 Tentukan URL gambar via proxy
  const buktiUrl = orderData?.bukti_pembayaran
    ? buildImageUrl(orderData.bukti_pembayaran)
    : null;

  return (
    <div className="orders-modal-overlay">
      <div className="orders-modal-card">
        {/* Header */}
        <div className="orders-modal-header">
          <div>
            <p className="orders-modal-eyebrow">Detail Validasi Transactions</p>
            <h2>Detail Transactions</h2>
          </div>
          <button className="orders-modal-close" onClick={onClose} type="button" aria-label="Tutup detail">
            <i className="pi pi-times" />
          </button>
        </div>

        {/* Body */}
        <div className="orders-modal-body">
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem", color: "#f1a124" }} />
              <p style={{ marginTop: "1rem", color: "#6b7280" }}>Memuat data...</p>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "2rem" }}>
              <i className="pi pi-exclamation-triangle" style={{ fontSize: "2rem", color: "#ef4444" }} />
              <p style={{ marginTop: "1rem", color: "#ef4444" }}>{error}</p>
            </div>
          ) : orderData ? (
            <div className="detail-list">
              {/* Informasi Pelanggan */}
              <div className="detail-section">
                <h4 className="detail-section-title">Informasi Pelanggan</h4>
                <div className="detail-item">
                  <span className="detail-label">Nama</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.customer?.nama || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">No. WhatsApp</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.customer?.wa || "-"}</span>
                </div>
                {orderData.customer?.wa2 && (
                  <div className="detail-item">
                    <span className="detail-label">No. WhatsApp 2</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{orderData.customer.wa2}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Alamat</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.customer?.alamat || "-"}</span>
                </div>
              </div>

              <div className="detail-section-divider"></div>

              {/* Detail Produk */}
              <div className="detail-section">
                <h4 className="detail-section-title">Detail Produk</h4>
                <div className="detail-item">
                  <span className="detail-label">Nama Produk</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.produk?.nama || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Harga</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">Rp {Number(orderData.produk?.harga || orderData.order?.total_harga || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Ongkir</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">Rp {Number(orderData.order?.ongkir || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Total Harga</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">Rp {Number(orderData.order?.total_harga || 0).toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="detail-section-divider"></div>

              {/* Informasi Pembayaran */}
              <div className="detail-section">
                <h4 className="detail-section-title">Informasi Pembayaran</h4>
                <div className="detail-item">
                  <span className="detail-label">ID Validasi</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">#{orderData.id || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Nama Pengirim</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.nama_pengirim || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">No. Rek Pengirim</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.no_rek_pengirim || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Jumlah Pembayaran</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value" style={{ fontWeight: 600, color: "#059669" }}>
                    Rp {Number(orderData.amount || 0).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pembayaran Ke-</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{orderData.payment_ke || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Metode Pembayaran</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{getPaymentMethodLabel(orderData.payment_method) || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Tanggal Pembayaran</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{formatTanggal(orderData.tanggal) || "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status Validasi</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">
                    <span
                      style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        display: "inline-block",
                        backgroundColor:
                          getStatusLabel(orderData.status) === "Valid"
                            ? "#d1fae5"
                            : getStatusLabel(orderData.status) === "Ditolak"
                            ? "#fee2e2"
                            : "#fef3c7",
                        color:
                          getStatusLabel(orderData.status) === "Valid"
                            ? "#059669"
                            : getStatusLabel(orderData.status) === "Ditolak"
                            ? "#dc2626"
                            : "#d97706",
                      }}
                    >
                      {getStatusLabel(orderData.status)}
                    </span>
                  </span>
                </div>
                {orderData.catatan && (
                  <div className="detail-item">
                    <span className="detail-label">Catatan</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{orderData.catatan}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Bukti Pembayaran</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">
                    {buktiUrl ? (
                      <img
                        src={buktiUrl}
                        alt={`Bukti Pembayaran ${orderData.customer?.nama || "-"}`}
                        onClick={() => setShowImageModal(true)}
                        style={{
                          maxWidth: 150,
                          maxHeight: 120,
                          objectFit: "cover",
                          marginTop: 4,
                          borderRadius: 6,
                          border: "1px solid #e5e7eb",
                          cursor: "pointer",
                          transition: "transform 0.2s ease, box-shadow 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)";
                          e.currentTarget.style.boxShadow = "none";
                        }}
                        onError={(e) => {
                          e.target.style.display = "none";
                          console.error("Gagal memuat gambar:", buktiUrl);
                        }}
                      />
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Image Viewer Modal */}
      {showImageModal && buktiUrl && orderData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "2rem",
          }}
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "1.5rem",
              transition: "background 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            aria-label="Tutup"
          >
            <i className="pi pi-times" />
          </button>
          <img
            src={buktiUrl}
            alt={`Bukti Pembayaran ${orderData.customer?.nama || "-"}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              objectFit: "contain",
              borderRadius: "8px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
            }}
            onError={(e) => {
              console.error("Gagal memuat gambar:", buktiUrl);
            }}
          />
        </div>
      )}
    </div>
  );
}
