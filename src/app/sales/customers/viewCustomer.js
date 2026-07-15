"use client";

import { useState, useEffect } from "react";
import "@/styles/sales/customer.css";

// Helper untuk display pendapatan dalam format readable
const formatPendapatan = (value) => {
  if (!value) return "—";
  const mapping = {
    "1-10jt": "1 - 10 Juta",
    "10-20jt": "10 - 20 Juta",
    "20-30jt": "20 - 30 Juta",
    "30-40jt": "30 - 40 Juta",
    "40-50jt": "40 - 50 Juta",
    "50-60jt": "50 - 60 Juta",
    "60-70jt": "60 - 70 Juta",
    "70-80jt": "70 - 80 Juta",
    "80-90jt": "80 - 90 Juta",
    "90-100jt": "90 - 100 Juta",
    ">100jt": "> 100 Juta",
  };
  return mapping[value] || value;
};

// Helper untuk format value dengan placeholder
const formatValue = (value) => {
  return value || "—";
};

// Helper untuk format tanggal lahir dengan pemisah
const formatTanggalLahir = (tanggal) => {
  if (!tanggal) return "—";

  // Jika sudah ada pemisah, biarkan seperti itu
  if (tanggal.includes("-") || tanggal.includes("/")) {
    return tanggal;
  }

  // Jika tidak ada pemisah, format menjadi dd-mm-yyyy
  const digits = tanggal.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
  }

  // Jika format tidak sesuai, kembalikan asli
  return tanggal;
};

// Helper untuk format Instagram
const formatInstagram = (value) => {
  if (!value) return "—";
  return value.startsWith("@") ? value : "@" + value;
};

// Helper untuk format jenis kelamin
const formatJenisKelamin = (value) => {
  if (value === "l") return "Laki-laki";
  if (value === "p") return "Perempuan";
  return "—";
};

