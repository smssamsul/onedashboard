"use client";

import { useEffect, useState } from "react";
import "@/styles/sales/customer.css";

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
const getOrderStatus = (order) => {
  // Cek dari is_paid
  const isPaidValue = order.is_paid;
  const statusValue = order.status_pembayaran || order.status;
  
  // Normalisasi nilai
  const isPaid = 
    isPaidValue === true || 
    isPaidValue === "1" || 
    isPaidValue === 1 ||
    statusValue === "paid" ||
    statusValue === "1";
  
  const isUnpaid = 
    isPaidValue === false || 
    isPaidValue === "0" || 
    isPaidValue === 0 ||
    statusValue === "pending" ||
    statusValue === "0" ||
    statusValue === "unpaid";
  
  if (isPaid) {
    return { label: "Paid", className: "status-paid" };
  }
  if (isUnpaid) {
    return { label: "Unpaid", className: "status-unpaid" };
  }
  
  // Default jika tidak jelas
  return { label: "Unpaid", className: "status-unpaid" };
};

export default function HistoryCustomerModal({ customer, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!customer?.id) return;
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const fetchHistory = async () => {
    if (!customer?.id) return;
    setLoading(true);
    setError("");
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
      setError(err.message || "Terjadi kesalahan saat memuat data");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: "900px" }}>
        <div className="modal-header">
          <h2>Riwayat Order — {customer?.nama || "-"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p style={{ textAlign: "center", color: "#6b7280" }}>Memuat riwayat order...</p>
          ) : error ? (
            <div className="history-error">
              <p>{error}</p>
              <button type="button" className="btn-primary" onClick={fetchHistory}>
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

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Tutup
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

