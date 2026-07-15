"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/customers-premium.css";
import { getLogsFollowUp } from "@/lib/logsFollowUp";

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

// Determine status from log item
// Backend: status = "1" (terkirim), "0" (gagal), null (pending/belum terkirim)
const getLogStatus = (item) => {
  // Cek field status dari log
  if (item.status === "1" || item.status === 1) {
    return "terkirim";
  }
  
  if (item.status === "0" || item.status === 0) {
    return "gagal";
  }
  
  // null atau undefined = pending
  return "pending";
};

const COLUMNS = ["#", "Customer", "Event", "Produk", "Status", "Keterangan", "Waktu"];

export default function FollowupReportPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");
  const itemsPerPage = 25;

  useEffect(() => {
    async function loadLogs() {
      try {
        const res = await getLogsFollowUp();
        console.log("📥 [REPORT] API Response:", res);
        
        const mappedLogs = (res.data || []).map((item) => {
          const status = getLogStatus(item);
          console.log("[REPORT] Log item:", item.id, "status:", item.status, "→", status);
          
          return {
            id: item.id,
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
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = useMemo(() => {
    return filteredLogs.slice(startIndex, endIndex);
  }, [filteredLogs, startIndex, endIndex]);

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

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "-") return "-";
    try {
      return new Date(dateStr).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Layout title="Log Report Follow Up">
      <div className="dashboard-shell customers-shell">
        {/* HERO SECTION */}
        <section className="dashboard-hero customers-hero">
          <div className="customers-toolbar">
            <div className="customers-search">
              <input
                type="search"
                placeholder="Cari customer, event, produk..."
                className="customers-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="customers-search__icon pi pi-search" />
            </div>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="dashboard-summary followup-summary">
          <article className="summary-card summary-card--combined summary-card--four-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                {summaryCards[0].icon}
              </div>
              <div>
                <p className="summary-card__label">{summaryCards[0].label}</p>
                <p className="summary-card__value">{summaryCards[0].value}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                {summaryCards[1].icon}
              </div>
              <div>
                <p className="summary-card__label">{summaryCards[1].label}</p>
                <p className="summary-card__value">{summaryCards[1].value}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                {summaryCards[2].icon}
              </div>
              <div>
                <p className="summary-card__label">{summaryCards[2].label}</p>
                <p className="summary-card__value">{summaryCards[2].value}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                {summaryCards[3].icon}
              </div>
              <div>
                <p className="summary-card__label">{summaryCards[3].label}</p>
                <p className="summary-card__value">{summaryCards[3].value}</p>
              </div>
            </div>
          </article>
        </section>

        {/* FILTER TABS */}
        <section className="followup-filter-section">
          <div className="followup-filter-tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                className={`followup-filter-tab ${activeFilter === tab.key ? "active" : ""}`}
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.label}
                <span className="followup-filter-count">{tab.count}</span>
              </button>
            ))}
          </div>
        </section>

        {/* TABLE PANEL */}
        <section className="panel customers-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Report</p>
              <h3 className="panel__title">
                Log Follow Up {activeFilter !== "all" ? `- ${filterTabs.find(t => t.key === activeFilter)?.label}` : ""}
              </h3>
            </div>
            <span className="panel__meta">
              {filteredLogs.length} log ditampilkan
            </span>
          </div>

          <div className="customers-table__wrapper">
            <div className="customers-table">
              {/* TABLE HEAD */}
              <div className="customers-table__head">
                {COLUMNS.map((col) => (
                  <span key={col}>{col}</span>
                ))}
              </div>

              {/* TABLE BODY */}
              <div className="customers-table__body">
                {loading ? (
                  <div className="customers-empty">
                    <i className="pi pi-spin pi-spinner" style={{ fontSize: "24px", marginBottom: "12px" }} />
                    <p>Memuat data log follow up...</p>
                  </div>
                ) : error ? (
                  <div className="customers-empty">
                    <i className="pi pi-exclamation-triangle" style={{ fontSize: "24px", marginBottom: "12px", color: "#ef4444" }} />
                    <p>Gagal memuat data log follow up</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="customers-empty">
                    <i className="pi pi-inbox" style={{ fontSize: "24px", marginBottom: "12px" }} />
                    <p>{logs.length ? "Tidak ada log yang cocok dengan filter." : "Belum ada data log follow up."}</p>
                  </div>
                ) : (
                  paginatedData.map((log, i) => (
                    <div className="customers-table__row" key={log.id}>
                      <div className="customers-table__cell" data-label="#">
                        {startIndex + i + 1}
                      </div>
                      <div className="customers-table__cell customers-table__cell--strong" data-label="Customer">
                        <div className="customer-info">
                          <span className="customer-name">{log.customerName}</span>
                          {log.customerPhone && log.customerPhone !== "-" && (
                            <a
                              href={`https://wa.me/${log.customerPhone.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="wa-link"
                              title={`Chat WhatsApp ${log.customerPhone}`}
                            >
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="#25D366">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              <span>{log.customerPhone}</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="customers-table__cell" data-label="Event">
                        <span className="cell-text">{log.event}</span>
                      </div>
                      <div className="customers-table__cell" data-label="Produk">
                        <span className="cell-text cell-text--truncate" title={log.produk}>
                          {log.produk}
                        </span>
                      </div>
                      <div className="customers-table__cell" data-label="Status">
                        <span
                          className={`followup-status-badge followup-status-badge--${log.status}`}
                        >
                          {log.statusLabel}
                        </span>
                      </div>
                      <div className="customers-table__cell" data-label="Keterangan">
                        <span className="cell-text cell-text--truncate cell-text--muted" title={log.keterangan}>
                          {log.keterangan}
                        </span>
                      </div>
                      <div className="customers-table__cell" data-label="Waktu">
                        <span className="cell-text cell-text--muted">
                          {formatDate(log.waktu)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="customers-pagination">
              <button
                className="customers-pagination__btn"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <i className="pi pi-chevron-left" />
              </button>
              <span className="customers-pagination__info">
                Page {currentPage} of {totalPages} ({filteredLogs.length} total)
              </span>
              <button
                className="customers-pagination__btn"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <i className="pi pi-chevron-right" />
              </button>
            </div>
          )}
        </section>
      </div>

    </Layout>
  );
}

