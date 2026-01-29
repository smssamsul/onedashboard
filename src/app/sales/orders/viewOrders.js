"use client";
import React, { useState } from "react";
import "@/styles/sales/orders.css";
import "@/styles/sales/orders-page.css";

const STATUS_PEMBAYARAN_MAP = {
  0: { label: "Unpaid", class: "unpaid" },
  null: { label: "Unpaid", class: "unpaid" },
  1: { label: "Waiting Approval", class: "pending" }, // Menunggu approve finance
  2: { label: "Paid", class: "paid" },             // Finance approved
  3: { label: "Rejected", class: "rejected" },
  4: { label: "Partial Payment", class: "partial" },
};

const STATUS_ORDER_MAP = {
  "1": { label: "Pending", class: "pending" },
  "2": { label: "Processing", class: "success" },
  "3": { label: "Failed", class: "failed" },
  "4": { label: "Completed", class: "completed" },
  "N": { label: "Deleted", class: "deleted" },
};

// 🔹 Helper untuk mengambil waktu_pembayaran dari order_payment_rel
const getWaktuPembayaran = (order) => {
  // Jika sudah ada di level order, gunakan itu
  if (order.waktu_pembayaran) {
    return order.waktu_pembayaran;
  }
  // Ambil dari order_payment_rel jika ada
  if (order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
    // Cari payment yang statusnya approved (status "2") terlebih dahulu
    const approvedPayment = order.order_payment_rel.find(p => String(p.status).trim() === "2");
    if (approvedPayment && approvedPayment.create_at) {
      const date = new Date(approvedPayment.create_at);
      const pad = (n) => n.toString().padStart(2, "0");
      return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    // Jika tidak ada yang approved, ambil yang terbaru
    const latestPayment = order.order_payment_rel.sort((a, b) => {
      const dateA = new Date(a.create_at || 0);
      const dateB = new Date(b.create_at || 0);
      return dateB - dateA;
    })[0];
    if (latestPayment && latestPayment.create_at) {
      const date = new Date(latestPayment.create_at);
      const pad = (n) => n.toString().padStart(2, "0");
      return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
  }
  return null;
};

// 🔹 Helper untuk menentukan status bayar otomatis
const computeStatusBayar = (order) => {
  // Cek dari order_payment_rel jika ada
  if (order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
    const hasApprovedPayment = order.order_payment_rel.some(p => String(p.status).trim() === "2");
    if (hasApprovedPayment) {
      return 1; // Paid
    }
    const hasPendingPayment = order.order_payment_rel.some(p => String(p.status).trim() === "1");
    if (hasPendingPayment) {
      return 1; // Menunggu
    }
  }
  // Fallback ke logika lama
  if (
    order.bukti_pembayaran &&
    order.bukti_pembayaran !== "" &&
    order.waktu_pembayaran &&
    order.waktu_pembayaran !== ""
  ) {
    return 1; // Paid
  }
  return 0; // Unpaid
};

// Helper function untuk build image URL via proxy
const buildImageUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.replace(/^\/?(storage\/)?/, "");
  return `/api/image?path=${encodeURIComponent(cleanPath)}`;
};

// 🔹 Helper untuk mengambil bukti_pembayaran dari order_payment_rel
const getBuktiPembayaran = (order) => {
  // Jika sudah ada di level order, gunakan itu
  if (order.bukti_pembayaran) {
    return order.bukti_pembayaran;
  }
  // Ambil dari order_payment_rel jika ada
  if (order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
    // Cari payment yang statusnya approved (status "2") terlebih dahulu
    const approvedPayment = order.order_payment_rel.find(p => String(p.status).trim() === "2");
    if (approvedPayment && approvedPayment.bukti_pembayaran) {
      return approvedPayment.bukti_pembayaran;
    }
    // Jika tidak ada yang approved, ambil yang terbaru
    const latestPayment = order.order_payment_rel.sort((a, b) => {
      const dateA = new Date(a.create_at || 0);
      const dateB = new Date(b.create_at || 0);
      return dateB - dateA;
    })[0];
    if (latestPayment && latestPayment.bukti_pembayaran) {
      return latestPayment.bukti_pembayaran;
    }
  }
  return null;
};

export default function ViewOrders({ order, onClose }) {
  if (!order) return null;

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  // Ambil status pembayaran dari order
  const statusPembayaranValue = order.status_pembayaran ?? 0;
  const statusPembayaranInfo = STATUS_PEMBAYARAN_MAP[statusPembayaranValue] || STATUS_PEMBAYARAN_MAP[0];

  // Ambil bukti pembayaran dari order_payment_rel
  const buktiPembayaranPath = getBuktiPembayaran(order);
  const buktiUrl = buildImageUrl(buktiPembayaranPath);
  const waktuPembayaran = getWaktuPembayaran(order);

  const handleImageClick = (imageUrl) => {
    if (imageUrl) {
      setSelectedImageUrl(imageUrl);
      setShowImageModal(true);
    }
  };

  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImageUrl(null);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* HEADER */}
        <div className="modal-header">
          <h2>Detail Pesanan</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="pi pi-times"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <div className="detail-list">
            {/* Informasi Pelanggan */}
            <div className="detail-section">
              <h4 className="detail-section-title">Informasi Pelanggan</h4>
              <div className="detail-item">
                <span className="detail-label">Nama</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.customer_rel?.nama || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">No. WhatsApp</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.customer_rel?.wa || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Alamat</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.alamat || "-"}</span>
              </div>
            </div>

            <div className="detail-section-divider"></div>

            {/* Detail Produk */}
            <div className="detail-section">
              <h4 className="detail-section-title">Detail Produk</h4>
              <div className="detail-item">
                <span className="detail-label">Nama Produk</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.produk_rel?.nama || "-"}</span>
              </div>
              {order.bundling_rel && (
                <div className="detail-item">
                  <span className="detail-label">Paket Bundling</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{order.bundling_rel.nama}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Harga</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">Rp {Number(order.harga || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Ongkir</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">Rp {Number(order.ongkir || 0).toLocaleString("id-ID")}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Harga</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">Rp {Number(order.total_harga || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="detail-section-divider"></div>

            {/* Informasi Pembayaran */}
            <div className="detail-section">
              <h4 className="detail-section-title">Informasi Pembayaran</h4>
              <div className="detail-item">
                <span className="detail-label">Status Pembayaran</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">
                  <span className={`orders-status-badge orders-status-badge--${statusPembayaranInfo?.class || 'default'}`}>
                    {statusPembayaranInfo?.label || order.status_pembayaran}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Metode Pembayaran</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.metode_bayar || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Waktu Pembayaran</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{waktuPembayaran || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Bukti Pembayaran</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">
                  {buktiUrl ? (
                    <img
                      src={buktiUrl}
                      alt={`Bukti Pembayaran ${order.customer_rel?.nama || "-"}`}
                      onClick={() => handleImageClick(buktiUrl)}
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

            <div className="detail-section-divider"></div>

            {/* Informasi Tambahan */}
            <div className="detail-section">
              <h4 className="detail-section-title">Informasi Tambahan</h4>
              <div className="detail-item">
                <span className="detail-label">Tanggal Pesanan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.tanggal || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Sumber Pesanan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{order.sumber || "-"}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Order ID</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">#{order.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox Modal */}
      {showImageModal && selectedImageUrl && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            cursor: "pointer",
          }}
          onClick={handleCloseImageModal}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImageUrl}
              alt="Bukti Pembayaran - Full Size"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
              }}
            />
            <button
              onClick={handleCloseImageModal}
              style={{
                position: "absolute",
                top: "-2.5rem",
                right: 0,
                background: "rgba(255, 255, 255, 0.9)",
                border: "none",
                borderRadius: "50%",
                width: "2rem",
                height: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: "1.5rem",
                color: "#374151",
                fontWeight: "bold",
                transition: "background 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
