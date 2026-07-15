"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/customers-premium.css";
import "@/styles/sales/leads.css";
import "@/styles/sales/shared-table.css";
import { toastSuccess, toastError, toastWarning } from "@/lib/toast";

// Lazy load modals - reuse dari customers
const ViewCustomerModal = dynamic(
  () => import("../customers/viewCustomer"),
  { ssr: false }
);
const EditCustomerModal = dynamic(
  () => import("../customers/editCustomer"),
  { ssr: false }
);
const AddFollowupModal = dynamic(
  () => import("./addFollowupModal"),
  { ssr: false }
);

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

function useDebouncedValue(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Score label config ────────────────────────────────────
const SCORE_LABELS = [
  { value: "all",  label: "Semua Label" },
  { value: "hot",  label: "Hot"  },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

const SCORE_CONFIG = {
  hot:  { bg: "#fff1f2", border: "#fca5a5", color: "#b91c1c", label: "HOT"  },
  warm: { bg: "#fffbeb", border: "#fcd34d", color: "#92400e", label: "WARM" },
  cold: { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af", label: "COLD" },
};

// ── Format date ringkas ───────────────────────────────────
const fmt = (dateStr) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Hari ini";
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays} hari lalu`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} mgg lalu`;
    return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
};

export default function CustomersLeadPage() {
  // ── State ────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState(null);
  const [perPage, setPerPage] = useState(15);
  const [apiStats, setApiStats] = useState({ total: 0, hot: 0, warm: 0, cold: 0 });

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 500);

  const [salesFilter, setSalesFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [produkFilter, setProdukFilter] = useState([]);
  const [salesOptions, setSalesOptions] = useState([]);
  const [produkOptions, setProdukOptions] = useState([]);
  const [showSalesDropdown, setShowSalesDropdown] = useState(false);
  const [showScoreDropdown, setShowScoreDropdown] = useState(false);
  const [showProdukDropdown, setShowProdukDropdown] = useState(false);
  const salesDropdownRef = useRef(null);
  const scoreDropdownRef = useRef(null);
  const produkDropdownRef = useRef(null);

  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedFollowupDetail, setSelectedFollowupDetail] = useState(null);

  const fetchingRef = useRef(false);
  const isFirstMount = useRef(true);

  // ── Fetch customers ──────────────────────────────────────
  const fetchCustomers = useCallback(async (pageNumber = 1) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) { setLoading(false); fetchingRef.current = false; return; }

      const params = new URLSearchParams();
      params.append("page", pageNumber);
      params.append("per_page", perPage);
      if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());
      if (salesFilter !== "all")  params.append("sales_id", salesFilter);
      if (scoreFilter !== "all")  params.append("score_label", scoreFilter);
      if (produkFilter.length > 0) params.append("produk_id", produkFilter.join(","));

      const res = await fetch(`/api/sales/customer/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setCustomers(json.data);
        if (json.pagination) {
          setHasMore(json.pagination.current_page < json.pagination.last_page);
          setPaginationInfo(json.pagination);
        } else {
          setHasMore(json.data.length >= perPage);
          setPaginationInfo(null);
        }
        if (json.stats) setApiStats(json.stats);
      } else {
        setCustomers([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      toastError("Gagal memuat data lead");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [perPage, debouncedSearch, salesFilter, scoreFilter, produkFilter]);

  // ── Fetch sales and produk list ─────────────────────────────────────
  useEffect(() => {
    async function fetchOptions() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const [salesRes, produkRes] = await Promise.all([
          fetch("/api/sales/sales-list", { headers }),
          fetch("/api/sales/produk", { headers })
        ]);
        
        const salesJson = await salesRes.json();
        if (salesJson.success && Array.isArray(salesJson.data)) {
          setSalesOptions(salesJson.data.map((s) => ({
            id:   String(s.user_rel?.id  || s.id),
            nama: s.user_rel?.nama || s.nama,
          })));
        }

        const produkJson = await produkRes.json();
        if (produkJson.success && Array.isArray(produkJson.data)) {
          setProdukOptions(produkJson.data.map((p) => ({
            id: String(p.id),
            nama: p.nama,
          })));
        }
      } catch {}
    }
    fetchOptions();
  }, []);

  // ── Dropdown outside click ───────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (salesDropdownRef.current && !salesDropdownRef.current.contains(e.target)) setShowSalesDropdown(false);
      if (scoreDropdownRef.current && !scoreDropdownRef.current.contains(e.target)) setShowScoreDropdown(false);
      if (produkDropdownRef.current && !produkDropdownRef.current.contains(e.target)) setShowProdukDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Effects ──────────────────────────────────────────────
  useEffect(() => {
    fetchCustomers(1);
    isFirstMount.current = false;
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (isFirstMount.current) return;
    setPage(1);
    fetchCustomers(1);
    // eslint-disable-next-line
  }, [debouncedSearch, salesFilter, scoreFilter, perPage]);

  useEffect(() => {
    if (!isFirstMount.current && page > 1) fetchCustomers(page);
    // eslint-disable-next-line
  }, [page]);

  // ── Handlers ─────────────────────────────────────────────
  const requestRefresh = useCallback(async (msg, type = "success") => {
    setPage(1);
    await fetchCustomers(1);
    if (msg) {
      if (type === "error") toastError(msg);
      else if (type === "warning") toastWarning(msg);
      else toastSuccess(msg);
    }
  }, [fetchCustomers]);

  const handleUpdateLabel = useCallback(async (cust, newLabel) => {
    if (!newLabel || newLabel === cust.score_label) return;
    setUpdatingId(cust.id);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/customer/${cust.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score_label: newLabel }),
      });
      const json = await res.json();
      if (json.success) {
        // Update local state tanpa re-fetch
        setCustomers(prev =>
          prev.map(c =>
            c.id === cust.id ? { ...c, score_label: newLabel } : c
          )
        );
        toastSuccess(`Label "${cust.nama}" diubah ke ${newLabel.toUpperCase()}`);
      } else {
        toastError(json.message || "Gagal mengupdate label");
      }
    } catch (err) {
      toastError("Terjadi kesalahan: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  // ── Render ───────────────────────────────────────────────
  const totalLeads = paginationInfo?.total ?? apiStats.total;
  const activeFilters = salesFilter !== "all" || scoreFilter !== "all" || debouncedSearch.trim();

  return (
    <Layout title="Lead Customers">
      <div className="dashboard-shell customers-shell table-shell">

        {/* ── SUMMARY CARDS ── */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "1.25rem", marginBottom: "1.5rem" }}>
          {/* Total */}
          <SummaryCard
            bg="linear-gradient(135deg,#f0f9ff,#e0f2fe)"
            border="#bae6fd"
            label="Total Lead"
            value={totalLeads}
            shadow="rgba(14,165,233,0.15)"
          />
          {/* Hot */}
          <SummaryCard
            bg="linear-gradient(135deg,#fff1f2,#fee2e2)"
            border="#fca5a5"
            label="Hot"
            value={apiStats.hot}
            shadow="rgba(239,68,68,0.15)"
            onClick={() => setScoreFilter(scoreFilter === "hot" ? "all" : "hot")}
            active={scoreFilter === "hot"}
          />
          {/* Warm */}
          <SummaryCard
            bg="linear-gradient(135deg,#fffbeb,#fef3c7)"
            border="#fcd34d"
            label="Warm"
            value={apiStats.warm}
            shadow="rgba(245,158,11,0.15)"
            onClick={() => setScoreFilter(scoreFilter === "warm" ? "all" : "warm")}
            active={scoreFilter === "warm"}
          />
          {/* Cold */}
          <SummaryCard
            bg="linear-gradient(135deg,#eff6ff,#dbeafe)"
            border="#93c5fd"
            label="Cold"
            value={apiStats.cold}
            shadow="rgba(59,130,246,0.15)"
            onClick={() => setScoreFilter(scoreFilter === "cold" ? "all" : "cold")}
            active={scoreFilter === "cold"}
          />
        </section>


        {/* ── TOOLBAR ── */}
        <section style={{
          background: "white", borderRadius: "16px",
          padding: "1rem 1.5rem", marginBottom: "1.5rem",
          border: "1px solid #f1f5f9", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        }}>
          {/* Search */}
          <div className="customers-search" style={{ flex: "1 1 260px" }}>
            <input
              type="search"
              placeholder="Cari nama, WA, panggilan..."
              className="customers-search__input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <span className="customers-search__icon pi pi-search" />
          </div>

          {/* Score filter */}
          <div ref={scoreDropdownRef} style={{ position: "relative" }}>
            <FilterBtn
              label={SCORE_LABELS.find(s => s.value === scoreFilter)?.label || "Label"}
              active={scoreFilter !== "all"}
              onClick={() => { setShowScoreDropdown(p => !p); setShowSalesDropdown(false); setShowProdukDropdown(false); }}
            />
            {showScoreDropdown && (
              <DropdownMenu
                options={SCORE_LABELS}
                selected={scoreFilter}
                onSelect={(v) => { setScoreFilter(v); setShowScoreDropdown(false); }}
              />
            )}
          </div>

            {/* Produk Filter Dropdown */}
            <div className="orders-filter__group" ref={produkDropdownRef} style={{ position: "relative" }}>
              <button
                className={`orders-filter__btn ${produkFilter.length > 0 ? "orders-filter__btn--active" : ""}`}
                onClick={() => { setShowProdukDropdown(!showProdukDropdown); setShowScoreDropdown(false); setShowSalesDropdown(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 16px", borderRadius: "10px",
                  border: produkFilter.length > 0 ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                  background: produkFilter.length > 0 ? "#eff6ff" : "#fff",
                  color: produkFilter.length > 0 ? "#1d4ed8" : "#475569",
                  fontWeight: 500, fontSize: "0.875rem", cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <i className="pi pi-box" style={{ fontSize: "0.9rem" }} />
                <span>
                  {produkFilter.length === 0 ? "Semua Produk" : `${produkFilter.length} Produk`}
                </span>
                <i className={`pi pi-chevron-down ${showProdukDropdown ? "rotated" : ""}`} style={{ fontSize: "0.7rem", transition: "transform 0.2s" }} />
              </button>

              {showProdukDropdown && (
                <div style={{
                  position: "absolute", top: "100%", left: 0, marginTop: "8px",
                  width: "280px", background: "#fff", border: "1px solid #e2e8f0",
                  borderRadius: "12px", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  zIndex: 50, padding: "8px",
                  maxHeight: "300px", overflowY: "auto"
                }}>
                  <div style={{ padding: "8px", fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Filter Produk
                  </div>
                  <button
                    onClick={() => { setProdukFilter([]); setPage(1); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      width: "100%", padding: "10px 12px", borderRadius: "8px",
                      border: "none", background: produkFilter.length === 0 ? "#f1f5f9" : "transparent",
                      color: produkFilter.length === 0 ? "#0f172a" : "#475569",
                      fontWeight: produkFilter.length === 0 ? 600 : 400,
                      textAlign: "left", cursor: "pointer", fontSize: "0.875rem", transition: "all 0.15s"
                    }}
                  >
                    Semua Produk
                    {produkFilter.length === 0 && <i className="pi pi-check" style={{ color: "#3b82f6", fontSize: "0.8rem" }} />}
                  </button>

                  {produkOptions.map((opt) => {
                    const isSelected = produkFilter.includes(opt.id);
                    return (
                    <button
                      key={opt.id}
                      onClick={() => { 
                        setProdukFilter(prev => isSelected ? prev.filter(id => id !== opt.id) : [...prev, opt.id]); 
                        setPage(1); 
                      }}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        width: "100%", padding: "10px 12px", borderRadius: "8px",
                        border: "none", background: isSelected ? "#f1f5f9" : "transparent",
                        color: isSelected ? "#0f172a" : "#475569",
                        fontWeight: isSelected ? 600 : 400,
                        textAlign: "left", cursor: "pointer", fontSize: "0.875rem", transition: "all 0.15s"
                      }}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{opt.nama}</span>
                      {isSelected && <i className="pi pi-check" style={{ color: "#3b82f6", fontSize: "0.8rem" }} />}
                    </button>
                    );
                  })}
                </div>
              )}
            </div>

          {/* Sales filter */}
          <div ref={salesDropdownRef} style={{ position: "relative" }}>
            <FilterBtn
              label={salesFilter !== "all" ? salesOptions.find(s => s.id === salesFilter)?.nama || "Sales" : "Filter Sales"}
              active={salesFilter !== "all"}
              onClick={() => { setShowSalesDropdown(p => !p); setShowScoreDropdown(false); setShowProdukDropdown(false); }}
            />
            {showSalesDropdown && (
              <DropdownMenu
                options={[{ value: "all", label: "Semua Sales" }, ...salesOptions.map(s => ({ value: s.id, label: s.nama }))]}
                selected={salesFilter}
                onSelect={(v) => { setSalesFilter(v); setShowSalesDropdown(false); }}
              />
            )}
          </div>

          {/* Reset */}
          {activeFilters && (
            <button onClick={() => { setSalesFilter("all"); setScoreFilter("all"); setSearchInput(""); }}
              style={{ padding:"8px 13px", borderRadius:"10px",
                border:"1px solid #fca5a5", background:"#fff1f2", color:"#dc2626",
                fontWeight:500, cursor:"pointer", fontSize:"0.85rem" }}>
              Reset
            </button>
          )}

          <div style={{ flex: 1 }} />

          {/* Refresh */}
          <button onClick={() => requestRefresh(null)} disabled={loading}
            style={{ padding:"8px 15px", borderRadius:"10px",
              border:"1px solid #e2e8f0", background:"white", color:"#6b7280",
              cursor: loading ? "not-allowed":"pointer", fontSize:"0.875rem" }}>
            {loading ? "Memuat..." : "Refresh"}
          </button>
        </section>

        {/* ── TABLE ── */}
        <section style={{ background:"white", borderRadius:"16px", border:"1px solid #f1f5f9", boxShadow:"0 2px 8px rgba(0,0,0,0.04)", overflow:"hidden" }}>
          {/* Header */}
          <div style={{ padding:"1.25rem 1.5rem", borderBottom:"1px solid #f1f5f9", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div>
              <p style={{ fontSize:"0.72rem", color:"#94a3b8", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>CRM / Customer Lead</p>
              <h3 style={{ fontSize:"1.1rem", fontWeight:700, color:"#0f172a", marginTop:"2px" }}>Lead</h3>
            </div>
            {loading && <span style={{ fontSize:"0.85rem", color:"#94a3b8" }}><i className="pi pi-spin pi-spinner" /> Memuat...</span>}
          </div>

          {/* Table */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ minWidth: "130px" }}>NAMA</th>
                  <th style={{ minWidth: "130px" }}>NO WA</th>
                  <th style={{ minWidth: "100px" }}>LABEL</th>
                  <th style={{ minWidth: "160px" }}>MINAT PRODUK</th>
                  <th style={{ minWidth: "200px" }}>LAST FOLLOW UP</th>
                  <th style={{ minWidth: "120px" }}>SALES</th>
                  <th style={{ minWidth: "170px" }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading && customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign:"center", padding:"3rem", color:"#94a3b8" }}>
                      <i className="pi pi-spin pi-spinner" style={{ fontSize:"1.5rem" }} />
                      <p style={{ marginTop:"0.5rem" }}>Memuat data...</p>
                    </td>
                  </tr>
                ) : customers.length > 0 ? (
                  customers.map((cust, i) => {
                    const scoreConf = SCORE_CONFIG[cust.score_label?.toLowerCase()] || null;
                    const followup  = cust.last_followup;

                    return (
                      <tr key={cust.id || i}>
                        {/* Nama */}
                        <td>
                          <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
                            <span
                              onClick={() => { setSelectedCustomer(cust); setShowView(true); }}
                              style={{ color:"#0ea5e9", fontWeight:600, cursor:"pointer", fontSize:"0.92rem" }}
                            >
                              {cust.nama || "-"}
                            </span>
                            {cust.nama_panggilan && (
                              <span style={{ fontSize:"0.73rem", color:"#94a3b8" }}>
                                {cust.sapaan} {cust.nama_panggilan}
                              </span>
                            )}
                            {cust.profesi && (
                              <span style={{ fontSize:"0.73rem", color:"#64748b" }}>{cust.profesi}</span>
                            )}
                          </div>
                        </td>

                        {/* No WA */}
                        <td>
                          {cust.wa ? (
                            <a href={`https://wa.me/${cust.wa.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                              style={{ color:"#22c55e", textDecoration:"none", fontSize:"0.87rem", fontWeight:500 }}>
                              {cust.wa}
                            </a>
                          ) : <span style={{ color:"#cbd5e1" }}>-</span>}
                        </td>

                        {/* Label hot/warm/cold */}
                        <td>
                          {scoreConf ? (
                            <span style={{
                              display:"inline-block",
                              padding:"4px 10px", borderRadius:"20px",
                              background: scoreConf.bg, border:`1px solid ${scoreConf.border}`,
                              color: scoreConf.color, fontWeight:700, fontSize:"0.72rem", letterSpacing:"0.05em",
                            }}>
                              {scoreConf.label}
                            </span>
                          ) : (
                            <span style={{ color:"#cbd5e1", fontSize:"0.82rem" }}>—</span>
                          )}
                        </td>

                        {/* Minat Produk */}
                        <td>
                          {cust.minat_produk ? (
                            <span style={{ fontSize:"0.85rem", color:"#7c3aed", fontWeight:500, lineHeight:1.4 }}>
                              {cust.minat_produk}
                            </span>
                          ) : (
                            <span style={{ color:"#cbd5e1", fontSize:"0.82rem" }}>—</span>
                          )}
                        </td>

                        {/* Last Follow Up */}
                        <td>
                          {followup ? (
                            <div 
                              onClick={() => setSelectedFollowupDetail(followup)}
                              style={{ display:"flex", flexDirection:"column", gap:"4px", cursor: "pointer", padding: "4px", borderRadius: "8px", transition: "background 0.2s" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              title="Klik untuk lihat detail followup"
                            >
                              <div style={{ display:"flex", alignItems:"center", gap:"6px", flexWrap:"wrap" }}>
                                <span style={{ fontSize:"0.78rem", color:"#64748b", fontWeight:600 }}>
                                  {fmt(followup.date)}
                                </span>
                                {followup.channel && (
                                  <span style={{
                                    padding:"1px 7px", borderRadius:"10px",
                                    background:"#f8fafc", border:"1px solid #e2e8f0",
                                    fontSize:"0.7rem", color:"#64748b",
                                  }}>
                                    {followup.channel}
                                  </span>
                                )}
                              </div>
                              {followup.note && (
                                <p style={{
                                  fontSize:"0.77rem", color:"#475569",
                                  margin:0, lineHeight:1.4,
                                  overflow:"hidden", display:"-webkit-box",
                                  WebkitLineClamp:2, WebkitBoxOrient:"vertical",
                                  maxWidth:"200px",
                                }}>
                                  <strong>Respon:</strong> {followup.note}
                                </p>
                              )}
                              {followup.keterangan && (
                                <p style={{
                                  fontSize:"0.77rem", color:"#94a3b8",
                                  margin:0, lineHeight:1.4,
                                  overflow:"hidden", display:"-webkit-box",
                                  WebkitLineClamp:1, WebkitBoxOrient:"vertical",
                                  maxWidth:"200px",
                                }}>
                                  {followup.keterangan}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize:"0.78rem", color:"#94a3b8", fontStyle:"italic" }}>
                              Belum ada followup
                            </span>
                          )}
                        </td>

                        {/* Sales */}
                        <td>
                          <span style={{
                            display:"inline-block", padding:"3px 10px",
                            borderRadius:"8px", background:"#f8fafc",
                            border:"1px solid #e2e8f0", fontSize:"0.82rem",
                            color:"#475569", fontWeight:500,
                          }}>
                            {cust.sales_rel?.nama || cust.sales_nama || (cust.sales_id ? `Sales #${cust.sales_id}` : "—")}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td>
                          <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                            <ActionBtn icon="pi-eye"   title="Lihat Detail"
                              onClick={() => { setSelectedCustomer(cust); setShowView(true); }} />
                            <ActionBtn icon="pi-pencil" title="Edit Lead"
                              onClick={() => { setSelectedCustomer(cust); setShowEdit(true); }} />
                            <ActionBtn icon="pi-comments" title="Catat Follow Up"
                              onClick={() => { setSelectedCustomer(cust); setShowAddFollowup(true); }} />

                            {/* Update Score Label */}
                            <select
                              value={cust.score_label || ""}
                              disabled={updatingId === cust.id}
                              onChange={(e) => handleUpdateLabel(cust, e.target.value)}
                              title="Update Status Lead"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: updatingId === cust.id ? "not-allowed" : "pointer",
                                outline: "none",
                                background: updatingId === cust.id ? "#f8fafc" :
                                  cust.score_label === "hot"  ? "#fff1f2" :
                                  cust.score_label === "warm" ? "#fffbeb" :
                                  cust.score_label === "cold" ? "#eff6ff" :
                                  "#f8fafc",
                                color: updatingId === cust.id ? "#94a3b8" :
                                  cust.score_label === "hot"  ? "#b91c1c" :
                                  cust.score_label === "warm" ? "#92400e" :
                                  cust.score_label === "cold" ? "#1e40af" :
                                  "#64748b",
                                minWidth: "80px",
                                opacity: updatingId === cust.id ? 0.6 : 1,
                              }}
                            >
                              <option value="">— Label</option>
                              <option value="hot">Hot</option>
                              <option value="warm">Warm</option>
                              <option value="cold">Cold</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign:"center", padding:"4rem 2rem", color:"#94a3b8" }}>
                      <p style={{ fontWeight:500 }}>
                        {activeFilters ? "Tidak ada lead yang sesuai filter" : "Belum ada data lead"}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
            padding:"1rem 1.5rem", borderTop:"1px solid #f1f5f9" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"0.5rem" }}>
              <span style={{ fontSize:"0.875rem", color:"#6b7280" }}>Tampilkan:</span>
              <select value={perPage}
                onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                style={{ padding:"4px 8px", borderRadius:"6px", border:"1px solid #e2e8f0",
                  fontSize:"0.875rem", outline:"none", cursor:"pointer", background:"#fff" }}>
                {PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt} Data</option>)}
              </select>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
              <PaginationBtn label="‹" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)} />
              <span style={{ fontSize:"0.875rem", color:"#64748b", fontWeight:500 }}>
                Halaman {page}{paginationInfo?.last_page ? ` dari ${paginationInfo.last_page} (${paginationInfo.total} total)` : ""}
              </span>
              <PaginationBtn label="›" disabled={!hasMore || loading} onClick={() => setPage(p => p + 1)} />
            </div>
          </div>
        </section>

        {/* ── MODALS ── */}
        {showAddFollowup && selectedCustomer && (
          <AddFollowupModal
            customer={selectedCustomer}
            onClose={() => { setShowAddFollowup(false); setSelectedCustomer(null); }}
            onSaveSuccess={() => {
              // Option to refresh the lead list here if necessary
            }}
          />
        )}

        {showView && selectedCustomer && (
          <ViewCustomerModal
            customer={selectedCustomer}
            onClose={() => { setShowView(false); setSelectedCustomer(null); }}
            onEdit={(c) => { setSelectedCustomer(c); setShowEdit(true); setShowView(false); }}
            onDelete={async (c) => {
              if (!confirm(`Hapus lead "${c.nama}"?`)) return;
              try {
                const token = localStorage.getItem("token");
                const res = await fetch(`/api/sales/customer/${c.id}`, {
                  method: "DELETE", headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res.json();
                if (json.success) { setShowView(false); await requestRefresh("Lead dihapus", "warning"); }
                else toastError(json.message || "Gagal menghapus");
              } catch (err) { toastError(err.message); }
            }}
          />
        )}
        {showEdit && selectedCustomer && (
          <EditCustomerModal
            customer={selectedCustomer}
            onClose={() => { setShowEdit(false); setSelectedCustomer(null); }}
            onSuccess={(msg, updated) => {
              setShowEdit(false);
              requestRefresh(msg || "Lead diupdate");
              if (updated) setSelectedCustomer(updated);
            }}
          />
        )}
      </div>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .data-table tbody tr:hover td { background:#f8fafc!important; }
        .data-table tbody tr { transition:background .12s; }
        .data-table td { vertical-align:top; padding:14px 12px!important; }
        
      `}</style>
      
      {/* Modal Detail Follow Up */}
      {selectedFollowupDetail && (
        <div className="modal-overlay" style={{ zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0 }} onClick={() => setSelectedFollowupDetail(null)}>
          <div className="modal-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Detail Follow Up</h2>
              <button onClick={() => setSelectedFollowupDetail(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Tanggal</span>
                <div style={{ color: '#0f172a', fontWeight: 500, marginTop: '4px' }}>{new Date(selectedFollowupDetail.date).toLocaleString('id-ID')}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Via / Channel</span>
                <div style={{ color: '#0f172a', fontWeight: 500, marginTop: '4px' }}>{selectedFollowupDetail.channel || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Respon</span>
                <div style={{ color: '#0f172a', fontWeight: 500, marginTop: '4px' }}>{selectedFollowupDetail.note || '-'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Keterangan / Catatan</span>
                <div style={{ color: '#0f172a', fontWeight: 500, marginTop: '4px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                  {selectedFollowupDetail.keterangan || '-'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button 
                onClick={() => setSelectedFollowupDetail(null)}
                style={{ padding: '0.5rem 1.25rem', background: '#2563eb', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Mini Components ───────────────────────────────────────

function SummaryCard({ bg, border, label, value, shadow, onClick, active }) {
  return (
    <article
      onClick={onClick}
      style={{
        background: bg, border: `1.5px solid ${active ? border : border}`,
        borderRadius:"14px", padding:"1.25rem",
        boxShadow: active ? `0 4px 16px ${shadow}` : `0 2px 8px ${shadow}`,
        cursor: onClick ? "pointer" : "default",
        transform: active ? "scale(1.02)" : "scale(1)",
        transition:"all 0.18s",
        outline: active ? `2px solid ${border}` : "none",
      }}>
      <p style={{ fontSize:"0.73rem", color:"#64748b", fontWeight:600, textTransform:"uppercase",
        letterSpacing:"0.05em", marginBottom:"6px" }}>
        {label}
      </p>
      <p style={{ fontSize:"1.9rem", fontWeight:800, color:"#0f172a", lineHeight:1 }}>
        {value ?? 0}
      </p>
    </article>
  );
}

function FilterBtn({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:"6px", padding:"8px 14px",
      borderRadius:"10px", border: active ? "1px solid #f59e0b" : "1px solid #e5e7eb",
      background: active ? "#fffbeb" : "white", color: active ? "#92400e" : "#374151",
      fontWeight:500, cursor:"pointer", fontSize:"0.875rem", whiteSpace:"nowrap",
    }}>
      {label} ▾
    </button>
  );
}

function DropdownMenu({ options, selected, onSelect }) {
  return (
    <div style={{
      position:"absolute", top:"calc(100% + 6px)", left:0, minWidth:"180px",
      background:"white", borderRadius:"12px", boxShadow:"0 8px 24px rgba(0,0,0,0.12)",
      border:"1px solid #f1f5f9", zIndex:200, overflow:"hidden",
    }}>
      {options.map(opt => (
        <button key={opt.value} type="button" onClick={() => onSelect(opt.value)} style={{
          width:"100%", padding:"9px 14px", textAlign:"left",
          background: selected === opt.value ? "#f0f9ff" : "transparent",
          border:"none", cursor:"pointer", color:"#374151",
          fontWeight: selected === opt.value ? 600 : 400, fontSize:"0.875rem",
          borderTop: opt.value !== options[0].value ? "1px solid #f8fafc" : "none",
        }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ActionBtn({ icon, title, onClick }) {
  return (
    <button className="customers-action-btn" title={title} onClick={onClick} style={{
      width:"32px", height:"32px", borderRadius:"8px",
      border:"1px solid #e2e8f0", background:"#f8fafc", color:"#64748b",
      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <i className={`pi ${icon}`} style={{ fontSize:"13px" }} />
    </button>
  );
}

function PaginationBtn({ label, disabled, onClick }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:"6px 14px", borderRadius:"8px",
      border:"1px solid #e2e8f0",
      background: disabled ? "#f8fafc" : "white",
      color: disabled ? "#cbd5e1" : "#374151",
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight:500, fontSize:"0.9rem",
    }}>
      {label}
    </button>
  );
}
