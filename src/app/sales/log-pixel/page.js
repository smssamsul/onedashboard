"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { RefreshCw, Search, Activity, Box, ShoppingCart, Info } from "lucide-react";
import { toastError } from "@/lib/toast";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";

const PER_PAGE_OPTIONS = [15, 25, 50, 100];

function useDebouncedValue(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const fmtDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateStr;
  }
};

export default function LogPixelPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  
  // State Filter Tanggal
  const [dateRange, setDateRange] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const debouncedSearch = useDebouncedValue(searchInput, 500);

  const [expandedPayload, setExpandedPayload] = useState(null);

  const fetchLogs = useCallback(async (pageNumber = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const params = new URLSearchParams();
      params.append("page", pageNumber);
      params.append("per_page", perPage);
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (eventFilter) params.append("event_name", eventFilter);

      // Hitung filter tanggal
      let sd = "";
      let ed = "";
      if (dateRange === "7days") {
        const d = new Date();
        ed = d.toISOString().split("T")[0];
        d.setDate(d.getDate() - 7);
        sd = d.toISOString().split("T")[0];
      } else if (dateRange === "30days") {
        const d = new Date();
        ed = d.toISOString().split("T")[0];
        d.setDate(d.getDate() - 30);
        sd = d.toISOString().split("T")[0];
      } else if (dateRange === "custom") {
        sd = startDate;
        ed = endDate;
      }

      if (sd) params.append("start_date", sd);
      if (ed) params.append("end_date", ed);

      const res = await fetch(`/api/sales/pixel-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
        setPaginationInfo(json.pagination);
      } else {
        setLogs([]);
        setPaginationInfo(null);
      }
    } catch (err) {
      console.error(err);
      toastError("Gagal memuat log pixel");
    } finally {
      setLoading(false);
    }
  }, [perPage, debouncedSearch, eventFilter, dateRange, startDate, endDate]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [debouncedSearch, perPage, eventFilter, dateRange, startDate, endDate, fetchLogs]);

  useEffect(() => {
    if (page > 1) {
      fetchLogs(page);
    }
  }, [page, fetchLogs]);

  const togglePayload = (id) => {
    setExpandedPayload(prev => (prev === id ? null : id));
  };

  return (
    <Layout title="Log Pixel">
      <div className="dashboard-shell table-shell">
        {/* TOOLBAR */}
        <section style={{
          background: "white", borderRadius: "16px",
          padding: "1rem 1.5rem", marginBottom: "1.5rem",
          border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        }}>
          <div className="customers-search" style={{ flex: "1 1 260px", position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Cari Event, Pixel ID, Customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: "100%", padding: "10px 10px 10px 36px",
                borderRadius: "10px", border: "1px solid #e2e8f0",
                outline: "none", fontSize: "0.9rem"
              }}
            />
          </div>

          <div style={{ flex: "0 0 auto" }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                outline: "none",
                fontSize: "0.9rem",
                color: "#334155",
                background: "white",
                cursor: "pointer",
                minWidth: "150px"
              }}
            >
              <option value="all">Semua Waktu</option>
              <option value="7days">7 Hari Terakhir</option>
              <option value="30days">30 Hari Terakhir</option>
              <option value="custom">Pilih Tanggal...</option>
            </select>
          </div>

          {dateRange === "custom" && (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: "9px 12px", borderRadius: "10px",
                  border: "1px solid #e2e8f0", outline: "none",
                  fontSize: "0.85rem", color: "#475569"
                }}
              />
              <span style={{ color: "#94a3b8" }}>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: "9px 12px", borderRadius: "10px",
                  border: "1px solid #e2e8f0", outline: "none",
                  fontSize: "0.85rem", color: "#475569"
                }}
              />
            </div>
          )}

          <div style={{ flex: "0 0 auto" }}>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                outline: "none",
                fontSize: "0.9rem",
                color: "#334155",
                background: "white",
                cursor: "pointer",
                minWidth: "150px"
              }}
            >
              <option value="">Semua Event</option>
              <option value="Purchase">Purchase</option>
              <option value="Lead">Lead</option>
              <option value="AddPaymentInfo">AddPaymentInfo</option>
            </select>
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={() => fetchLogs(1)} disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 15px",
              borderRadius: "10px", border: "1px solid #e2e8f0", background: "white",
              color: "#6b7280", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem"
            }}>
            <RefreshCw size={15} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
            Refresh
          </button>
        </section>

        {/* TABLE */}
        <section style={{ background: "white", borderRadius: "16px", border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>API Logs</p>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>Facebook Pixel Events</h3>
            </div>
            {loading && <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Memuat...</span>}
          </div>

          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>TANGGAL</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>EVENT</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>PIXEL ID</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>ORDER INFO</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>PRODUK</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>PAYLOAD</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Tanggal */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#475569" }}>
                        {fmtDate(log.create_at)}
                        <br/>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>{log.source || 'N/A'}</span>
                      </td>

                      {/* Event */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 8px", borderRadius: "6px",
                          background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534",
                          fontSize: "0.8rem", fontWeight: 600
                        }}>
                          {log.event_name || 'N/A'}
                        </span>
                      </td>

                      {/* Pixel ID */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#0f172a", fontWeight: 500 }}>
                        {log.pixel_id || '-'}
                      </td>

                      {/* Order Info */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem" }}>
                        {log.order ? (
                          <div>
                            <div style={{ color: "#0ea5e9", fontWeight: 600 }}>{log.order.kode_order || '-'}</div>
                            <div style={{ color: "#64748b", fontSize: "0.8rem" }}>
                              {log.order.customer_rel?.nama || log.order.customer || '-'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                      </td>

                      {/* Produk */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "#475569" }}>
                        {log.produk ? log.produk.nama : '-'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {log.status == '1' || String(log.status).startsWith('2') ? (
                          <span style={{ color: "#22c55e", fontWeight: 600 }}>OK</span>
                        ) : (
                          <span style={{ color: "#ef4444", fontWeight: 600 }}>{log.status || 'ERR'}</span>
                        )}
                      </td>

                      {/* Payload */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {log.payload ? (
                          <>
                            <button
                              onClick={() => togglePayload(log.id)}
                              style={{
                                padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0",
                                background: "#f8fafc", color: "#475569", cursor: "pointer", fontSize: "0.75rem",
                                fontWeight: 600
                              }}
                            >
                              {expandedPayload === log.id ? 'Sembunyikan' : 'Lihat'}
                            </button>
                            {expandedPayload === log.id && (
                              <div style={{
                                marginTop: "8px", padding: "8px", background: "#1e293b",
                                borderRadius: "8px", color: "#a5b4fc", fontSize: "0.75rem",
                                textAlign: "left", whiteSpace: "pre-wrap", overflowX: "auto",
                                maxWidth: "300px"
                              }}>
                                {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload, null, 2)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#94a3b8" }}>
                      Tidak ada data log
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {paginationInfo && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Tampilkan:</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}
                  style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", outline: "none", cursor: "pointer" }}>
                  {PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Data</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: page <= 1 ? "#f8fafc" : "white", color: page <= 1 ? "#cbd5e1" : "#374151", cursor: page <= 1 ? "not-allowed" : "pointer" }}>
                  ‹
                </button>
                <span style={{ fontSize: "0.875rem", color: "#64748b", fontWeight: 500 }}>
                  Halaman {page} dari {paginationInfo.last_page} ({paginationInfo.total} total)
                </span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= paginationInfo.last_page}
                  style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: page >= paginationInfo.last_page ? "#f8fafc" : "white", color: page >= paginationInfo.last_page ? "#cbd5e1" : "#374151", cursor: page >= paginationInfo.last_page ? "not-allowed" : "pointer" }}>
                  ›
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .data-table tbody tr:hover td { background: #f8fafc; }
      `}</style>
    </Layout>
  );
}