// Helper functions dari historyCustomer.js
const formatCurrency = (value) => {
  if (value == null) return "-";
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Fungsi untuk menentukan status pesanan (paid/unpaid)
// Fungsi untuk menentukan status pesanan (paid/unpaid)
const getOrderStatus = (order) => {
  // Prioritas cek status_pembayaran
  // Jika status_pembayaran null, berarti unpaid (sesuai contoh data user)
  // "status_pembayaran": "2" -> Paid
  // "status_pembayaran": null -> Unpaid

  const statusBayar = order.status_pembayaran;

  if (statusBayar == "2" || statusBayar === 2 || statusBayar == "paid") {
    return { label: "Paid", className: "status-paid" };
  }

  // Jika null atau status lain, anggap unpaid
  return { label: "Unpaid", className: "status-unpaid" };
};

// Helper untuk check apakah order sudah paid
const isOrderPaid = (order) => {
  const statusBayar = order.status_pembayaran;
  return statusBayar == "2" || statusBayar === 2 || statusBayar == "paid";
};

export default function ViewCustomerModal({ customer, onClose, onEdit, onDelete }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [errorOrders, setErrorOrders] = useState("");

  const [followups, setFollowups] = useState([]);
  const [loadingFollowups, setLoadingFollowups] = useState(true);
  const [followupForm, setFollowupForm] = useState({ via: 'WhatsApp', respon: 'Tertarik', keterangan: '' });
  const [submittingFollowup, setSubmittingFollowup] = useState(false);

  useEffect(() => {
    if (!customer?.id) return;
    fetchOrderHistory();
    fetchFollowups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const fetchFollowups = async () => {
    if (!customer?.id) return;
    setLoadingFollowups(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/sales/customer/${customer.id}/followups`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setFollowups(Array.isArray(data.data) ? data.data : []);
      } else {
        setFollowups([]);
      }
    } catch (err) {
      setFollowups([]);
    } finally {
      setLoadingFollowups(false);
    }
  };

  const submitFollowup = async (e) => {
    e.preventDefault();
    if (!customer?.id || !followupForm.via || !followupForm.respon) return;
    setSubmittingFollowup(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/sales/customer/${customer.id}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(followupForm),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        setFollowupForm({ via: 'WhatsApp', respon: 'Tertarik', keterangan: '' });
        fetchFollowups();
        if(typeof window !== 'undefined' && window.toastSuccess) {
           window.toastSuccess('Follow up berhasil dicatat');
        } else {
           alert('Follow up berhasil dicatat');
        }
      } else {
        alert(data?.message || 'Gagal menyimpan follow up');
      }
    } catch (err) {
       alert('Terjadi kesalahan saat menyimpan data');
    } finally {
       setSubmittingFollowup(false);
    }
  };

  const fetchOrderHistory = async () => {
    if (!customer?.id) return;
    setLoadingOrders(true);
    setErrorOrders("");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/sales/customer/riwayat-order/${customer.id}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Gagal memuat riwayat order");
      }

      setOrders(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setErrorOrders(err.message || "Terjadi kesalahan saat memuat data");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Calculate pesanan_sukses dan total_net_revenue dari orders
  const paidOrders = orders.filter(order => isOrderPaid(order));
  const pesananSukses = paidOrders.length;
  const totalNetRevenue = paidOrders.reduce((sum, order) => {
    const total = Number(order.total_harga) || 0;
    return sum + total;
  }, 0);

  return (
    <div className="modal-overlay" style={{ zIndex: 1000 }}>
      <div className="modal-card" style={{ maxWidth: "900px" }}>
        {/* HEADER */}
        <div className="modal-header">
          <h2>Detail Data Customer</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="pi pi-times"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          {/* Section Informasi Umum */}
          <div className="info-section" style={{ marginBottom: "2rem" }}>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#111827"
            }}>
              Informasi Umum
            </h3>
            {/* Badge Keanggotaan */}
            {customer.keanggotaan && (
              <div style={{
                display: "inline-block",
                marginBottom: "1rem",
                padding: "0.5rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                backgroundColor: "#f9fafb",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151"
              }}>
                {customer.keanggotaan.charAt(0).toUpperCase() + customer.keanggotaan.slice(1)}
              </div>
            )}
            <div className="detail-list">
              <div className="detail-item">
                <span className="detail-label">Sapaan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.sapaan)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Nama</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.nama)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Email</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.email)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">No. HP</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.wa)}</span>
              </div>

              {customer.wa2 && (
                <div className="detail-item">
                  <span className="detail-label">No. HP 2</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{formatValue(customer.wa2)}</span>
                </div>
              )}

              <div className="detail-item">
                <span className="detail-label">Nama Panggilan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.nama_panggilan)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Instagram</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatInstagram(customer.instagram)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Profesi</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.profesi)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Pendapatan per Bulan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatPendapatan(customer.pendapatan_bln)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Industri Pekerjaan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.industri_pekerjaan)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Jenis Kelamin</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatJenisKelamin(customer.jenis_kelamin)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Tanggal Lahir</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatTanggalLahir(customer.tanggal_lahir)}</span>
              </div>

              {/* Alamat - Format Baru (Provinsi, Kabupaten/Kota, Kecamatan, Kode Pos) */}
              {/* Backward compatibility: jika ada alamat lama, tampilkan juga */}
              {customer.alamat && (!customer.provinsi || !customer.kabupaten || !customer.kecamatan) && (
                <div className="detail-item">
                  <span className="detail-label">Alamat</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{formatValue(customer.alamat)}</span>
                </div>
              )}

              <div className="detail-item">
                <span className="detail-label">Provinsi</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.provinsi)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Kabupaten/Kota</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.kabupaten)}</span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Kecamatan</span>
                <span className="detail-colon">:</span>
                <span className="detail-value">{formatValue(customer.kecamatan)}</span>
              </div>


            </div>
          </div>

          {/* Section Order History */}
          <div className="order-history-section">
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#111827"
            }}>
              Order History
            </h3>
            {loadingOrders ? (
              <p style={{ textAlign: "center", color: "#6b7280" }}>Memuat riwayat order...</p>
            ) : errorOrders ? (
              <div className="history-error">
                <p>{errorOrders}</p>
                <button type="button" className="btn-primary" onClick={fetchOrderHistory}>
                  Coba Lagi
                </button>
              </div>
            ) : orders.length === 0 ? (
              <p style={{ textAlign: "center", color: "#6b7280" }}>
                Belum ada riwayat order untuk customer ini.
              </p>
            ) : (
              <div className="history-table">
                <div className="history-table__head">
                  <span>Tanggal</span>
                  <span>Produk</span>
                  <span>Total</span>
                  <span>Status Pesanan</span>
                  <span>Sumber</span>
                </div>
                <div className="history-table__body">
                  {orders.map((order) => {
                    const orderStatus = getOrderStatus(order);
                    return (
                      <div className="history-table__row" key={order.id}>
                        <div className="history-table__cell" data-label="Tanggal">
                          {formatDateTime(order.tanggal)}
                        </div>
                        <div className="history-table__cell" data-label="Produk">
                          {order.produk_rel?.nama || order.produk?.nama || "-"}
                        </div>
                        <div className="history-table__cell" data-label="Total">
                          {formatCurrency(order.total_harga)}
                        </div>
                        <div className="history-table__cell" data-label="Status Pesanan">
                          <span className={`status-badge ${orderStatus.className}`}>
                            {orderStatus.label}
                          </span>
                        </div>
                        <div className="history-table__cell" data-label="Sumber">
                          {order.sumber || "-"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Section Follow Up History */}
          <div className="followup-history-section" style={{ marginTop: "2rem" }}>
            <h3 style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#111827"
            }}>
              Histori Follow Up
            </h3>
            
            {/* Form Input Follow Up */}
            {!loadingFollowups && followups.length > 0 && (
            <div style={{ background: "#f8fafc", padding: "1rem", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "1rem" }}>
              <form onSubmit={submitFollowup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Via / Channel</label>
                    <select 
                      value={followupForm.via}
                      onChange={(e) => setFollowupForm({...followupForm, via: e.target.value})}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Telepon">Telepon</option>
                      <option value="Email">Email</option>
                      <option value="Tatap Muka">Tatap Muka</option>
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Respon</label>
                    <select 
                      value={followupForm.respon}
                      onChange={(e) => setFollowupForm({...followupForm, respon: e.target.value})}
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                    >
                      <option value="Tertarik">Tertarik</option>
                      <option value="Follow Up Lagi">Follow Up Lagi</option>
                      <option value="Pikir-pikir">Pikir-pikir</option>
                      <option value="Tidak Tertarik">Tidak Tertarik</option>
                      <option value="Salah Sambung">Salah Sambung</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Keterangan / Catatan</label>
                  <textarea 
                    value={followupForm.keterangan}
                    onChange={(e) => setFollowupForm({...followupForm, keterangan: e.target.value})}
                    placeholder="Masukkan catatan follow up..."
                    rows={3}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "vertical" }}
                  ></textarea>
                </div>
                <div style={{ alignSelf: "flex-end" }}>
                  <button 
                    type="submit" 
                    disabled={submittingFollowup}
                    style={{ padding: "0.5rem 1rem", background: submittingFollowup ? "#94a3b8" : "#2563eb", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, cursor: submittingFollowup ? "not-allowed" : "pointer" }}
                  >
                    {submittingFollowup ? "Menyimpan..." : "Simpan Follow Up"}
                  </button>
                </div>
              </form>
            </div>
            )}

            {/* Tabel History */}
            {loadingFollowups ? (
              <p style={{ textAlign: "center", color: "#6b7280" }}>Memuat histori follow up...</p>
            ) : followups.length === 0 ? (
              <p style={{ textAlign: "center", color: "#6b7280" }}>Belum ada histori follow up.</p>
            ) : (
              <div className="history-table">
                <div className="history-table__head" style={{ gridTemplateColumns: "1fr 1fr 1fr 1.5fr" }}>
                  <span>Tanggal</span>
                  <span>Via</span>
                  <span>Respon</span>
                  <span>Keterangan</span>
                </div>
                <div className="history-table__body">
                  {followups.map((f, i) => (
                    <div className="history-table__row" key={f.id || i} style={{ gridTemplateColumns: "1fr 1fr 1fr 1.5fr" }}>
                      <div className="history-table__cell" data-label="Tanggal">
                        {formatDateTime(f.created_at)}
                      </div>
                      <div className="history-table__cell" data-label="Via">
                        <span style={{ padding: "4px 8px", background: "#f1f5f9", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>{f.via || "-"}</span>
                      </div>
                      <div className="history-table__cell" data-label="Respon">
                        <span style={{ 
                          padding: "4px 8px", 
                          background: f.respon === 'Tertarik' ? '#dcfce7' : f.respon === 'Tidak Tertarik' ? '#fee2e2' : '#fef3c7', 
                          color: f.respon === 'Tertarik' ? '#166534' : f.respon === 'Tidak Tertarik' ? '#991b1b' : '#92400e',
                          borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 
                        }}>{f.respon || "-"}</span>
                      </div>
                      <div className="history-table__cell" data-label="Keterangan">
                        <div style={{ fontSize: "0.85rem" }}>{f.keterangan || "-"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px" }}>
                          Oleh: {f.user?.nama || "Sistem"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER dengan 2 button */}
        <div className="modal-footer" style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "flex-end",
          padding: "1.5rem",
          borderTop: "1px solid #e5e7eb",
          position: "relative",
          zIndex: 1002
        }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              onEdit?.(customer);
            }}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 500,
              position: "relative",
              zIndex: 1003
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              onDelete?.(customer);
            }}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 500,
              position: "relative",
              zIndex: 1003
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <style>{`
        .history-error {
          text-align: center;
          color: #b91c1c;
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }
        .history-table {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .history-table__head,
        .history-table__row {
          display: grid;
          grid-template-columns: 1.3fr 1fr 0.8fr 0.9fr 0.8fr;
        }
        .history-table__head {
          background: #f1f5f9;
          font-weight: 600;
          font-size: 0.9rem;
          color: #0f172a;
          padding: 12px 16px;
        }
        .history-table__head span {
          padding-right: 8px;
        }
        .history-table__body {
          max-height: 360px;
          overflow-y: auto;
        }
        .history-table__row {
          border-top: 1px solid #eef2ff;
        }
        .history-table__cell {
          padding: 12px 16px;
          font-size: 0.9rem;
          color: #111827;
          border-right: 1px solid #f8fafc;
        }
        .history-table__cell:last-child {
          border-right: none;
        }
        @media (max-width: 640px) {
          .history-table__head {
            display: none;
          }
          .history-table__row {
            grid-template-columns: 1fr;
            border-bottom: 1px solid #e5e7eb;
          }
          .history-table__cell {
            border-right: none;
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
          }
          .history-table__cell::before {
            content: attr(data-label);
            font-weight: 600;
            color: #6b7280;
            margin-right: 12px;
          }
        }
        .btn-primary {
          background: #2563eb;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-paid {
          background: #dcfce7;
          color: #166534;
        }
        .status-unpaid {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>
    </div>
  );
}
