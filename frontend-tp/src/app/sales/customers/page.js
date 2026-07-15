"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getCustomers, deleteCustomer } from "@/lib/sales/customer";
import { Users, CheckCircle, Filter, ChevronDown, p, XCircle } from "lucide-react";
import dynamic from "next/dynamic";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/customers-premium.css";
import "@/styles/sales/leads.css";

import "@/styles/sales/shared-table.css";

// Lazy load modals
// Lazy load modals
const EditCustomerModal = dynamic(() => import("./editCustomer"), { ssr: false });
const ViewCustomerModal = dynamic(() => import("./viewCustomer"), { ssr: false });
const DeleteCustomerModal = dynamic(() => import("./deleteCustomer"), { ssr: false });
const AddCustomerModal = dynamic(() => import("./addCustomer"), { ssr: false });
const HistoryCustomerModal = dynamic(() => import("./historyCustomer"), { ssr: false });
const FollowupLogModal = dynamic(() => import("./followupLog"), { ssr: false });
const FilterCustomerModal = dynamic(() => import("./filterCustomer"), { ssr: false });
import CustomerOrderStatsCells from "./CustomerOrderStatsCells";

import { toastSuccess, toastError, toastWarning } from "@/lib/toast";

/**
 * Simple debounce hook to avoid rerunning expensive computations
 */
