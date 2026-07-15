"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getCustomers, deleteCustomer } from "@/lib/sales/customer";
import { Users, CheckCircle, Filter, ChevronDown } from "lucide-react";
import dynamic from "next/dynamic";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/admin.css";
import "@/styles/sales/customers-premium.css";
import "@/styles/sales/leads.css";

// Lazy load modals
const EditCustomerModal = dynamic(() => import("./editCustomer"), { ssr: false });
const ViewCustomerModal = dynamic(() => import("./viewCustomer"), { ssr: false });
const DeleteCustomerModal = dynamic(() => import("./deleteCustomer"), { ssr: false });
const AddCustomerModal = dynamic(() => import("./addCustomer"), { ssr: false });
const HistoryCustomerModal = dynamic(() => import("./historyCustomer"), { ssr: false });
const FollowupLogModal = dynamic(() => import("./followupLog"), { ssr: false });

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

const CUSTOMERS_COLUMNS = [
    { line1: "Id", line2: "Member" },
    { line1: "Nama", line2: "" },
    { line1: "Email", line2: "" },
    { line1: "No WA", line2: "" },
    { line1: "Verifikasi", line2: "" },
    { line1: "Pesanan", line2: "Sukses" },
    { line1: "Total Net", line2: "Revenue" },
];

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

    // Filter state - hanya verifikasi
    const [verifikasiFilter, setVerifikasiFilter] = useState("all"); // all | verified | unverified
    const [showVerifikasiDropdown, setShowVerifikasiDropdown] = useState(false);

    // Filter options
    const VERIFIKASI_OPTIONS = [
        { value: "all", label: "Semua Verifikasi" },
        { value: "verified", label: "Verified" },
        { value: "unverified", label: "Unverified" },
    ];

    // Convert filter untuk API (termasuk search)
    const filters = useMemo(() => ({
        verifikasi: verifikasiFilter,
        status: "all",
        dateRange: null,
        sales_id: "all",
        search: debouncedSearch.trim() || null, // Add search to filters
        all: true, // Tampilkan semua data tanpa pagination
    }), [verifikasiFilter, debouncedSearch]);

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

                // Apply verifikasi filter jika bukan "all" (fallback jika backend tidak memproses filter)
                if (filters.verifikasi && filters.verifikasi !== "all") {
                    if (filters.verifikasi === "verified") {
                        filteredData = filteredData.filter(
                            (c) => c.verifikasi === "1" || c.verifikasi === true || c.verifikasi === 1
                        );
                    } else if (filters.verifikasi === "unverified") {
                        filteredData = filteredData.filter(
                            (c) => !(c.verifikasi === "1" || c.verifikasi === true || c.verifikasi === 1)
                        );
                    }
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
    }, [debouncedSearch, verifikasiFilter]); // Reset when search or filter changes

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

    const handleSuccessEdit = (message) => {
        requestRefresh(message);
        setShowEdit(false);
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

    // 🔹 Filter handler - verifikasi filter langsung terapkan saat dipilih
    const handleVerifikasiFilterChange = (value) => {
        setVerifikasiFilter(value);
        setShowVerifikasiDropdown(false);
        setPage(1); // Reset to page 1 when filter changes
    };

    return (
        <Layout title="Manage Customers">
            <div className="dashboard-shell customers-shell">
                <section className="dashboard-summary customers-summary">
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
                            {/* Verifikasi Filter Dropdown */}
                            <div className="leads-filter-dropdown" style={{ position: "relative" }}>
                                <button
                                    type="button"
                                    className={`leads-filter-btn ${verifikasiFilter !== "all" ? "is-active" : ""}`}
                                    onClick={() => {
                                        setShowVerifikasiDropdown(!showVerifikasiDropdown);
                                    }}
                                >
                                    {VERIFIKASI_OPTIONS.find((opt) => opt.value === verifikasiFilter)?.label || "Semua Verifikasi"}
                                    <ChevronDown size={16} style={{ marginLeft: "0.5rem" }} />
                                </button>
                                {showVerifikasiDropdown && (
                                    <div className="leads-filter-dropdown-menu">
                                        {VERIFIKASI_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`leads-filter-dropdown-item ${verifikasiFilter === option.value ? "is-selected" : ""}`}
                                                onClick={() => handleVerifikasiFilterChange(option.value)}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="panel customers-panel">
                    <div className="panel__header">
                        <div>
                            <p className="panel__eyebrow">Directory</p>
                            <h3 className="panel__title">Customer roster</h3>
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

                    <div className="customers-table__wrapper">
                        <div className="customers-table">
                            <div className="customers-table__head">
                                {CUSTOMERS_COLUMNS.map((column, idx) => (
                                    <span key={idx} className="customers-table__head-cell">
                                        <span className="customers-table__head-line1">{column.line1}</span>
                                        {column.line2 && <span className="customers-table__head-line2">{column.line2}</span>}
                                    </span>
                                ))}
                            </div>
                            <div className="customers-table__body">
                                {loading && customers.length === 0 ? (
                                    <p className="customers-empty">Loading data...</p>
                                ) : customers.length > 0 ? (
                                    customers.map((cust, i) => (
                                        <div className="customers-table__row" key={cust.id || `${cust.email}-${i}`}>
                                            {/* Id Member */}
                                            <div className="customers-table__cell" data-label="Member Id">
                                                {cust.memberID || "-"}
                                            </div>

                                            {/* Nama - Klikable */}
                                            <div className="customers-table__cell customers-table__cell--strong" data-label="Nama">
                                                <div className="customer-table__info">
                                                    <span
                                                        className="customer-table__name"
                                                        onClick={() => handleView(cust)}
                                                    >
                                                        {cust.nama || "-"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div className="customers-table__cell" data-label="Email">
                                                {cust.email || "-"}
                                            </div>

                                            {/* No WA */}
                                            <div className="customers-table__cell" data-label="No WA">
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {cust.wa ? (
                                                        <a
                                                            href={`https://wa.me/${cust.wa.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="wa-link"
                                                            title={`Chat WhatsApp ${cust.wa}`}
                                                        >
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                width="14"
                                                                height="14"
                                                                fill="currentColor"
                                                            >
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                            </svg>
                                                            <span>{cust.wa}</span>
                                                        </a>
                                                    ) : (
                                                        "-"
                                                    )}

                                                    {cust.wa2 && (
                                                        <a
                                                            href={`https://wa.me/${cust.wa2.replace(/[^0-9]/g, "").replace(/^0/, "62")}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="wa-link"
                                                            title={`Chat WhatsApp ${cust.wa2}`}
                                                        >
                                                            <svg
                                                                viewBox="0 0 24 24"
                                                                width="14"
                                                                height="14"
                                                                fill="currentColor"
                                                            >
                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                            </svg>
                                                            <span>{cust.wa2}</span>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Verifikasi */}
                                            <div className="customers-table__cell" data-label="Verifikasi">
                                                <span
                                                    className={`customers-verif-tag ${cust.verifikasi === "1" || cust.verifikasi === true ? "is-verified" : "is-unverified"
                                                        }`}
                                                >
                                                    {cust.verifikasi === "1" || cust.verifikasi === true ? "Verified" : "Unverified"}
                                                </span>
                                            </div>

                                            {/* Pesanan Sukses - Tampilkan "-" untuk sementara */}
                                            <div className="customers-table__cell" data-label="Pesanan Sukses">
                                                {"-"}
                                            </div>

                                            {/* Total Net Revenue - Tampilkan "-" untuk sementara */}
                                            <div className="customers-table__cell" data-label="Total Net Revenue">
                                                {"-"}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="customers-empty">
                                        {debouncedSearch.trim() ? "Tidak ada hasil pencarian." : "Tidak ada data customer"}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Pagination dihapus karena sudah tampil semua (all=true) */}
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
                            onSuccess={(msg) => {
                                requestRefresh(msg);
                                setShowEditFromView(false);
                                // Refresh customer data di viewCustomer modal dengan menutup dan membuka lagi
                                if (showView) {
                                    setShowView(false);
                                    setTimeout(() => {
                                        setShowView(true);
                                    }, 100);
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

                {/* Close dropdown when clicking outside */}
                {showVerifikasiDropdown && (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onClick={() => setShowVerifikasiDropdown(false)}
                    />
                )}

            </div>
        </Layout>
    );
}