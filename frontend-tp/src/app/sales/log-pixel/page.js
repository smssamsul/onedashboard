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
  const [produkFilter, setProdukFilter] = useState("");
  const [products, setProducts] = useState([]);

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
      if (produkFilter) params.append("produk_id", produkFilter);

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
  }, [perPage, debouncedSearch, eventFilter, produkFilter, dateRange, startDate, endDate]);

  // Daftar produk untuk dropdown filter
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("/api/sales/produk", {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProducts(json.data);
        }
      } catch (err) {
        console.error("Gagal memuat daftar produk:", err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [debouncedSearch, perPage, eventFilter, produkFilter, dateRange, startDate, endDate, fetchLogs]);

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
          border: "1px solid var(--color-divider)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        }}>
          <div className="customers-search" style={{ flex: "1 1 260px", position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-secondary)" }} />
            <input
              type="text"
              placeholder="Cari Event, Pixel ID, Customer..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: "100%", padding: "10px 10px 10px 36px",
                borderRadius: "10px", border: "1px solid var(--color-border)",
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
                border: "1px solid var(--color-border)",
                outline: "none",
                fontSize: "0.9rem",
                color: "var(--color-text-primary)",
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
                  border: "1px solid var(--color-border)", outline: "none",
                  fontSize: "0.85rem", color: "var(--color-text-secondary)"
                }}
              />
              <span style={{ color: "var(--color-text-secondary)" }}>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: "9px 12px", borderRadius: "10px",
                  border: "1px solid var(--color-border)", outline: "none",
                  fontSize: "0.85rem", color: "var(--color-text-secondary)"
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
                border: "1px solid var(--color-border)",
                outline: "none",
                fontSize: "0.9rem",
                color: "var(--color-text-primary)",
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

          <div style={{ flex: "0 0 auto" }}>
            <select
              value={produkFilter}
              onChange={(e) => setProdukFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
                outline: "none",
                fontSize: "0.9rem",
                color: "var(--color-text-primary)",
                background: "white",
                cursor: "pointer",
                minWidth: "180px",
                maxWidth: "260px",
              }}
            >
              <option value="">Semua Produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }} />

          <button onClick={() => fetchLogs(1)} disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 15px",
              borderRadius: "10px", border: "1px solid var(--color-border)", background: "white",
              color: "var(--color-text-secondary)", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem"
            }}>
            <RefreshCw size={15} style={loading ? { animation: "spin 1s linear infinite" } : {}} />
            Refresh
          </button>
        </section>

        {/* TABLE */}
        <section style={{ background: "white", borderRadius: "16px", border: "1px solid var(--color-divider)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--color-divider)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>API Logs</p>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", marginTop: "2px" }}>Facebook Pixel Events</h3>
            </div>
            {loading && <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Memuat...</span>}
          </div>

          <div className="table-wrapper" style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
              <thead>
                <tr style={{ background: "var(--color-bg-default)", borderBottom: "2px solid var(--color-border)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>TANGGAL</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>EVENT</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>PIXEL ID</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>ORDER INFO</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>PRODUK</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.8rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>PAYLOAD</th>
                </tr>
              </thead>
              <tbody>
                {loading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: "1px solid var(--color-divider)" }}>
                      {/* Tanggal */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {fmtDate(log.create_at)}
                        <br/>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{log.source || 'N/A'}</span>
                      </td>

                      {/* Event */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          display: "inline-block", padding: "4px 8px", borderRadius: "6px",
                          background: "var(--color-success-lighter)", border: "1px solid #bbf7d0", color: "var(--color-success-dark)",
                          fontSize: "0.8rem", fontWeight: 600
                        }}>
                          {log.event_name || 'N/A'}
                        </span>
                      </td>

                      {/* Pixel ID */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--color-text-primary)", fontWeight: 500 }}>
                        {log.pixel_id || '-'}
                      </td>

                      {/* Order Info */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem" }}>
                        {log.order ? (
                          <div>
                            <div style={{ color: "var(--color-info-main)", fontWeight: 600 }}>{log.order.kode_order || '-'}</div>
                            <div style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>
                              {log.order.customer_rel?.nama || log.order.customer || '-'}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                        )}
                      </td>

                      {/* Produk */}
                      <td style={{ padding: "12px 16px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {log.produk ? log.produk.nama : '-'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {log.status == '1' || String(log.status).startsWith('2') ? (
                          <span style={{ color: "var(--color-success-main)", fontWeight: 600 }}>OK</span>
                        ) : (
                          <span style={{ color: "var(--color-error-main)", fontWeight: 600 }}>{log.status || 'ERR'}</span>
                        )}
                      </td>

                      {/* Payload */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {log.payload ? (
                          <>
                            <button
                              onClick={() => togglePayload(log.id)}
                              style={{
                                padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-border)",
                                background: "var(--color-bg-default)", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: "0.75rem",
                                fontWeight: 600
                              }}
                            >
                              {expandedPayload === log.id ? 'Sembunyikan' : 'Lihat'}
                            </button>
                            {expandedPayload === log.id && (
                              <div style={{
                                marginTop: "8px", padding: "8px", background: "var(--color-text-primary)",
                                borderRadius: "8px", color: "#a5b4fc", fontSize: "0.75rem",
                                textAlign: "left", whiteSpace: "pre-wrap", overflowX: "auto",
                                maxWidth: "300px"
                              }}>
                                {typeof log.payload === 'string' ? log.payload : JSON.stringify(log.payload, null, 2)}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--color-grey-300)" }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
                      Tidak ada data log
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {paginationInfo && (
            <div className="pagination-bar">
              <div className="pagination-bar__pagesize">
                <span>Tampilkan:</span>
                <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                  {PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Data</option>)}
                </select>
              </div>
              <div className="pagination-bar__nav">
                <button className="pagination-bar__btn" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                  ‹
                </button>
                <span className="pagination-bar__info">
                  Halaman {page} dari {paginationInfo.last_page} ({paginationInfo.total} total)
                </span>
                <button className="pagination-bar__btn" onClick={() => setPage(p => p + 1)} disabled={page >= paginationInfo.last_page}>
                  ›
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .data-table tbody tr:hover td { background: var(--color-bg-default); }
      `}</style>
    </Layout>
  );
}
