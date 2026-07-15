"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { FileText, Clock, CheckCircle, XCircle, X, ExternalLink } from "lucide-react";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/customers-premium.css";
import { getLogsFollowUp } from "@/lib/logsFollowUp";

// Helper hook
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// Status mapping
const STATUS_MAP = {
  pending: { label: "Pending", color: "#d97706", bg: "#fef3c7" },
  terkirim: { label: "Terkirim", color: "#059669", bg: "#d1fae5" },
  gagal: { label: "Gagal", color: "#dc2626", bg: "#fee2e2" },
};

const getLogStatus = (item) => {
  if (item.status === "1" || item.status === 1) return "terkirim";
  if (item.status === "0" || item.status === 0) return "gagal";
  return "pending";
};

const COLUMNS = ["#", "Customer", "Tipe", "Status", "Keterangan", "Waktu"];

export default function FollowupReportPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");
  const itemsPerPage = 25;

  // Modal States
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await getLogsFollowUp();
        console.log("📥 [REPORT] API Response:", res);

        const mappedLogs = (res.data || []).map((item) => {
          const status = getLogStatus(item);

          return {
            id: item.id,
            // Try different possible paths for order_id
            orderId: item.order_id || item.order || item.order_rel?.id || item.follup_rel?.order_id || item.id_order,
            customerName: item.customer_rel?.nama || "-",
            customerPhone: item.customer_rel?.wa || "-",
            customerEmail: item.customer_rel?.email || "-",
            keterangan: item.keterangan || "-",
            event: item.follup_rel?.nama || "-",
            eventPeriod: item.follup_rel?.event || "-",
            type: item.follup_rel?.type || "-",
            status: status,
            statusLabel: STATUS_MAP[status]?.label || status,
            waktu: item.create_at || item.update_at || "-",
            produk: item.follup_rel?.produk_rel?.nama || "-",
          };
        });
        setLogs(mappedLogs);
      } catch (err) {
        console.error("Gagal ambil data log follow up:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, []);

  const handleRowClick = async (log) => {
    if (!log.orderId) {
      console.warn("No Order ID for log:", log);
      // Still open modal but maybe empty or error
    }

    setSelectedLog(log);
    setIsModalOpen(true);
    setLoadingTimeline(true);
    setTimelineLogs([]);

    try {
      const token = localStorage.getItem("token");
      if (log.orderId) {
        const res = await fetch(`/api/sales/order/${log.orderId}/logs-follup`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const json = await res.json();

        let fetchedLogs = [];
        if (json.success) {
          if (Array.isArray(json.data)) {
            fetchedLogs = json.data;
          } else if (json.data && Array.isArray(json.data.logs)) {
            fetchedLogs = json.data.logs;
          }
        }

        if (fetchedLogs.length > 0) {
          // Sort by Date ASC (Earlier first) for timeline
          const sorted = fetchedLogs.sort((a, b) => new Date(a.created_at || a.create_at) - new Date(b.created_at || b.create_at));
          setTimelineLogs(sorted);
        } else {
          console.warn("Failed to fetch timeline or empty data", json);
          setTimelineLogs([]);
        }
      }
    } catch (e) {
      console.error("Error fetching timeline:", e);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (activeFilter !== "all") {
      result = result.filter((log) => log.status === activeFilter);
    }
    if (debouncedSearch.trim()) {
      const term = debouncedSearch.trim().toLowerCase();
      result = result.filter((log) =>
        [log.customerName, log.customerPhone, log.keterangan, log.event, log.produk]
          .join(" ")
          .toLowerCase()
          .includes(term)
      );
    }
    return result;
  }, [logs, debouncedSearch, activeFilter]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = useMemo(() => {
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, startIndex, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeFilter]);

  const countByStatus = useMemo(() => ({
    all: logs.length,
    pending: logs.filter((log) => log.status === "pending").length,
    terkirim: logs.filter((log) => log.status === "terkirim").length,
    gagal: logs.filter((log) => log.status === "gagal").length,
  }), [logs]);

  const summaryCards = [
    { label: "Total Log", value: countByStatus.all, icon: <FileText size={24} /> },
    { label: "Pending", value: countByStatus.pending, icon: <Clock size={24} /> },
    { label: "Terkirim", value: countByStatus.terkirim, icon: <CheckCircle size={24} /> },
    { label: "Gagal", value: countByStatus.gagal, icon: <XCircle size={24} /> },
  ];

  const filterTabs = [
    { key: "all", label: "Semua", count: countByStatus.all },
    { key: "pending", label: "Pending", count: countByStatus.pending },
    { key: "terkirim", label: "Terkirim", count: countByStatus.terkirim },
    { key: "gagal", label: "Gagal", count: countByStatus.gagal },
  ];

  const formatDateTime = (dateStr) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Layout title="Log Report Follow Up">
      <div className="dashboard-shell customers-shell">
        {/* SUMMARY CARDS */}
        <section className="dashboard-summary followup-summary">
          <article className="summary-card summary-card--combined summary-card--four-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">{summaryCards[0].icon}</div>
              <div><p className="summary-card__label">{summaryCards[0].label}</p><p className="summary-card__value">{summaryCards[0].value}</p></div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">{summaryCards[1].icon}</div>
              <div><p className="summary-card__label">{summaryCards[1].label}</p><p className="summary-card__value">{summaryCards[1].value}</p></div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">{summaryCards[2].icon}</div>
              <div><p className="summary-card__label">{summaryCards[2].label}</p><p className="summary-card__value">{summaryCards[2].value}</p></div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">{summaryCards[3].icon}</div>
              <div><p className="summary-card__label">{summaryCards[3].label}</p><p className="summary-card__value">{summaryCards[3].value}</p></div>
            </div>
          </article>
        </section>

        {/* FILTER TABS */}
        <section className="followup-filter-section">
          <div className="followup-filter-tabs">
            {filterTabs.map((tab) => (
              <button key={tab.key} className={`followup-filter-tab ${activeFilter === tab.key ? "active" : ""}`} onClick={() => setActiveFilter(tab.key)}>
                {tab.label} <span className="followup-filter-count">{tab.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* HERO SECTION */}
        <section className="dashboard-hero customers-hero">
          <div className="customers-toolbar">
            <div className="customers-search">
              <input type="search" placeholder="Cari customer, event, produk..." className="customers-search__input" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
              <span className="customers-search__icon pi pi-search" />
            </div>
          </div>
        </section>

        {/* TABLE PANEL */}
        <section className="panel customers-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Report</p>
              <h3 className="panel__title">Log Follow Up {activeFilter !== "all" ? `- ${filterTabs.find(t => t.key === activeFilter)?.label}` : ""}</h3>
            </div>
            <span className="panel__meta">{filteredLogs.length} log ditampilkan</span>
          </div>

          <div className="customers-table__wrapper">
            <div className="customers-table">
              <div className="customers-table__head">
                {COLUMNS.map((col) => <span key={col}>{col}</span>)}
              </div>
              <div className="customers-table__body">
                {loading ? (
                  <div className="customers-empty"><i className="pi pi-spin pi-spinner" style={{ fontSize: "24px", marginBottom: "12px" }} /><p>Memuat data...</p></div>
                ) : error ? (
                  <div className="customers-empty"><i className="pi pi-exclamation-triangle" style={{ fontSize: "24px", marginBottom: "12px", color: "#ef4444" }} /><p>Gagal memuat data</p></div>
                ) : filteredLogs.length === 0 ? (
                  <div className="customers-empty"><i className="pi pi-inbox" style={{ fontSize: "24px", marginBottom: "12px" }} /><p>Tidak ada data.</p></div>
                ) : (
                  paginatedData.map((log, i) => (
                    <div
                      className="customers-table__row clickable-row"
                      key={log.id}
                      onClick={() => handleRowClick(log)}
                      style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                    >
                      <div className="customers-table__cell">{startIndex + i + 1}</div>
                      <div className="customers-table__cell customers-table__cell--strong">
                        <div className="customer-info">
                          <span className="customer-name">{log.customerName}</span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{log.customerPhone}</span>
                        </div>
                      </div>
                      <div className="customers-table__cell"><span className="cell-text">{log.type}</span></div>
                      <div className="customers-table__cell"><span className={`followup-status-badge followup-status-badge--${log.status}`}>{log.statusLabel}</span></div>
                      <div className="customers-table__cell"><span className="cell-text cell-text--truncate cell-text--muted" title={log.keterangan}>{log.keterangan}</span></div>
                      <div className="customers-table__cell"><span className="cell-text cell-text--muted">{formatDateTime(log.waktu)}</span></div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="customers-pagination">
              <button className="customers-pagination__btn" onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))} disabled={currentPage === 1}><i className="pi pi-chevron-left" /></button>
              <span className="customers-pagination__info">Page {currentPage} of {totalPages}</span>
              <button className="customers-pagination__btn" onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}><i className="pi pi-chevron-right" /></button>
            </div>
          )}
        </section>
      </div>

      {/* MODAL TIMELINE */}
      {isModalOpen && selectedLog && (
        <>
          <div className="modal-overlay">
            <div className="modal-container">
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Timeline Customer</h3>
                  <p className="modal-subtitle">
                    {selectedLog.customerName} • {selectedLog.customerPhone}
                  </p>
                </div>
                <button onClick={closeModal} className="close-btn"><X size={20} /></button>
              </div>

              <div className="modal-body">
                {loadingTimeline ? (
                  <div className="loading-state">
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem', color: '#ff6c00' }}></i>
                    <p>Memuat timeline...</p>
                  </div>
                ) : timelineLogs.length === 0 ? (
                  <div className="empty-state">
                    <p>Tidak ada data timeline untuk ID Order ini.</p>
                    {!selectedLog.orderId && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>Warning: Log ini tidak memiliki Order ID.</p>}
                  </div>
                ) : (
                  <div className="timeline-wrapper">
                    {timelineLogs.map((item, idx) => {
                      // Tentukan warna/ikon berdasarkan tipe
                      const isStart = idx === 0;
                      const isLatest = idx === timelineLogs.length - 1;

                      // Keterangan Cleanup
                      let noteContent = item.keterangan || "Tidak ada keterangan";
                      try {
                        // Extract only 'Pesan: ...' part if exists, ignoring Response JSON
                        const messageMatch = noteContent.match(/Pesan:\s*(.*?)\s*(?:Response:|(?={"code":))/s);
                        if (messageMatch && messageMatch[1]) {
                          noteContent = `Pesan: ${messageMatch[1].trim()}`;
                        }
                      } catch (e) {
                        // fallback use original
                      }

                      return (
                        <div className="timeline-item" key={idx}>
                          <div className="timeline-connector">
                            <div className="timeline-dot"></div>
                            {!isLatest && <div className="timeline-line"></div>}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-type">
                                {item.follup_rel?.nama || item.type_label || `Event ${item.type}`}
                              </span>
                              <time className="timeline-time">
                                {formatDateTime(item.created_at || item.create_at)}
                              </time>
                            </div>
                            <div className="timeline-card">
                              <p className="timeline-note">
                                {noteContent}
                              </p>
                              {item.produk_rel?.nama && (
                                <div className="timeline-product">
                                  <ExternalLink size={12} style={{ marginRight: 4 }} />
                                  {item.produk_rel.nama}
                                </div>
                              )}
                              <div className="timeline-status-row">
                                {item.status !== null && (
                                  <span className={`status-badge status-${item.status == 1 ? 'sent' : item.status == 0 ? 'failed' : 'pending'}`}>
                                    {item.status == 1 ? 'Terkirim' : item.status == 0 ? 'Gagal' : 'Pending'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5);
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(4px);
                }
                .modal-container {
                    background: white;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    background: #f8fafc;
                }
                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #0f172a;
                }
                .modal-subtitle {
                    margin: 4px 0 0 0;
                    font-size: 0.9rem;
                    color: #64748b;
                }
                .close-btn {
                    background: none;
                    border: none;
                    color: #94a3b8;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }
                .close-btn:hover { background: #e2e8f0; color: #ef4444; }
                
                .modal-body {
                    padding: 1.5rem;
                    overflow-y: auto;
                    flex: 1;
                }
                
                .loading-state, .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: #64748b;
                }
                
                /* TIMELINE STYLES */
                .timeline-wrapper {
                    padding-left: 0.5rem;
                }
                .timeline-item {
                    display: flex;
                    gap: 1rem;
                    position: relative;
                    padding-bottom: 1.5rem;
                }
                .timeline-connector {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    width: 24px;
                    flex-shrink: 0;
                }
                .timeline-dot {
                    width: 12px;
                    height: 12px;
                    background: #ff6c00;
                    border-radius: 50%;
                    box-shadow: 0 0 0 4px #fff8f1;
                    z-index: 2;
                }
                .timeline-line {
                    flex: 1;
                    width: 2px;
                    background: #e2e8f0;
                    margin-top: 4px;
                    min-height: 40px;
                }
                .timeline-content {
                    flex: 1;
                }
                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }
                .timeline-type {
                    font-weight: 600;
                    color: #1e293b;
                    font-size: 0.95rem;
                }
                .timeline-time {
                    font-size: 0.8rem;
                    color: #94a3b8;
                }
                .timeline-card {
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 12px;
                }
                .timeline-note {
                    margin: 0 0 8px 0;
                    color: #334155;
                    font-size: 0.9rem;
                    line-height: 1.5;
                    overflow-wrap: break-word;
                    word-break: break-word;
                }
                .timeline-product {
                    display: inline-flex;
                    align-items: center;
                    font-size: 0.8rem;
                    color: #2563eb;
                    background: #eff6ff;
                    padding: 2px 8px;
                    border-radius: 4px;
                    margin-bottom: 8px;
                }
                .status-badge {
                    display: inline-block;
                    font-size: 0.75rem;
                    padding: 2px 8px;
                    border-radius: 99px;
                    font-weight: 600;
                }
                .status-sent { background: #d1fae5; color: #059669; }
                .status-failed { background: #fee2e2; color: #dc2626; }
                .status-pending { background: #fef3c7; color: #d97706; }
                
                .customers-table__row:hover {
                    background-color: #f8fafc;
                }
            `}</style>
        </>
      )}
    </Layout>
  );
}
