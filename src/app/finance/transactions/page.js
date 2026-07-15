"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { Clock, CheckCircle, XCircle, DollarSign, Filter } from "lucide-react";
import { Calendar } from "primereact/calendar";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "@/styles/finance/dashboard.css";
import "@/styles/finance/dashboard-premium.css";
import "@/styles/finance/admin.css";
import "@/styles/sales/admin.css";
import { getOrderStatistics } from "@/lib/finance/orders";
import { trackFinanceApprovedPurchase } from "@/lib/finance/metaPixelPurchase";

// Lazy load modals
const ViewOrders = dynamic(() => import("./viewOrders"), { ssr: false });
const ApproveOrder = dynamic(() => import("./approveOrder"), { ssr: false });
const RejectOrder = dynamic(() => import("./rejectOrder"), { ssr: false });

// Status Validasi Mapping (berdasarkan field `status`)
const VALIDATION_STATUS_MAP = {
  0: { label: "Pending", class: "pending" },
  1: { label: "Pending", class: "pending" },
  2: { label: "Valid", class: "valid" },
  3: { label: "Ditolak", class: "rejected" },
};

const ORDERS_COLUMNS = [
  "#",
  "Order ID",
  "Customer",
  "Produk",
  "Total Harga",
  "Pembayaran Ke -",
  "Amount",
  "Status Validasi",
  "Tanggal Bayar",
  "Actions",
];

const DEFAULT_TOAST = { show: false, message: "", type: "success" };

