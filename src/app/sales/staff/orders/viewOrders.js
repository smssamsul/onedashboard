"use client";
import React, { useState, useEffect, useCallback } from "react";
import "@/styles/sales/orders.css";
import "@/styles/sales/orders-page.css";
import UpdateOrders from "./updateOrders";
import { BACKEND_URL } from "@/config/env";

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

// 🔹 Helper untuk formatting date time
// 🔹 Helper untuk formatting date time
const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateStr;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${month} ${year} ${hours}:${minutes}`;
};

// 🔹 Helper untuk mengambil waktu_pembayaran dari order_payment_rel
const getWaktuPembayaran = (order) => {
  if (order.waktu_pembayaran) {
    return order.waktu_pembayaran;
  }
  if (order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
    const approvedPayment = order.order_payment_rel.find(p => String(p.status).trim() === "2");
    if (approvedPayment && approvedPayment.create_at) {
      return formatDateTime(approvedPayment.create_at);
    }
    const latestPayment = order.order_payment_rel.sort((a, b) => {
      const dateA = new Date(a.create_at || 0);
      const dateB = new Date(b.create_at || 0);
      return dateB - dateA;
    })[0];
    if (latestPayment && latestPayment.create_at) {
      return formatDateTime(latestPayment.create_at);
    }
  }
  return null;
};

// Helper function untuk build image URL via proxy
const buildImageUrl = (path) => {
  if (!path) return null;
  const cleanPath = path.replace(/^\/?(storage\/)?/, "");
  return `/api/image?path=${encodeURIComponent(cleanPath)}`;
};

// 🔹 Helper untuk mengambil bukti_pembayaran dari order_payment_rel
const getBuktiPembayaran = (order) => {
  if (order.bukti_pembayaran) {
    return order.bukti_pembayaran;
  }
  if (order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
    const approvedPayment = order.order_payment_rel.find(p => String(p.status).trim() === "2");
    if (approvedPayment && approvedPayment.bukti_pembayaran) {
      return approvedPayment.bukti_pembayaran;
    }
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

const getFollowupStatusBadge = (status) => {
  if (status === "1" || status === 1 || status === "Y") {
    return { label: "Terkirim", className: "badge-success" };
  }
  if (status === "0" || status === 0 || status === "N") {
    return { label: "Gagal", className: "badge-danger" };
  }
  return { label: "Pending", className: "badge-warning" };
};

export default function ViewOrders({ order: initialOrder, onClose }) {
  const [order, setOrder] = useState(initialOrder);
  const [loadingOrder, setLoadingOrder] = useState(false);

  if (!order) return null;

  const [activeTab, setActiveTab] = useState("detail");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  // Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [showUpdate, setShowUpdate] = useState(false);

  // Fetch Full Order Details (to get bundling_rel if missing)
  const fetchOrderDetails = useCallback(async () => {
    if (!order?.id) return;
    setLoadingOrder(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/order/${order.id}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Handle if data is array or object
        const fullOrder = Array.isArray(json.data) ? json.data[0] : json.data;
        if (fullOrder) {
          setOrder(fullOrder);
        }
      }
    } catch (err) {
      console.error("Error fetching full order:", err);
    } finally {
      setLoadingOrder(false);
    }
  }, [order?.id]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Payment History State
  const [paymentHistoryData, setPaymentHistoryData] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Ambil status pembayaran dari order (untuk Detail tab)
  const statusPembayaranValue = order.status_pembayaran ?? 0;
  const statusPembayaranInfo = STATUS_PEMBAYARAN_MAP[statusPembayaranValue] || STATUS_PEMBAYARAN_MAP[0];
  const totalHarga = Number(order.total_harga || 0);
  const totalDibayar = Number(order.total_paid || 0);
  const sisaPembayaran = Number(order.remaining !== undefined ? order.remaining : (totalHarga - totalDibayar));

  // --- FETCH LOGIC: Follow Up ---
  const [followupPage, setFollowupPage] = useState(1);
  const [followupHasMore, setFollowupHasMore] = useState(false);

  const fetchLogsFollup = useCallback(async (page = 1) => {
    if (!order.id) return;

    if (page === 1) {
      setLoadingLogs(true);
      setLogs([]);
    }
    setLogsError("");

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      // Add pagination params
      const res = await fetch(`/api/sales/order/${order.id}/followup?page=${page}&per_page=15`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Gagal memuat log");

      const newLogs = Array.isArray(data.data) ? data.data : [];

      setLogs(prev => page === 1 ? newLogs : [...prev, ...newLogs]);

      // Check pagination
      if (data.pagination) {
        setFollowupHasMore(data.pagination.current_page < data.pagination.last_page);
        setFollowupPage(data.pagination.current_page);
      } else {
        setFollowupHasMore(false);
      }

    } catch (err) {
      setLogsError(err.message);
    } finally {
      setLoadingLogs(false);
    }
  }, [order.id]);

  // --- FETCH LOGIC: Payment History ---
  const fetchPaymentHistory = useCallback(async () => {
    if (!order.id) return;
    setLoadingPayment(true);
    setPaymentError("");
    setPaymentHistoryData(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Token tidak ditemukan");

      const res = await fetch(`/api/sales/order-payment/by-order/${order.id}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = await res.json();
      if (json.success && json.data) {
        setPaymentHistoryData(json.data);
      } else {
        setPaymentError(json.message || "Gagal memuat riwayat pembayaran");
      }
    } catch (err) {
      console.error("Error fetching payment history:", err);
      setPaymentError("Terjadi kesalahan saat memuat riwayat pembayaran");
    } finally {
      setLoadingPayment(false);
    }
  }, [order.id]);

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "followup") {
      fetchLogsFollup(1);
    } else if (activeTab === "pembayaran") {
      fetchPaymentHistory();
    }
  }, [activeTab, fetchLogsFollup, fetchPaymentHistory]);

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
      <div className="modal-card" style={{ maxWidth: "800px" }}>
        {/* HEADER */}
        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <h2>Detail Order</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="pi pi-times"></i>
          </button>
        </div>

        {/* TABS */}
        <div className="modal-tabs">
          <button
            className={`tab-item ${activeTab === "detail" ? "active" : ""}`}
            onClick={() => setActiveTab("detail")}
          >
            Detail
          </button>
          <button
            className={`tab-item ${activeTab === "pembayaran" ? "active" : ""}`}
            onClick={() => setActiveTab("pembayaran")}
          >
            Pembayaran
          </button>
          <button
            className={`tab-item ${activeTab === "followup" ? "active" : ""}`}
            onClick={() => setActiveTab("followup")}
          >
            Follow Up
          </button>
        </div>
        <div className="tabs-divider"></div>

        {/* BODY */}
        <div className="modal-body" style={{ marginTop: '1rem' }}>

          {/* === DETAIL TAB === */}
          {activeTab === "detail" && (
            <div className="detail-list fade-in">
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ marginBottom: '0.25rem', fontWeight: 600, fontSize: '1.1rem', color: '#1e293b' }}>
                  {order.customer_rel?.nama || "-"}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>Email: {order.customer_rel?.email || "-"}</div>
                  <div>WhatsApp: {order.customer_rel?.wa || "-"}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Produk</h4>
                  <p style={{ fontSize: '1rem', fontWeight: 500, color: '#1e293b', marginBottom: '1.5rem' }}>{order.produk_rel?.nama || "-"}</p>

                  {/* Penanganan Bundling: Meniru gaya Admin agar pasti tampil */}
                  {(() => {
                    const b = order.bundling_rel;
                    const bName = b?.nama || (Array.isArray(b) && b[0]?.nama) || order.bundling_nama;

                    if (!bName && !order.bundling && !loadingOrder) return <div style={{ marginBottom: '1.5rem' }}></div>;

                    return (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Paket Bundling</h4>
                        <p style={{ fontSize: '1rem', fontWeight: 500, color: '#1e293b' }}>
                          {bName || (loadingOrder ? "Memuat nama paket..." : ("ID: " + order.bundling))}
                        </p>
                      </div>
                    );
                  })()}




                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Status Order</h4>
                  {(() => {
                    const statusVal = String(order.status_order ?? order.status ?? "1");
                    const statusInfo = STATUS_ORDER_MAP[statusVal] || STATUS_ORDER_MAP["1"];
                    return (
                      <span className={`orders-status-badge orders-status-badge--${statusInfo.class}`}>
                        {statusInfo.label.toUpperCase()}
                      </span>
                    );
                  })()}

                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Tanggal Order</h4>
                  <p style={{ fontSize: '1rem', color: '#1e293b' }}>{order.tanggal ? formatDateTime(order.tanggal) : "-"}</p>

                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Total Dibayar</h4>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: '#059669' }}>Rp {totalDibayar.toLocaleString("id-ID")}</p>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem' }}>Total Harga</h4>
                  <p style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Rp {totalHarga.toLocaleString("id-ID")}</p>

                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Status Pembayaran</h4>
                  <span className={`orders-status-badge orders-status-badge--${statusPembayaranInfo.class}`}>
                    {statusPembayaranInfo.label}
                  </span>

                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Alamat</h4>
                  <p style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.5' }}>{order.alamat || "-"}</p>

                  <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.5rem', marginTop: '1.5rem' }}>Sisa Pembayaran</h4>
                  <p style={{ fontSize: "1rem", fontWeight: 600, color: sisaPembayaran > 0 ? "#dc2626" : "#059669" }}>
                    Rp {sisaPembayaran.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS REMOVED FROM DETAIL TAB */}
            </div>
          )}

          {/* === PEMBAYARAN TAB === */}
          {activeTab === "pembayaran" && (
            <div className="detail-list fade-in">
              {loadingPayment ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem", color: "#ff6c00" }} />
                  <p style={{ marginTop: "1rem", color: "#6b7280" }}>Memuat data...</p>
                </div>
              ) : paymentError ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                  <p style={{ color: "#dc2626" }}>{paymentError}</p>
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
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : paymentHistoryData ? (
                <>
                  {/* Ringkasan */}
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

                  {/* Daftar Pembayaran */}
                  <div>
                    {paymentHistoryData.payments && paymentHistoryData.payments.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {paymentHistoryData.payments.map((payment, idx) => {
                          const paymentStatus = payment.status;
                          const paymentStatusNum = paymentStatus === null || paymentStatus === undefined ? 1 : Number(paymentStatus);

                          let statusLabel, statusBg, statusColor;
                          if (paymentStatusNum === 2) {
                            statusLabel = "Approved";
                            statusBg = "#d1fae5";
                            statusColor = "#065f46";
                          } else if (paymentStatusNum === 3) {
                            statusLabel = "Rejected";
                            statusBg = "#fee2e2";
                            statusColor = "#991b1b";
                          } else {
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
                                    {payment.tanggal ? formatDateTime(payment.tanggal) : "-"}
                                  </div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <strong style={{ fontSize: "1.1rem", color: "#059669" }}>Rp {Number(payment.amount || 0).toLocaleString("id-ID")}</strong>
                                  <div style={{ fontSize: "0.75rem", marginTop: "0.25rem" }}>
                                    <span style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: statusBg, color: statusColor, fontWeight: 600 }}>
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
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                        <p>Belum ada riwayat pembayaran</p>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* === FOLLOW UP TAB === */}
          {activeTab === "followup" && (
            <div className="detail-list fade-in">
              {loadingLogs && logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#3b82f6' }}></i>
                </div>
              )}
              {!loadingLogs && logsError && (
                <div style={{ color: '#dc2626', padding: '1rem', textAlign: 'center' }}>
                  {logsError}
                </div>
              )}
              {!loadingLogs && !logsError && logs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                  Belum ada log follow up.
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {logs.map((log, idx) => {
                  const statusBadge = getFollowupStatusBadge(log.status);
                  const channel = log.channel || "Unknown";
                  const creatorName = log.created_by_rel?.nama || "System"; // Example accessor

                  return (
                    <div key={log.id || idx} style={{ border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', background: '#fff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span className="channel-badge" style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            background: channel.toLowerCase() === 'whatsapp' ? '#dcfce7' : '#f1f5f9',
                            color: channel.toLowerCase() === 'whatsapp' ? '#166534' : '#475569',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {channel}
                          </span>
                          <span className={`status-badge ${statusBadge.className}`} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                            {statusBadge.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {log.follow_up_date ? formatDateTime(log.follow_up_date) : formatDateTime(log.create_at)}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.95rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5', background: '#f8fafc', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '0.5rem' }}>
                        {log.note || log.keterangan || log.pesan || "-"}
                      </div>

                      {/* Footer Info - REMOVED */}

                    </div>
                  );
                })}
              </div>

              {/* Load More Button */}
              {followupHasMore && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button
                    onClick={() => fetchLogsFollup(followupPage + 1)}
                    disabled={loadingLogs}
                    style={{
                      padding: '0.5rem 1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '0.375rem',
                      background: '#fff',
                      color: '#475569',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    {loadingLogs ? 'Memuat...' : 'Muat Lebih Banyak'}
                  </button>
                </div>
              )}
            </div>
          )}

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
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img
              src={selectedImageUrl}
              alt="Full Size"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
            <button
              onClick={handleCloseImageModal}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "rgba(255, 255, 255, 0.5)",
                border: "none",
                borderRadius: "50%",
                width: "3rem",
                height: "3rem",
                cursor: "pointer",
                fontSize: "2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* UPDATE MODAL */}
      {showUpdate && (
        <UpdateOrders
          order={{
            ...order,
            customer: order.customer_rel?.nama || "-",
          }}
          onClose={() => setShowUpdate(false)}
          onSave={(updated) => {
            // Kita bisa merefresh halaman atau mengupdate local state jika perlu
            // Untuk saat ini, asumsikan parent akan handle refresh jika modal ini ditutup
            setShowUpdate(false);
            if (typeof window !== "undefined") {
              // Option 1: Refresh data via broadcast/refresh jika ada mechanismenya
              // Option 2: Sederhananya biarkan user close modal view.
            }
          }}
        />
      )}

      {/* Internal Styles for Tabs */}
      <style jsx>{`
        .modal-tabs {
            display: flex;
            gap: 2rem;
            padding: 0 1.5rem;
            margin-top: 1rem;
        }
        .tab-item {
            background: none;
            border: none;
            padding: 0.75rem 0;
            font-size: 1rem;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            position: relative;
            transition: color 0.2s;
        }
        .tab-item.active {
            color: #10b981; /* Green color match */
        }
        .tab-item.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: #10b981;
        }
        .tab-item:hover {
            color: #334155;
        }
        .tabs-divider {
            height: 1px;
            background: #e2e8f0;
            width: 100%;
            margin-top: 0;
        }
        .fade-in {
            animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
        }
        .badge-success { background: #dcfce7; color: #166534; }
        .badge-danger { background: #fee2e2; color: #991b1b; }
        .badge-warning { background: #fef3c7; color: #92400e; }
      `}</style>
    </div>
  );
}