function useDebouncedValue(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const PER_PAGE_OPTIONS = [10, 15, 25, 50, 100];

export default function AdminCustomerPage() {
  const router = useRouter();
  // Pagination state dengan fallback pagination
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState([]);
  const [hasMore, setHasMore] = useState(true); // penentu masih ada halaman berikutnya
  const [loading, setLoading] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState(null); // Store pagination info from backend
  const [summaryInfo, setSummaryInfo] = useState(null); // Store summary info from backend
  const [perPage, setPerPage] = useState(15); // Data per halaman

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 500); // Debounce 500ms
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showFollowupLog, setShowFollowupLog] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  // State untuk nested modal (dari viewCustomer)
  const [showEditFromView, setShowEditFromView] = useState(false);
  const [showDeleteFromView, setShowDeleteFromView] = useState(false);

  // Filter state
  const [verifikasiFilter, setVerifikasiFilter] = useState("all");
  const [salesFilter, setSalesFilter] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [salesOptions, setSalesOptions] = useState([]); // List sales untuk dropdown

  // Convert filter untuk API (termasuk search)
  const filters = useMemo(() => ({
    verifikasi: verifikasiFilter,
    status: "all",
    dateRange: null,
    jenis_kelamin: "all",
    sales_id: salesFilter, // Add sales_id filter
    search: debouncedSearch.trim() || null,
    all: false, // Gunakan pagination
  }), [verifikasiFilter, salesFilter, debouncedSearch]);

  // Memoize summary statistics untuk performa
  const summaryStats = useMemo(() => {
    if (summaryInfo) {
      return {
        verified: summaryInfo.verified || 0,
        unverified: summaryInfo.unverified || 0,
        membershipCounts: summaryInfo.membership || {}
      };
    }

    const verified = customers.filter((c) => c.verifikasi === "1" || c.verifikasi === true).length;
    const unverified = customers.filter((c) => c.verifikasi !== "1" && c.verifikasi !== true).length;

    // Membership counts (local fallback)
    const membershipCounts = customers.reduce((acc, c) => {
      const type = c.keanggotaan || 'basic';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return { verified, unverified, membershipCounts };
  }, [customers, summaryInfo]);

  const [userMap, setUserMap] = useState(new Map());

  // Fetch users untuk Sales mapping
  useEffect(() => {
    async function fetchUsers() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const usersRes = await fetch("/api/admin/users", { headers });
        const usersJson = await usersRes.json();

        if (usersJson.success && Array.isArray(usersJson.data)) {
          const map = new Map();
          const options = [];

          usersJson.data.forEach((u) => {
            // Structure is direct: { id, nama, divisi, ... } based on JSON provided
            const userId = u.id;
            const nama = u.nama;
            const divisiId = u.divisi; // "3" is sales

            if (userId) {
              map.set(String(userId), nama);
              // Check division 3 for Sales
              if (String(divisiId) === '3') {
                options.push({ id: String(userId), text: nama });
              }
            }
          });
          setUserMap(map);
          setSalesOptions(options);
        }
      } catch (err) {
        console.error("Error fetching users for Sales mapping:", err);
      }
    }

    fetchUsers();
  }, []);

  const fetchingRef = useRef(false); // Prevent multiple simultaneous fetches

  // 🔹 Fetch customers dengan fallback pagination - optimized
  const fetchCustomers = useCallback(async (pageNumber = 1) => {
    // Prevent multiple simultaneous calls using ref
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      const result = await getCustomers(pageNumber, perPage, filters);

      if (result.success && result.data && Array.isArray(result.data)) {
        // Filter dan sort data di frontend untuk memastikan filter bekerja dengan benar
        let filteredData = [...result.data];

        // 🛡️ DOUBLE PROTECTION: Validasi Client-Side
        // Jika backend bocor/ignore filter, kita filter ulang di sini untuk kepastian UX

        // 1. Filter Verifikasi
        if (filters.verifikasi && filters.verifikasi !== "all") {
          // Handle "none" logic if necessary, though simpler to assume valid arrays or strings
          const wantVerified = Array.isArray(filters.verifikasi)
            ? filters.verifikasi.includes("verified")
            : filters.verifikasi === "verified";

          const wantUnverified = Array.isArray(filters.verifikasi)
            ? filters.verifikasi.includes("unverified")
            : filters.verifikasi === "unverified";

          // Jika user pilih keduanya (verified & unverified) -> Show All (no filter needed)
          // Jika user TIDAK pilih keduanya -> Show None
          // Jika pilih salah satu -> Filter

          if (wantVerified && !wantUnverified) {
            // Show ONLY Verified
            filteredData = filteredData.filter(c =>
              String(c.verifikasi) === "1" || c.verifikasi === true || c.verifikasi === 1
            );
          } else if (!wantVerified && wantUnverified) {
            // Show ONLY Unverified
            filteredData = filteredData.filter(c =>
              c.verifikasi === null || c.verifikasi === undefined ||
              String(c.verifikasi) === "0" || c.verifikasi === false || c.verifikasi === 0
            );
          } else if (!wantVerified && !wantUnverified) {
            // User uncheck both -> Show Empty
            filteredData = [];
          }
        }

        // 2. Filter Sales
        if (filters.sales_id && filters.sales_id !== "all") {
          const targetSalesId = String(filters.sales_id);
          filteredData = filteredData.filter(c => {
            // Robust check for Sales ID in various possible locations
            const sId1 = c.sales_id;
            const sId2 = c.sales_rel?.id;
            const sId3 = c.sales_rel?.user_id; // Potential alternative structure

            // Compare all potential IDs safely
            const match1 = sId1 !== undefined && sId1 !== null && String(sId1) === targetSalesId;
            const match2 = sId2 !== undefined && sId2 !== null && String(sId2) === targetSalesId;
            const match3 = sId3 !== undefined && sId3 !== null && String(sId3) === targetSalesId;

            return match1 || match2 || match3;
          });
        }

        // Sort data dari terbaru ke terlama berdasarkan create_at atau id
        filteredData.sort((a, b) => {
          // Prioritas: create_at jika ada, fallback ke id
          const dateA = a.create_at ? new Date(a.create_at).getTime() : 0;
          const dateB = b.create_at ? new Date(b.create_at).getTime() : 0;

          if (dateA !== 0 && dateB !== 0) {
            return dateB - dateA; // Terbaru di atas
          }

          // Fallback ke id jika create_at tidak ada
          const idA = a.id || 0;
          const idB = b.id || 0;
          return idB - idA; // ID lebih besar (terbaru) di atas
        });

        // Selalu replace data (bukan append) - setiap page menampilkan data yang berbeda
        setCustomers(filteredData);

        // Gunakan pagination object jika tersedia
        if (result.pagination && typeof result.pagination === 'object') {
          // Struktur pagination: { current_page, last_page, per_page, total }
          const isLastPage = result.pagination.current_page >= result.pagination.last_page;
          setHasMore(!isLastPage);
          setPaginationInfo(result.pagination);
        } else {
          setPaginationInfo(null);
          // Fallback pagination: cek jumlah data untuk menentukan hasMore
          if (result.data.length < perPage) {
            setHasMore(false); // sudah halaman terakhir
          } else {
            setHasMore(true); // masih ada halaman berikutnya
          }
        }

        // Simpan summary info jika tersedia
        if (result.summary) {
          setSummaryInfo(result.summary);
        } else {
          setSummaryInfo(null);
        }
      } else {
        // Jika response tidak sesuai format yang diharapkan
        setCustomers([]);
        setHasMore(false);
      }

      setLoading(false);
      fetchingRef.current = false;
    } catch (err) {
      toastError("Gagal memuat data customer");
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [perPage, filters]);

  // Initial load: fetch page 1
  useEffect(() => {
    setPage(1);
    setCustomers([]);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Hanya sekali saat mount

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
    setCustomers([]);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, verifikasiFilter, salesFilter]); // Reset when search or filter changes

  // Fetch data saat page atau filters berubah
  useEffect(() => {
    if (page > 0) {
      fetchCustomers(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]); // Depend pada page dan filters

  // 🔹 Next page
  const handleNextPage = useCallback(() => {
    if (loading || !hasMore) return;
    setPage(prev => prev + 1);
  }, [hasMore, loading]);

  // 🔹 Previous page
  const handlePrevPage = useCallback(() => {
    if (loading || page <= 1) return;
    setPage(prev => prev - 1);
  }, [page, loading]);

  // 🔹 Helpers
  const closeAllModals = () => {
    setShowEdit(false);
    setShowDelete(false);
    setShowView(false);
    setShowAdd(false);
    setShowEditFromView(false);
    setShowDeleteFromView(false);
    setShowFilterModal(false);
    setSelectedCustomer(null);
  };

  // 🔹 Refresh all data (reset to page 1)
  const requestRefresh = async (message, type = "success") => {
    setPage(1);
    setCustomers([]);
    setHasMore(true);
    await fetchCustomers(1);
    if (message) {
      if (type === "error") {
        toastError(message);
      } else if (type === "warning") {
        toastWarning(message);
      } else {
        toastSuccess(message);
      }
    }
  };

  // 🔹 Handler edit
  const handleEdit = (cust) => {
    setSelectedCustomer(cust);
    setShowEdit(true);
  };

  const handleSuccessEdit = (message, updatedCustomer) => {
    requestRefresh(message);
    setShowEdit(false);

    // If we have an updated customer object, update the state so modals (like View) reflect changes
    if (updatedCustomer) {
      setSelectedCustomer(updatedCustomer);
    }
  };

  // 🔹 Handler delete
  const handleDelete = (cust) => {
    setSelectedCustomer(cust);
    setShowDelete(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteCustomer(selectedCustomer.id);
      requestRefresh("Customer berhasil dihapus!", "warning");
    } catch (err) {
      console.error("Error deleting customer:", err);
      toastError("Gagal menghapus customer");
    } finally {
      setShowDelete(false);
      setSelectedCustomer(null);
    }
  };

  const handleView = (cust) => {
    setSelectedCustomer(cust);
    setShowView(true);
  };

  // 🔹 Handler untuk edit dari viewCustomer modal
  const handleEditFromView = (cust) => {
    // Biarkan viewCustomer modal tetap terbuka, buka editCustomer modal di atasnya
    setSelectedCustomer(cust);
    setShowEditFromView(true);
  };

  // 🔹 Handler untuk delete dari viewCustomer modal
  const handleDeleteFromView = (cust) => {
    // Biarkan viewCustomer modal tetap terbuka, buka deleteCustomer modal di atasnya
    setSelectedCustomer(cust);
    setShowDeleteFromView(true);
  };

  const handleHistory = (cust) => {
    setSelectedCustomer(cust);
    setShowHistory(true);
  };

  const handleFollowupLog = (cust) => {
    setSelectedCustomer(cust);
    setShowFollowupLog(true);
  };

  // 🔹 Filter handler from Modal
  const handleFilterApply = (newFilters) => {
    setVerifikasiFilter(newFilters.verifikasi);
    setSalesFilter(newFilters.sales_id);
    setPage(1); // Reset to page 1 when filter changes
  };

  return (
    <Layout title="Manage Customers">
      <div className="dashboard-shell customers-shell table-shell">
        <section className="dashboard-summary customers-summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', width: '100%', marginBottom: '1.5rem' }}>
          {/* Main Stats Card */}
          <article className="summary-card summary-card--combined summary-card--three-cols">
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <Users size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total customers</p>
                <p className="summary-card__value">{paginationInfo?.total || customers.length}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="summary-card__label">Verified</p>
                <p className="summary-card__value">
                  {summaryStats.verified}
                </p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <Filter size={22} />
              </div>
              <div>
                <p className="summary-card__label">Unverified</p>
                <p className="summary-card__value">
                  {summaryStats.unverified}
                </p>
              </div>
            </div>
          </article>

          {/* Membership Breakdown Card */}
          {/* <article className="summary-card summary-card--combined summary-card--five-cols" style={{ gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr auto 1fr' }}>
            {['platinum', 'gold', 'silver', 'bronze', 'basic'].map((level, idx, arr) => (
              <div key={level} style={{ display: 'contents' }}>
                <div className="summary-card__column">
                  <div className={`summary-card__icon membership-tag--${level}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>{level.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="summary-card__label">{level}</p>
                    <p className="summary-card__value">{summaryStats.membershipCounts[level] || 0}</p>
                  </div>
                </div>
                {idx < arr.length - 1 && <div className="summary-card__divider"></div>}
              </div>
            ))}
          </article> */}
        </section>
        <section className="dashboard-hero customers-hero">
          <div className="customers-toolbar">
            <div className="customers-search">
              <input
                type="search"
                placeholder="Cari nama, email, atau WhatsApp"
                className="customers-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="customers-search__icon pi pi-search" />
            </div>
            <div className="customers-filters" aria-label="Filter pelanggan" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {/* Filter Button - Always Visible */}
              <button
                type="button"
                className="filter-btn-orange"
                onClick={() => setShowFilterModal(true)}
                style={{
                  backgroundColor: "white",
                  border: "1px solid #fab005",
                  color: "#fab005",
                  padding: "8px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "40px",
                  width: "40px",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#fff9db"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                title="Filter Data"
              >
                <Filter size={20} strokeWidth={2.5} />
              </button>

              {/* Reset Button - Visible only when filtering */}
              {(verifikasiFilter !== "all" || salesFilter !== "all") && (
                <button
                  type="button"
                  className="filter-btn-orange active"
                  onClick={() => {
                    setVerifikasiFilter("all");
                    setSalesFilter("all");
                    setPage(1);
                  }}
                  style={{
                    backgroundColor: "#fff",
                    border: "1px solid #f97316",
                    color: "#f97316",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    height: "40px",
                    transition: "all 0.2s",
                    fontWeight: 600,
                    fontSize: "0.9rem"
                  }}
                >
                  <XCircle size={18} />
                  Riset
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="panel customers-panel">

          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Daftar Customer</h3>
            </div>
            <div className="customers-toolbar-buttons">
              <button
                className="customers-button customers-button--secondary"
                onClick={() => router.push("/sales/followup/report")}
              >
                <i className="pi pi-chart-bar" style={{ marginRight: "6px" }} />
                Report Follow Up
              </button>
              <button className="customers-button customers-button--primary" onClick={() => setShowAdd(true)}>
                + Tambah Customer
              </button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {/* Sticky 1: Member ID */}
                  <th className="sticky-left-1">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>MEMBER</span>
                      <span>ID</span>
                    </div>
                  </th>
                  {/* Sticky 2: Nama */}
                  <th className="sticky-left-2">NAMA</th>
                  <th>EMAIL</th>
                  <th>NO WA</th>
                  <th>VERIFIKASI</th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>PESANAN</span>
                      <span>SUKSES</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>TOTAL NET</span>
                      <span>REVENUE</span>
                    </div>
                  </th>

                </tr>
              </thead>
              <tbody>
                {loading && customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="table-empty">Loading data...</td>
                  </tr>
                ) : customers.length > 0 ? (
                  customers.map((cust, i) => (
                    <tr key={cust.id || `${cust.email}-${i}`}>
                      {/* Sticky 1: Member ID */}
                      <td className="sticky-left-1" style={{ fontWeight: 500 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span>{cust.memberID || "-"}</span>
                          {cust.keanggotaan && (
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                backgroundColor:
                                  cust.keanggotaan === 'bronze' ? '#fef3c7' :
                                    cust.keanggotaan === 'silver' ? '#f3f4f6' :
                                      cust.keanggotaan === 'gold' ? '#fef9c3' :
                                        cust.keanggotaan === 'platinum' ? '#e0e7ff' : '#f3f4f6',
                                color:
                                  cust.keanggotaan === 'bronze' ? '#92400e' :
                                    cust.keanggotaan === 'silver' ? '#4b5563' :
                                      cust.keanggotaan === 'gold' ? '#ca8a04' :
                                        cust.keanggotaan === 'platinum' ? '#4338ca' : '#6b7280',
                                border: `1px solid ${cust.keanggotaan === 'bronze' ? '#fbbf24' :
                                  cust.keanggotaan === 'silver' ? '#9ca3af' :
                                    cust.keanggotaan === 'gold' ? '#eab308' :
                                      cust.keanggotaan === 'platinum' ? '#6366f1' : '#d1d5db'
                                  }`
                              }}
                            >
                              {cust.keanggotaan}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sticky 2: Nama */}
                      <td className="sticky-left-2">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span
                            style={{ color: '#0ea5e9', fontWeight: 600, cursor: 'pointer' }}
                            onClick={() => handleView(cust)}
                          >
                            {cust.nama || "-"}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                            Sales: {cust.sales_rel?.nama || userMap.get(String(cust.sales_id)) || cust.sales_nama || "-"}
                          </span>
                        </div>
                      </td>

                      <td>{cust.email || "-"}</td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {cust.wa ? (
                            <a
                              href={`https://wa.me/${cust.wa.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#25D366', textDecoration: 'none' }}
                              title={`Chat WhatsApp ${cust.wa}`}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              <span>{cust.wa}</span>
                            </a>
                          ) : "-"}

                          {cust.wa2 && (
                            <a
                              href={`https://wa.me/${cust.wa2.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#25D366', textDecoration: 'none' }}
                              title={`Chat WhatsApp ${cust.wa2}`}
                            >
                              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              <span>{cust.wa2}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`customers-verif-tag ${cust.verifikasi === "1" || cust.verifikasi === true ? "is-verified" : "is-unverified"
                            }`}
                          style={{
                            display: 'inline-block',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: cust.verifikasi === "1" || cust.verifikasi === true ? '#ecfdf5' : '#fef2f2',
                            color: cust.verifikasi === "1" || cust.verifikasi === true ? '#059669' : '#dc2626',
                            border: `1px solid ${cust.verifikasi === "1" || cust.verifikasi === true ? '#34d399' : '#f87171'}`
                          }}
                        >
                          {cust.verifikasi === "1" || cust.verifikasi === true ? "Verified" : "Unverified"}
                        </span>
                      </td>

                      {/* Stats Cells: Auto Fetch */}
                      <CustomerOrderStatsCells customerId={cust.id} />

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      {debouncedSearch.trim() ? "Tidak ada hasil pencarian." : "Tidak ada data customer"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="customers-pagination-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 1rem', paddingBottom: '1rem' }}>
            <div className="per-page-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Tampilkan:</span>
              <select 
                value={perPage} 
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '6px', 
                  border: '1px solid #d1d5db',
                  fontSize: '0.875rem',
                  outline: 'none',
                  cursor: 'pointer',
                  backgroundColor: '#fff'
                }}
              >
                {PER_PAGE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt} Data</option>
                ))}
              </select>
            </div>

            <div className="customers-pagination" style={{ margin: 0, padding: 0 }}>
              <button
                className="customers-pagination__btn"
                onClick={handlePrevPage}
                disabled={page <= 1 || loading}
              >
                <i className="pi pi-chevron-left" />
              </button>
              <span className="customers-pagination__info">
                Page {page} {paginationInfo?.last_page ? `of ${paginationInfo.last_page} (${paginationInfo.total} total)` : ''}
              </span>
              <button
                className="customers-pagination__btn"
                onClick={handleNextPage}
                disabled={!hasMore || loading}
              >
                <i className="pi pi-chevron-right" />
              </button>
            </div>
          </div>
        </section>

        {/* MODALS */}
        {showEdit && selectedCustomer && (
          <EditCustomerModal
            customer={selectedCustomer}
            onClose={() => {
              setShowEdit(false);
              setSelectedCustomer(null);
            }}
            onSuccess={handleSuccessEdit}
          />
        )}

        {showDelete && selectedCustomer && (
          <DeleteCustomerModal
            customer={selectedCustomer}
            onClose={() => {
              setShowDelete(false);
              setSelectedCustomer(null);
            }}
            onConfirm={handleConfirmDelete}
          />
        )}

        {showView && selectedCustomer && (
          <ViewCustomerModal
            customer={selectedCustomer}
            onClose={() => {
              setShowView(false);
              setSelectedCustomer(null);
            }}
            onEdit={handleEditFromView}
            onDelete={handleDeleteFromView}
          />
        )}

        {/* Nested modals dari viewCustomer - dengan z-index lebih tinggi */}
        {showEditFromView && selectedCustomer && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1001 }}>
            <EditCustomerModal
              customer={selectedCustomer}
              onClose={() => {
                setShowEditFromView(false);
                // Jangan set selectedCustomer ke null, biarkan viewCustomer modal tetap terbuka
              }}
              onSuccess={(msg, updatedCustomer) => {
                requestRefresh(msg);
                setShowEditFromView(false);

                // Update selectedCustomer with new data to refresh View Modal immediately
                if (updatedCustomer) {
                  setSelectedCustomer(updatedCustomer);
                }
              }}
            />
          </div>
        )}

        {showDeleteFromView && selectedCustomer && (
          <div style={{ position: "fixed", inset: 0, zIndex: 1001 }}>
            <DeleteCustomerModal
              customer={selectedCustomer}
              onClose={() => {
                setShowDeleteFromView(false);
                // Jangan set selectedCustomer ke null, biarkan viewCustomer modal tetap terbuka
              }}
              onConfirm={async () => {
                try {
                  await deleteCustomer(selectedCustomer.id);
                  requestRefresh("Customer berhasil dihapus!", "warning");
                  // Tutup semua modal setelah delete
                  setShowDeleteFromView(false);
                  setShowView(false);
                  setSelectedCustomer(null);
                } catch (err) {
                  console.error("Error deleting customer:", err);
                  toastError("Gagal menghapus customer");
                  setShowDeleteFromView(false);
                }
              }}
            />
          </div>
        )}

        {showHistory && selectedCustomer && (
          <HistoryCustomerModal
            customer={selectedCustomer}
            onClose={() => {
              setShowHistory(false);
              setSelectedCustomer(null);
            }}
          />
        )}

        {showFollowupLog && selectedCustomer && (
          <FollowupLogModal
            customer={selectedCustomer}
            onClose={() => {
              setShowFollowupLog(false);
              setSelectedCustomer(null);
            }}
          />
        )}

        {showAdd && (
          <AddCustomerModal
            onClose={() => {
              setShowAdd(false);
            }}
            onSuccess={(msg) => {
              requestRefresh(msg);
              setShowAdd(false);
            }}
          />
        )}

        {showFilterModal && (
          <FilterCustomerModal
            onClose={() => setShowFilterModal(false)}
            onApply={handleFilterApply}
            currentFilters={{ verifikasi: verifikasiFilter, sales_id: salesFilter }}
            salesOptions={salesOptions}
          />
        )}

      </div>
    </Layout>
  );
}