export default function FinanceOrders() {
  // Pagination state dengan fallback pagination
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [hasMore, setHasMore] = useState(true); // penentu masih ada halaman berikutnya
  const [loading, setLoading] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState(null); // info pagination dari backend
  const perPage = 15; // Data per halaman

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const [filterPreset, setFilterPreset] = useState("all"); // all | today
  const [dateRange, setDateRange] = useState(null); // [startDate, endDate] atau null

  // State lainnya
  const [statistics, setStatistics] = useState(null);
  const [showView, setShowView] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  /** Modal sukses setelah approve + info pixel Purchase */
  const [approveSuccess, setApproveSuccess] = useState(null);

  const [toast, setToast] = useState(DEFAULT_TOAST);
  const toastTimeoutRef = useRef(null);
  const fetchingRef = useRef(false); // Prevent multiple simultaneous fetches

  // Cache untuk menyimpan order details berdasarkan order_id
  // Format: { [orderId]: { status_pembayaran: 4, ... } }
  const [orderDetailsCache, setOrderDetailsCache] = useState({});
  const fetchingOrdersRef = useRef(new Set()); // Track order IDs yang sedang di-fetch

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToast({ show: false, message: "", type });
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // 🔹 Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const stats = await getOrderStatistics();
      if (stats) {
        setStatistics(stats);
      }
    } catch (err) {
      console.error("Error loading statistics:", err);
    }
  }, []);

  // 🔹 Fetch order detail berdasarkan order_id untuk mendapatkan status_pembayaran
  const fetchOrderDetail = useCallback(async (orderId) => {
    // Jika sudah di cache, return dari cache
    if (orderDetailsCache[orderId]) {
      return orderDetailsCache[orderId];
    }

    // Jika sedang di-fetch, return null (akan di-fetch lagi nanti)
    if (fetchingOrdersRef.current.has(orderId)) {
      return null;
    }

    // Jika orderId tidak valid, return null
    if (!orderId || orderId === "-") {
      return null;
    }

    try {
      fetchingOrdersRef.current.add(orderId);
      const token = localStorage.getItem("token");
      if (!token) {
        fetchingOrdersRef.current.delete(orderId);
        return null;
      }

      // Fetch order detail dari finance/order/[id] endpoint (menggunakan API route khusus finance)
      const res = await fetch(`/api/finance/order/${orderId}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        fetchingOrdersRef.current.delete(orderId);
        return null;
      }

      const json = await res.json();

      // Extract order data dari response
      // Format bisa: { success: true, data: { ... } } atau { success: true, data: [{ ... }] }
      let order = null;
      if (json.success && json.data) {
        if (Array.isArray(json.data)) {
          order = json.data[0] || json.data;
        } else {
          order = json.data;
        }
      }

      if (order) {
        // Simpan ke cache
        setOrderDetailsCache((prev) => ({
          ...prev,
          [orderId]: order,
        }));
        fetchingOrdersRef.current.delete(orderId);
        return order;
      }

      fetchingOrdersRef.current.delete(orderId);
      return null;
    } catch (err) {
      console.error(`Error fetching order detail for order_id ${orderId}:`, err);
      fetchingOrdersRef.current.delete(orderId);
      return null;
    }
  }, [orderDetailsCache]);

  // 🔹 Fetch orders dengan fallback pagination
  const fetchOrders = useCallback(async (pageNumber = 1) => {
    // Prevent multiple simultaneous calls using ref
    if (fetchingRef.current) {
      console.log("⏸️ Already fetching, skipping duplicate request for page", pageNumber);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn("No token found");
        setLoading(false);
        fetchingRef.current = false;
        return;
      }

      const res = await fetch(`/api/finance/order-validation?page=${pageNumber}&per_page=${perPage}`, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      // Handle response dengan struktur: { success: true, data: [...], pagination: {...} }
      if (json.success && json.data && Array.isArray(json.data)) {
        // Selalu replace data (bukan append) - setiap page menampilkan data yang berbeda
        setOrders(json.data);
        // Debug: log struktur data untuk melihat apakah order_rel sudah include status_pembayaran
        if (json.data.length > 0) {
          console.log("🔍 Sample payment data structure:", {
            payment: json.data[0],
            orderRel: json.data[0]?.order_rel,
            hasStatusPembayaran: json.data[0]?.order_rel?.status_pembayaran !== undefined,
            statusPembayaran: json.data[0]?.order_rel?.status_pembayaran,
          });
        }
        // Debug: log struktur data untuk melihat apakah order_rel sudah include status_pembayaran
        if (json.data.length > 0) {
          console.log("🔍 Sample payment data structure:", {
            payment: json.data[0],
            orderRel: json.data[0]?.order_rel,
            hasStatusPembayaran: json.data[0]?.order_rel?.status_pembayaran !== undefined,
            statusPembayaran: json.data[0]?.order_rel?.status_pembayaran,
          });
        }

        // Gunakan pagination object jika tersedia, jika tidak gunakan fallback
        if (json.pagination && typeof json.pagination === "object") {
          const isLastPage = json.pagination.current_page >= json.pagination.last_page;
          setHasMore(!isLastPage);
          setPaginationInfo(json.pagination);
          console.log("📄 Pagination info (finance):", {
            current_page: json.pagination.current_page,
            last_page: json.pagination.last_page,
            total: json.pagination.total,
            hasMore: !isLastPage,
          });
        } else {
          setPaginationInfo(null);
          // Fallback pagination: cek jumlah data untuk menentukan hasMore
          if (json.data.length < perPage) {
            setHasMore(false); // sudah halaman terakhir
          } else {
            setHasMore(true); // masih ada halaman berikutnya
          }
        }
      } else {
        console.warn("⚠️ Unexpected response format (finance/transactions):", json);
        setOrders([]);
        setHasMore(false);
        setPaginationInfo(null);
      }

      setLoading(false);
      fetchingRef.current = false;
    } catch (err) {
      console.error("Error fetching orders:", err);
      showToast("Gagal memuat data", "error");
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [showToast, perPage]);

  // 🔹 Fetch order details untuk payments yang tidak memiliki status_pembayaran di order_rel
  useEffect(() => {
    if (!orders || orders.length === 0) return;

    const fetchMissingOrderDetails = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Cari payments yang tidak memiliki status_pembayaran di order_rel
      const paymentsToFetch = orders.filter((payment) => {
        const orderRel = payment.order_rel || {};
        const orderId = orderRel.id ?? payment.order_id ?? payment.id;

        // Skip jika:
        // 1. orderId tidak valid
        // 2. sudah di cache
        // 3. sedang di-fetch
        // 4. sudah ada status_pembayaran di order_rel
        if (!orderId || orderId === "-") return false;
        if (orderDetailsCache[orderId]) return false;
        if (fetchingOrdersRef.current.has(orderId)) return false;
        if (orderRel.status_pembayaran !== undefined && orderRel.status_pembayaran !== null) return false;

        return true;
      });

      // Fetch order details untuk payments yang belum memiliki status_pembayaran
      for (const payment of paymentsToFetch) {
        const orderRel = payment.order_rel || {};
        const orderId = orderRel.id ?? payment.order_id ?? payment.id;

        if (orderId && orderId !== "-") {
          await fetchOrderDetail(orderId);
        }
      }
    };

    fetchMissingOrderDetails();
  }, [orders, orderDetailsCache, fetchOrderDetail]);

  // Load statistics on mount
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // Initial load: fetch page 1
  useEffect(() => {
    setPage(1);
    setOrders([]);
    setHasMore(true);
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Hanya sekali saat mount

  // Fetch data saat page berubah
  useEffect(() => {
    if (page > 0 && !loading) {
      fetchOrders(page);
      // Tidak scroll ke atas, tetap di posisi saat ini
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]); // Hanya depend pada page

  // 🔹 Next page
  const handleNextPage = useCallback(() => {
    if (loading || !hasMore) return; // Jangan load jika sedang loading atau sudah habis

    const nextPage = page + 1;
    console.log("🔄 Next page clicked, loading page:", nextPage);
    setPage(nextPage);
  }, [page, hasMore, loading]);

  // 🔹 Previous page
  const handlePrevPage = useCallback(() => {
    if (loading || page <= 1) return; // Jangan load jika sedang loading atau sudah di page 1

    const prevPage = page - 1;
    console.log("🔄 Previous page clicked, loading page:", prevPage);
    setPage(prevPage);
  }, [page, loading]);

  // 🔹 Refresh all data (reset to page 1)
  const requestRefresh = async (message, type = "success") => {
    setPage(1);
    setOrders([]);
    setHasMore(true);
    await Promise.all([loadStatistics(), fetchOrders(1)]);
    if (message) showToast(message, type);
  };

  // Reset page ke 1 dan fetch ulang ketika filter berubah
  useEffect(() => {
    // Skip pada initial mount (sudah ada useEffect untuk initial load)
    if (orders.length === 0) return;

    // Reset ke page 1 dan fetch ulang data
    setPage(1);
    setOrders([]);
    setHasMore(true);
    fetchOrders(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, dateRange, filterPreset]); // Reset page ketika search, date range, atau filter preset berubah

  // Filter payments (tidak di-group, setiap payment = 1 baris)
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Filter by preset (all | today)
    if (filterPreset === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((payment) => {
        if (!payment.tanggal) return false;
        const paymentDate = new Date(payment.tanggal);
        paymentDate.setHours(0, 0, 0, 0);
        return paymentDate.getTime() === today.getTime();
      });
    }

    // Filter by search (customer name, product name, total harga)
    if (searchInput && searchInput.trim()) {
      const searchLower = searchInput.toLowerCase().trim();
      filtered = filtered.filter((payment) => {
        const customerName = payment.order_rel?.customer_rel?.nama?.toLowerCase() || "";
        const productName = payment.order_rel?.produk_rel?.nama?.toLowerCase() || "";
        const totalOrder = payment.order_rel?.total_harga?.toString() || "";
        const totalPaid = payment.total_paid?.toString() || "";
        const remaining = payment.remaining?.toString() || "";

        return (
          customerName.includes(searchLower) ||
          productName.includes(searchLower) ||
          totalOrder.includes(searchLower) ||
          totalPaid.includes(searchLower) ||
          remaining.includes(searchLower)
        );
      });
    }

    // Filter by date range
    if (dateRange && Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      filtered = filtered.filter((payment) => {
        if (!payment.tanggal) return false;
        const orderDate = new Date(payment.tanggal);
        const fromDate = new Date(dateRange[0]);
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date(dateRange[1]);
        toDate.setHours(23, 59, 59, 999);
        return orderDate >= fromDate && orderDate <= toDate;
      });
    }

    // Return semua payment tanpa grouping (setiap payment = 1 baris)
    return filtered;
  }, [orders, searchInput, dateRange, filterPreset]);

  // === SUMMARY ===
  // Gunakan data dari statistics API
  // Response structure: { menunggu_validasi, sudah_diapprove, ditolak, total_nilai_menunggu, total_nilai_menunggu_formatted }
  const menungguOrders = statistics?.menunggu_validasi || 0;
  const approvedOrders = statistics?.sudah_diapprove || 0;
  const ditolakOrders = statistics?.ditolak || 0;

  // Format total nilai menunggu - handle nilai besar hingga ratusan juta
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "Rp 0";
    // Jika sudah string yang diformat, return langsung
    if (typeof value === "string" && value.startsWith("Rp")) return value;
    // Format number dengan separator ribuan
    const numValue = typeof value === "number" ? value : parseFloat(value) || 0;
    return `Rp ${numValue.toLocaleString("id-ID")}`;
  };

  const totalNilaiMenunggu = statistics?.total_nilai_menunggu_formatted
    ? statistics.total_nilai_menunggu_formatted
    : formatCurrency(statistics?.total_nilai_menunggu || 0);

  // === EVENT HANDLERS ===
  const handleView = (order) => {
    setSelectedOrder(order);
    setShowView(true);
  };

  const handleApprove = (order) => {
    setSelectedOrder(order);
    setShowApprove(true);
  };

  const handleReject = (order) => {
    setSelectedOrder(order);
    setShowReject(true);
  };

  // Handler untuk approve action
  const onApprove = async (order) => {
    try {
      if (!order?.id) {
        showToast("Order ID tidak valid", "error");
        return false;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Token tidak ditemukan", "error");
        return false;
      }

      const res = await fetch(`/api/finance/order-validation/${order.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!json.success) {
        showToast(json.message || "Gagal approve order", "error");
        return false;
      }

      let pixelSent = false;
      let detail = null;
      try {
        const orderDetailRes = await fetch(`/api/finance/order-validation/${order.id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (orderDetailRes.ok) {
          const orderDetail = await orderDetailRes.json();
          detail = orderDetail.data;
          const produk = detail?.produk;
          const amount = parseFloat(detail?.amount ?? detail?.order?.total_harga ?? 0);
          if (produk) {
            // [DINONAKTIFKAN SESUAI PERMINTAAN USER - EVENT PURCHASE PINDAH KE SALES]
            // pixelSent = !!trackFinanceApprovedPurchase({
            //   produk,
            //   value: amount,
            //   currency: "IDR",
            //   orderId: detail?.order_id,
            // });
          }
        }
      } catch (e) {
        console.error("[FB PIXEL Finance] Gagal ambil detail / kirim Purchase:", e);
      }

      setShowApprove(false);
      setSelectedOrder(null);
      await requestRefresh();

      setApproveSuccess({
        message: json.message || "Pembayaran berhasil disetujui.",
        orderId: detail?.order_id ?? order?.order_id,
        productName: detail?.produk?.nama ?? "-",
        amount: detail?.amount,
        pixelSent,
      });

      return true;
    } catch (err) {
      console.error("Error approving order:", err);
      showToast("Terjadi kesalahan saat approve order", "error");
      return false;
    }
  };

  // Handler untuk reject action
  const onReject = async (order, catatan) => {
    try {
      if (!order?.id) {
        showToast("Order ID tidak valid", "error");
        return;
      }

      if (!catatan || !catatan.trim()) {
        showToast("Mohon isi catatan penolakan", "error");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showToast("Token tidak ditemukan", "error");
        return;
      }

      // Log untuk debugging
      console.log("🔴 Reject Order Request:", {
        orderId: order.id,
        catatan: catatan,
        orderStatus: order.status,
      });

      const res = await fetch(`/api/finance/order-validation/${order.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ catatan: catatan.trim() }),
      });

      const json = await res.json();

      // Log response untuk debugging
      console.log("🔴 Reject Order Response:", json);

      if (json.success) {
        setShowReject(false);
        setSelectedOrder(null);
        await requestRefresh("Order berhasil ditolak!", "success");
      } else {
        showToast(json.message || "Gagal reject order", "error");
      }
    } catch (err) {
      console.error("Error rejecting order:", err);
      showToast("Terjadi kesalahan saat reject order", "error");
    }
  };

  return (
    <Layout>
      <div className="dashboard-shell orders-shell">
        <section className="dashboard-summary finance-transactions-summary">
          <article className="summary-card summary-card--combined summary-card--four-cols">
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <Clock size={24} />
              </div>
              <div>
                <p className="summary-card__label">Menunggu Validasi</p>
                <p className="summary-card__value">{menungguOrders}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <CheckCircle size={24} />
              </div>
              <div>
                <p className="summary-card__label">Sudah Approve</p>
                <p className="summary-card__value">{approvedOrders}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <XCircle size={24} />
              </div>
              <div>
                <p className="summary-card__label">Ditolak</p>
                <p className="summary-card__value">{ditolakOrders}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className="summary-card__icon accent-orange">
                <DollarSign size={24} />
              </div>
              <div>
                <p className="summary-card__label">Total Nilai Menunggu</p>
                <p className="summary-card__value">{totalNilaiMenunggu}</p>
              </div>
            </div>
          </article>
        </section>


        <section className="dashboard-hero orders-hero">
          <div className="orders-toolbar">
            <div className="orders-search">
              <input
                type="search"
                placeholder="Cari customer, produk, atau nominal..."
                className="orders-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="orders-search__icon pi pi-search" />
            </div>
            <div className="orders-toolbar-buttons">
              <div className="orders-filters" aria-label="Filter pesanan">
                <button
                  type="button"
                  className={`orders-filter-btn ${filterPreset === "all" ? "is-active" : ""}`}
                  onClick={() => setFilterPreset("all")}
                >
                  Semua
                </button>
                <button
                  type="button"
                  className={`orders-filter-btn ${filterPreset === "today" ? "is-active" : ""}`}
                  onClick={() => setFilterPreset("today")}
                >
                  Hari Ini
                </button>
                <button
                  type="button"
                  className="orders-filter-btn orders-filter-icon-btn"
                  title="Filter"
                  aria-label="Filter"
                  onClick={() => { }}
                >
                  <Filter size={16} />
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <Calendar
                  value={dateRange}
                  onChange={(e) => setDateRange(e.value)}
                  selectionMode="range"
                  readOnlyInput
                  showIcon
                  icon="pi pi-calendar"
                  placeholder="Pilih tanggal"
                  dateFormat="dd M yy"
                  monthNavigator
                  yearNavigator
                  yearRange="2020:2030"
                  style={{
                    width: "100%",
                    minWidth: "250px"
                  }}
                  inputStyle={{
                    width: "100%",
                    padding: "0.55rem 2.2rem 0.55rem 0.75rem",
                    border: "1px solid var(--dash-border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.85rem",
                    background: "var(--dash-surface)",
                    color: "var(--dash-text)",
                    boxShadow: "none",
                    cursor: "pointer"
                  }}
                  panelStyle={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
              {dateRange && Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1] && (
                <button
                  onClick={() => setDateRange(null)}
                  className="orders-button orders-button--secondary"
                  style={{ whiteSpace: "nowrap" }}
                >
                  <i className="pi pi-times" style={{ marginRight: "0.25rem" }} />
                  Reset
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="panel orders-panel">
          <div className="panel__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <p className="panel__eyebrow">Validasi Transactions</p>
              <h3 className="panel__title">Daftar Transactions</h3>
            </div>
          </div>

          <div className="finance-transactions-table__wrapper">
            <div className="finance-transactions-table">
              <div className="finance-transactions-table__head">
                {ORDERS_COLUMNS.map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </div>
              <div className="finance-transactions-table__body">
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((payment, i) => {
                    const orderRel = payment.order_rel || {};

                    const orderId = orderRel.id ?? payment.order_id ?? payment.id ?? "-";
                    const orderRefDisplay = orderRel.kode_order ?? orderId;
                    const customerNama =
                      orderRel.customer_rel?.nama || "-";
                    const produkNama = orderRel.produk_rel?.nama || "-";

                    const totalOrder = Number(orderRel.total_harga || 0);
                    const totalPaid = Number(payment.total_paid || 0);
                    const remaining =
                      payment.remaining !== undefined &&
                        payment.remaining !== null
                        ? Number(payment.remaining)
                        : Math.max(totalOrder - totalPaid, 0);

                    // Cek apakah status pembayaran adalah type 4 (DP)
                    // Menggunakan relasi order_id (payment.order_rel) untuk mendapatkan status_pembayaran dari order
                    // Hanya tampilkan Total Paid & Remaining jika status_pembayaran === 4 (DP)

                    // Prioritas 1: order_rel.status_pembayaran (dari relasi payment ke order)
                    let statusPembayaran = null;
                    if (orderRel.status_pembayaran !== undefined && orderRel.status_pembayaran !== null) {
                      statusPembayaran = Number(orderRel.status_pembayaran);
                    }
                    // Prioritas 2: orderDetailsCache (jika sudah di-fetch sebelumnya)
                    else if (orderDetailsCache[orderId]?.status_pembayaran !== undefined && orderDetailsCache[orderId]?.status_pembayaran !== null) {
                      statusPembayaran = Number(orderDetailsCache[orderId].status_pembayaran);
                    }
                    // Prioritas 3: Fetch order detail jika belum ada di cache dan orderId valid
                    else if (orderId && orderId !== "-" && !fetchingOrdersRef.current.has(orderId)) {
                      // Trigger fetch (async, tidak blocking render)
                      fetchOrderDetail(orderId).then((orderDetail) => {
                        if (orderDetail?.status_pembayaran !== undefined && orderDetail?.status_pembayaran !== null) {
                          // Update akan trigger re-render dengan data baru
                          setOrderDetailsCache((prev) => ({
                            ...prev,
                            [orderId]: orderDetail,
                          }));
                        }
                      });
                    }

                    // Tentukan isDP:
                    // 1. Jika statusPembayaran sudah tersedia, gunakan itu (statusPembayaran === 4)
                    // 2. Jika statusPembayaran masih null, gunakan heuristik: jika total_paid > 0 dan remaining > 0, kemungkinan besar ini DP
                    //    (karena jika sudah lunas, remaining akan 0, dan jika unpaid, total_paid akan 0)
                    const isDP = statusPembayaran === 4 || (statusPembayaran === null && totalPaid > 0 && remaining > 0);

                    const paymentKe = payment.payment_ke !== undefined && payment.payment_ke !== null
                      ? payment.payment_ke
                      : "-";

                    // Format tanggal bayar: "27-12-2025" (hanya tanggal, tanpa jam)
                    const formatTanggalBayar = (tanggal) => {
                      if (!tanggal) return "-";
                      const date = new Date(tanggal);
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const year = date.getFullYear();
                      return `${day}-${month}-${year}`;
                    };

                    const tanggalBayar = formatTanggalBayar(payment.tanggal);

                    const statusCode = Number(
                      payment.status === null || payment.status === undefined
                        ? 0
                        : payment.status
                    );
                    const validationInfo =
                      VALIDATION_STATUS_MAP[statusCode] || {
                        label: "-",
                        class: "default",
                      };

                    // Finance harus bisa koreksi (salah approve / salah reject),
                    // jadi tombol Approve & Reject selalu tersedia untuk setiap pembayaran
                    const canApproveReject = true;

                    return (
                      <div
                        className="finance-transactions-table__row"
                        key={payment.id || `payment-${i}`}
                      >
                        <div className="finance-transactions-table__cell" data-label="#">
                          {(page - 1) * perPage + i + 1}
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Order ID">
                          {orderRefDisplay}
                        </div>
                        <div
                          className="finance-transactions-table__cell finance-transactions-table__cell--strong"
                          data-label="Customer"
                        >
                          {customerNama}
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Produk">
                          {produkNama}
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Total Harga">
                          <div className="payment-details">
                            <div className="payment-main">
                              <strong>Rp {totalOrder.toLocaleString("id-ID")}</strong>
                            </div>

                            {/* Total Paid & Remaining - hanya tampilkan untuk status pembayaran DP (4) */}
                            {isDP && (
                              <div className="payment-breakdown">
                                <div className="payment-item">
                                  <span className="payment-label">Total Paid:</span>
                                  <span className="payment-value paid">
                                    Rp {totalPaid.toLocaleString("id-ID")}
                                  </span>
                                </div>
                                <div className="payment-item">
                                  <span className="payment-label">Remaining:</span>
                                  <span className="payment-value remaining">
                                    {remaining <= 0 ? (
                                      <span className="orders-status-badge orders-status-badge--valid">Lunas</span>
                                    ) : (
                                      <>Rp {remaining.toLocaleString("id-ID")}</>
                                    )}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Pembayaran Ke -">
                          {paymentKe}
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Amount">
                          <span style={{ fontWeight: 600, color: "#059669" }}>
                            Rp {Number(payment.amount || 0).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Status Validasi">
                          <span className={`orders-status-badge orders-status-badge--${validationInfo.class}`}>
                            {validationInfo.label}
                          </span>
                        </div>
                        <div className="finance-transactions-table__cell" data-label="Tanggal Bayar">
                          {tanggalBayar}
                        </div>
                        <div
                          className="finance-transactions-table__cell finance-transactions-table__cell--actions"
                          data-label="Actions"
                        >
                          <button
                            className="orders-action-btn"
                            title="Detail pembayaran"
                            onClick={() => handleView(payment)}
                          >
                            Detail
                          </button>

                          {canApproveReject && (
                            <>
                              {statusCode !== 2 && (
                                <button
                                  className="orders-action-btn"
                                  title="Approve"
                                  onClick={() => handleApprove(payment)}
                                  style={{
                                    background: "#10b981",
                                    color: "#fff",
                                    borderColor: "#10b981",
                                    padding: "0.4rem 0.8rem",
                                  }}
                                >
                                  Approve
                                </button>
                              )}
                              <button
                                className="orders-action-btn"
                                title="Reject"
                                onClick={() => handleReject(payment)}
                                style={{
                                  background: "#ef4444",
                                  color: "#fff",
                                  borderColor: "#ef4444",
                                  padding: "0.4rem 0.8rem",
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="finance-transactions-table__empty">
                    {orders.length
                      ? "Tidak ada hasil pencarian."
                      : "Loading data pembayaran..."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Pagination dengan Next/Previous Button */}
          <div
            className="orders-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "1rem",
              padding: "1.5rem",
              flexWrap: "wrap",
            }}
          >
            {/* Previous Button */}
            <button
              className="orders-pagination__btn"
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
              aria-label="Previous page"
              style={{
                padding: "0.75rem 1rem",
                minWidth: "100px",
                background:
                  page === 1 || loading ? "#e5e7eb" : "#f1a124",
                color: page === 1 || loading ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: "0.5rem",
                cursor:
                  page === 1 || loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              <i className="pi pi-chevron-left" />
              Previous
            </button>

            {/* Page Info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.95rem",
                color: "var(--dash-text)",
                fontWeight: 500,
              }}
            >
              {loading ? (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <i className="pi pi-spin pi-spinner" />
                  Loading...
                </span>
              ) : (
                <span>
                  Page {paginationInfo?.current_page || page} of{" "}
                  {paginationInfo?.last_page || "?"}
                  {paginationInfo?.total
                    ? ` (${paginationInfo.total} total)`
                    : ""}
                </span>
              )}
            </div>

            {/* Next Button */}
            <button
              className="orders-pagination__btn"
              onClick={handleNextPage}
              disabled={!hasMore || loading}
              aria-label="Next page"
              style={{
                padding: "0.75rem 1rem",
                minWidth: "100px",
                background:
                  !hasMore || loading ? "#e5e7eb" : "#f1a124",
                color: !hasMore || loading ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: "0.5rem",
                cursor:
                  !hasMore || loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              Next
              <i className="pi pi-chevron-right" />
            </button>
          </div>
        </section>

        {/* TOAST */}
        {toast.show && (
          <div className={`toast toast-${toast.type || "success"} toast-show`}>
            <div className="toast-icon">
              {toast.type === "error" ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : toast.type === "warning" ? (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="toast-content">
              <div className="toast-message">{toast.message}</div>
            </div>
            <button
              className="toast-close"
              onClick={() => setToast({ show: false, message: "", type: "success" })}
              aria-label="Close"
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="toast-progress"></div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showView && selectedOrder && (
        <ViewOrders
          order={selectedOrder}
          onClose={() => {
            setShowView(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showApprove && selectedOrder && (
        <ApproveOrder
          order={selectedOrder}
          onClose={() => {
            setShowApprove(false);
            setSelectedOrder(null);
          }}
          onApprove={onApprove}
        />
      )}

      {showReject && selectedOrder && (
        <RejectOrder
          order={selectedOrder}
          onClose={() => {
            setShowReject(false);
            setSelectedOrder(null);
          }}
          onCloseWithRefresh={async () => {
            setShowReject(false);
            setSelectedOrder(null);
            await requestRefresh();
          }}
          onReject={onReject}
        />
      )}

      {approveSuccess && (
        <div
          className="orders-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-approve-success-title"
        >
          <div className="orders-modal-card" style={{ maxWidth: "420px" }}>
            <div className="orders-modal-header">
              <div>
                <p className="orders-modal-eyebrow">Berhasil</p>
                <h2 id="finance-approve-success-title">Approval selesai</h2>
              </div>
              <button
                className="orders-modal-close"
                type="button"
                aria-label="Tutup"
                onClick={() => setApproveSuccess(null)}
              >
                <i className="pi pi-times" />
              </button>
            </div>
            <div className="orders-modal-body">
              <p style={{ margin: "0 0 1rem", color: "#374151", lineHeight: 1.5 }}>
                {approveSuccess.message}
              </p>
              <div className="detail-list">
                <div className="detail-item">
                  <span className="detail-label">Order ID</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">#{approveSuccess.orderId ?? "-"}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Produk</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value">{approveSuccess.productName}</span>
                </div>
                {approveSuccess.amount != null && (
                  <div className="detail-item">
                    <span className="detail-label">Jumlah disetujui</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value" style={{ fontWeight: 600, color: "#059669" }}>
                      Rp {Number(approveSuccess.amount).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
                <div
                  className="detail-item"
                  style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}
                >
                  <span className="detail-label">Meta Pixel</span>
                  <span className="detail-colon">:</span>
                  <span className="detail-value" style={{ fontSize: "0.85rem", color: "#4b5563" }}>
                    {approveSuccess.pixelSent
                      ? "Event Purchase dikirim (produk mengaktifkan event Purchase & memiliki Pixel ID)."
                      : "Tidak mengirim Purchase — aktifkan event Purchase di pengaturan produk dan pastikan Pixel ID terisi."}
                  </span>
                </div>
              </div>
            </div>
            <div className="orders-modal-footer">
              <button
                type="button"
                className="orders-btn orders-btn--primary"
                style={{ width: "100%", background: "#f1a124", color: "#fff" }}
                onClick={() => setApproveSuccess(null)}
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

