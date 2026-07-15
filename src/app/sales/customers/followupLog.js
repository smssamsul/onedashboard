"use client";

import { useEffect, useState } from "react";
import "@/styles/sales/customer.css";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status) => {
  // Status dari backend: "1" = terkirim, "0" = gagal, null = pending/belum terkirim
  if (status === "1" || status === 1 || status === "Y") {
    return { label: "Terkirim", className: "badge-success" };
  }
  if (status === "0" || status === 0 || status === "N") {
    return { label: "Gagal", className: "badge-danger" };
  }
  // null atau undefined = belum terkirim / pending
  return { label: "Pending", className: "badge-warning" };
};

export default function FollowupLogModal({ customer, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(""); // Filter by event

  useEffect(() => {
    if (!customer?.id) return;
    fetchLogsFollup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, selectedEvent]);

  const fetchLogsFollup = async () => {
    if (!customer?.id) return;
    setLoading(true);
    setError("");
    
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      
      // POST /api/admin/logs-follup
      // Request: { customer: id_customer (integer), event: integer (optional) }
      // PENTING: customer harus integer, bukan string
      const customerId = Number(customer.id);
      
      const requestBody = {
        customer: customerId,
      };
      
      // Tambahkan event filter jika dipilih
      if (selectedEvent) {
        requestBody.event = Number(selectedEvent);
      }

      const res = await fetch("/api/sales/logs-follup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json().catch(() => ({}));
      
      // API response: { message, total, data: [...] }
      if (!res.ok) {
        throw new Error(data?.message || "Gagal memuat log follow up");
      }

      // Filter data untuk memastikan hanya log milik customer ini yang ditampilkan
      const logsData = Array.isArray(data.data) ? data.data : [];
      const filteredLogs = logsData.filter(log => {
        const logCustomerId = Number(log.customer);
        return logCustomerId === customerId;
      });
      
      setLogs(filteredLogs);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const customerName = customer?.nama || "";
  const customerId = customer?.id || "";

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: "1000px", width: "95vw", maxHeight: "95vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-header">
          <div>
            <h2>Log Follow Up — {customerName}</h2>
            <p className="modal-subtitle">Customer ID: {customerId}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Summary */}
          <div className="followup-summary">
            <div className="summary-item">
              <span className="summary-icon"></span>
              <div>
                <p className="summary-label">Total Log</p>
                <p className="summary-value">{logs.length}</p>
              </div>
            </div>
            <div className="summary-item summary-success">
              <span className="summary-icon"></span>
              <div>
                <p className="summary-label">Terkirim</p>
                <p className="summary-value">
                  {logs.filter(l => l.status === "1" || l.status === 1).length}
                </p>
              </div>
            </div>
            <div className="summary-item summary-pending">
              <span className="summary-icon"></span>
              <div>
                <p className="summary-label">Pending</p>
                <p className="summary-value">
                  {logs.filter(l => l.status === null || l.status === undefined).length}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Memuat log follow up...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <span className="error-icon"></span>
              <p>{error}</p>
              <button type="button" className="btn-retry" onClick={fetchLogsFollup}>
                Coba Lagi
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📭</span>
              <p>Belum ada log follow up untuk customer ini.</p>
            </div>
          ) : (
            <div className="followup-log-list">
              {logs.map((log, index) => {
                const statusBadge = getStatusBadge(log.status);
                const pesan = log.keterangan || log.pesan || "-";
                const typeFollowup = log.follup || log.type || log.follup_rel?.id || "-";
                const nomorWA = customer?.wa || log.wa || "-";
                const namaCustomer = customer?.nama || log.customer_rel?.nama || "-";
                const response = log.response || log.wa_response || "-";
                
                return (
                  <div key={log.id || index} className="log-card">
                    <div className="log-card-header">
                      <div className="log-info-line">
                        <span className="info-label">Kirim WA follow up type {typeFollowup} ke</span>
                        <span className="info-value">{nomorWA}</span>
                        {namaCustomer && <span className="info-customer">({namaCustomer})</span>}
                      </div>
                    </div>
                    
                    <div className="log-card-body">
                      <div className="log-detail-row">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      
                      <div className="log-detail-row">
                        <span className="detail-label">Pesan:</span>
                        <div className="pesan-content">{pesan}</div>
                      </div>
                      
                      {response && response !== "-" && (
                        <div className="log-detail-row">
                          <span className="detail-label">Response:</span>
                          <span className="response-value">{response}</span>
                        </div>
                      )}
                      
                      <div className="log-detail-row">
                        <span className="detail-label">Tanggal:</span>
                        <span className="date-value">{formatDateTime(log.create_at || log.update_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        .modal-subtitle {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #64748b;
          font-weight: 500;
        }
        .followup-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          margin-bottom: 24px;
        }
        .summary-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
        }
        .summary-item.summary-success {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .summary-item.summary-pending {
          background: #fefce8;
          border-color: #fef08a;
        }
        .summary-icon {
          font-size: 24px;
        }
        .summary-label {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
        .summary-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .loading-state, .error-state, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          gap: 12px;
        }
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .error-icon, .empty-icon {
          font-size: 48px;
        }
        .error-state p, .empty-state p {
          color: #64748b;
          margin: 0;
        }
        .btn-retry {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .btn-retry:hover {
          background: #2563eb;
        }

        .followup-log-list {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-right: 8px;
        }
        .followup-log-list::-webkit-scrollbar {
          width: 8px;
        }
        .followup-log-list::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .followup-log-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .followup-log-list::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .log-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }
        .log-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
        .log-card-header {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f1f5f9;
        }
        .log-info-line {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          font-size: 14px;
          color: #475569;
        }
        .info-label {
          font-weight: 500;
          color: #64748b;
        }
        .info-value {
          font-weight: 600;
          color: #1e293b;
        }
        .info-customer {
          color: #3b82f6;
          font-weight: 500;
        }
        .log-card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .log-detail-row {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .detail-label {
          font-weight: 600;
          color: #475569;
          font-size: 14px;
          min-width: 80px;
          flex-shrink: 0;
        }
        .pesan-content {
          flex: 1;
          font-size: 14px;
          color: #1e293b;
          line-height: 1.7;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
          background: #f8fafc;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .response-value {
          flex: 1;
          font-size: 14px;
          color: #059669;
          font-weight: 500;
        }
        .date-value {
          flex: 1;
          font-size: 13px;
          color: #64748b;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-success {
          background: #dcfce7;
          color: #166534;
        }
        .badge-danger {
          background: #fee2e2;
          color: #991b1b;
        }
        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }
        .badge-secondary {
          background: #f1f5f9;
          color: #475569;
        }

        @media (max-width: 768px) {
          .log-card {
            padding: 16px;
          }
          .log-info-line {
            font-size: 13px;
          }
          .log-detail-row {
            flex-direction: column;
            gap: 6px;
          }
          .detail-label {
            min-width: auto;
          }
          .pesan-content {
            font-size: 13px;
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}

