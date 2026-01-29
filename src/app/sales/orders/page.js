"use client";

import { useEffect, useState, useRef, useMemo, useCallback, memo } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import { ShoppingCart, Clock, CheckCircle, PartyPopper, XCircle, X, Filter, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Calendar } from "primereact/calendar";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "@/styles/sales/orders-page.css";
import { getOrders, updateOrderAdmin, getOrderStatistics } from "@/lib/sales/orders";
import { api } from "@/lib/api";
import { createPortal } from "react-dom";

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

// Lazy load modals - sama seperti customers
// CSS di-import di dalam komponen masing-masing
const ViewOrders = dynamic(() => import("./viewOrders"), { ssr: false });
const UpdateOrders = dynamic(() => import("./updateOrders"), { ssr: false });
const AddOrders = dynamic(() => import("./addOrders"), { ssr: false });
const PaymentHistoryModal = dynamic(() => import("./paymentHistoryModal"), { ssr: false });

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

// Status Pembayaran Mapping
// Status Pembayaran Mapping
const STATUS_PEMBAYARAN_MAP = {
  0: { label: "Unpaid", class: "unpaid" },
  null: { label: "Unpaid", class: "unpaid" },
  1: { label: "Waiting Approval", class: "pending" }, // Menunggu approve finance
  2: { label: "Paid", class: "paid" },             // Finance approved
  3: { label: "Rejected", class: "rejected" },
  4: { label: "Partial Payment", class: "partial" },
};

// Status Order Mapping
const STATUS_ORDER_MAP = {
  "1": { label: "Pending", class: "pending" },
  "2": { label: "Processing", class: "success" },
  "3": { label: "Failed", class: "failed" },
  "4": { label: "Completed", class: "completed" },
  "N": { label: "Deleted", class: "deleted" },
};

const ORDERS_COLUMNS = [
  { line1: "Order", line2: "Id" },
  null, // Kolom kosong untuk ExternalLink
  { line1: "Customer", line2: "" },
  { line1: "Produk", line2: "" },
  { line1: "Status", line2: "Pembayaran" },
  { line1: "Status", line2: "Order" },
  { line1: "Follow Up", line2: "Text" },
  { line1: "Bukti", line2: "Pembayaran" },
  { line1: "Gross", line2: "Revenue" },
  { line1: "Sales", line2: "" },
  null, // Kolom kosong untuk Update/Konfirmasi button
];


// Helper component untuk WA Bubble Chat dengan deteksi status
const WABubbleChat = ({ customerId, orderId, orderStatus, statusPembayaran, productId, customerWa, onOpenTimeline }) => {
  const [orderLogs, setOrderLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    fetchOrderLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const fetchOrderLogs = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/sales/order/${orderId}/logs-follup`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        // Handle both array and object format (data.logs)
        const logs = Array.isArray(json.data) ? json.data : (json.data?.logs || []);
        setOrderLogs(logs);
      } else {
        setOrderLogs([]);
      }
    } catch (err) {
      console.error("Error fetching order logs:", err);
      setOrderLogs([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cek apakah log dengan type tertentu sukses (status "1")
   * @param {string|string[]} checkType - Satu tipe atau array tipe string/angka
   */
  const isLogSuccess = (checkType) => {
    if (loading || !orderLogs || orderLogs.length === 0) return false;

    const targets = Array.isArray(checkType)
      ? checkType.map(t => String(t).toLowerCase())
      : [String(checkType).toLowerCase()];

    return orderLogs.some(log => {
      const logType = String(log.type || "").toLowerCase();
      const isSuccess = String(log.status) === "1";

      if (!isSuccess) return false;

      // Match via log type
      if (targets.includes(logType)) return true;

      // Match via follup relationship type
      if (log.follup_rel && targets.includes(String(log.follup_rel.type).toLowerCase())) {
        return true;
      }

      return false;
    });
  };

  // Status mapping logic
  const isWAActive = () => isLogSuccess(["order dibuat", "register", "5"]);
  const isFollupActive = (num) => isLogSuccess(num);
  const isPaymentActive = () => isLogSuccess(["upload pembayaran", "proses", "6"]) || Number(statusPembayaran) === 2;
  const isSelesaiActive = () => isLogSuccess(["7", "selesai"]) || Number(orderStatus) === 2;
  const isUpsellingActive = () => isLogSuccess(["8", "upselling"]) || Number(orderStatus) === 4;

  // Helper utk create bubble UI
  const createBubble = (content, isActive, key, isWAIcon = false, title = "") => {
    const bgColor = isActive ? "#25D366" : "#E5E7EB";
    const textColor = isActive ? "white" : "#6B7280";

    return (
      <div key={key} title={title} style={{
        position: "relative",
        background: bgColor,
        borderRadius: "7px 7px 7px 0",
        width: "28px",
        height: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        color: textColor,
        fontWeight: "bold",
        flexShrink: 0,
        cursor: "pointer"
      }}>
        {isWAIcon ? (
          <svg viewBox="0 0 24 24" width="16" height="16" fill={textColor}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        ) : (
          content
        )}
      </div>
    );
  };

  const bubbles = [];

  // 1. Bubble Logo WA & "W" (Register)
  const activeW = isWAActive();
  bubbles.push(createBubble("W", activeW, "bubble-w", false, activeW ? "Register (Sukses)" : "Register"));

  // 2. Bubble Follow Up 1-4
  for (let i = 1; i <= 4; i++) {
    const active = isFollupActive(i);
    bubbles.push(createBubble(i.toString(), active, `bubble-${i}`, false, `Follow Up ${i} ${active ? '(Sukses)' : ''}`));
  }

  // 3. Bubble P (Proses / Upload Pembayaran)
  const activeP = isPaymentActive();
  bubbles.push(createBubble("P", activeP, "bubble-p", false, activeP ? "Pembayaran Terdeteksi / Sukses" : "Pembayaran"));

  return (
    <div
      onClick={onOpenTimeline}
      className="wa-bubble-container"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        background: "#FEF3C7",
        borderRadius: "8px",
        flexWrap: "nowrap",
        width: "fit-content",
        overflow: "visible",
        cursor: "pointer",
        transition: "transform 0.2s ease"
      }}>
      {bubbles}
    </div>
  );
};

// Helper component untuk WA Bubble Chat (chat bubble shape) - OLD VERSION
const WABubbleChatOld = ({ followUpCount = 0 }) => {
  const bubbles = [];

  // WhatsApp icon bubble (hijau) - menggunakan SVG
  bubbles.push(
    <div key="wa-logo" style={{
      position: "relative",
      background: "#25D366",
      borderRadius: "7px 7px 7px 0",
      width: "24px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2px 4px"
    }}>
      <svg viewBox="0 0 24 24" width="14" height="14" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </div>
  );

  // W bubble (hijau)
  bubbles.push(
    <div key="w" style={{
      position: "relative",
      background: "#25D366",
      borderRadius: "7px 7px 7px 0",
      width: "24px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      color: "white",
      fontWeight: "bold"
    }}>
      W
    </div>
  );

  // Number bubbles: 1 (gray), 2-4 (green jika ada), ... (gray jika > 4)
  if (followUpCount > 0) {
    // Bubble 1 (selalu gray)
    bubbles.push(
      <div key="bubble-1" style={{
        position: "relative",
        background: "#E5E7EB",
        borderRadius: "7px 7px 7px 0",
        width: "24px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        color: "#6B7280",
        fontWeight: "bold"
      }}>
        1
      </div>
    );

    // Bubbles 2-4 (green jika followUpCount >= 2)
    for (let i = 2; i <= Math.min(followUpCount, 4); i++) {
      bubbles.push(
        <div key={`bubble-${i}`} style={{
          position: "relative",
          background: "#25D366",
          borderRadius: "7px 7px 7px 0",
          width: "24px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          color: "white",
          fontWeight: "bold"
        }}>
          {i}
        </div>
      );
    }

    // Jika lebih dari 4, tambahkan gray bubble dengan ...
    if (followUpCount > 4) {
      bubbles.push(
        <div key="more" style={{
          position: "relative",
          background: "#E5E7EB",
          borderRadius: "7px 7px 7px 0",
          width: "24px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "10px",
          color: "#6B7280",
          fontWeight: "bold"
        }}>
          ...
        </div>
      );
    }
  } else {
    // Jika tidak ada follow up, tambahkan gray bubble dengan 1
    bubbles.push(
      <div key="no-followup" style={{
        position: "relative",
        background: "#E5E7EB",
        borderRadius: "7px 7px 7px 0",
        width: "24px",
        height: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12px",
        color: "#6B7280",
        fontWeight: "bold"
      }}>
        1
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "3px",
      padding: "4px 8px",
      background: "#FEF3C7",
      borderRadius: "8px",
      flexWrap: "wrap"
    }}>
      {bubbles}
    </div>
  );
};

export default function DaftarPesanan() {
  // Pagination state dengan fallback pagination
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState([]);
  const [hasMore, setHasMore] = useState(true); // penentu masih ada halaman berikutnya
  const [loading, setLoading] = useState(false);
  const [paginationInfo, setPaginationInfo] = useState(null); // Store pagination info from backend
  const perPage = 15; // Data per halaman

  // Filter state
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 500); // Debounce 500ms
  const [dateRange, setDateRange] = useState(null); // [startDate, endDate] atau null
  const [filterPreset, setFilterPreset] = useState("all"); // all | today
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]); // Array of product IDs
  const [selectedProductsData, setSelectedProductsData] = useState([]); // Array of full product objects
  const [selectedStatusOrder, setSelectedStatusOrder] = useState([]); // Array of status order values
  const [selectedStatusPembayaran, setSelectedStatusPembayaran] = useState([]); // Array of status pembayaran values
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState([]);

  // State lainnya
  const [statistics, setStatistics] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState({}); // { orderId: [payments] }
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedOrderIdForHistory, setSelectedOrderIdForHistory] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);

  // Timeline Modal State
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [selectedTimelineLog, setSelectedTimelineLog] = useState(null);
  const [timelineLogs, setTimelineLogs] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const fetchingRef = useRef(false); // Prevent multiple simultaneous fetches

  // Convert filter untuk API (termasuk search) - sama seperti customers
  const filters = useMemo(() => ({
    search: debouncedSearch.trim() || null,
    dateRange: dateRange,
    statusOrder: selectedStatusOrder,
    statusPembayaran: selectedStatusPembayaran,
    products: selectedProducts,
  }), [debouncedSearch, dateRange, selectedStatusOrder, selectedStatusPembayaran, selectedProducts]);

  // 🔹 Search produk untuk filter
  const handleSearchProduct = useCallback(async (keyword) => {
    if (!keyword.trim()) {
      setProductResults([]);
      return;
    }

    try {
      const res = await api("/sales/produk", { method: "GET" });
      if (res?.success && Array.isArray(res.data)) {
        const filtered = res.data.filter((prod) =>
          (prod.status === "1" || prod.status === 1) &&
          prod.nama?.toLowerCase().includes(keyword.toLowerCase())
        );
        setProductResults(filtered);
      } else {
        setProductResults([]);
      }
    } catch (err) {
      console.error("Error searching products:", err);
      setProductResults([]);
    }
  }, []);

  // Debounce product search
  const debouncedProductSearch = useDebouncedValue(productSearch, 300);

  useEffect(() => {
    if (debouncedProductSearch.trim().length >= 2) {
      handleSearchProduct(debouncedProductSearch);
    } else {
      setProductResults([]);
    }
  }, [debouncedProductSearch, handleSearchProduct]);

  // 🔹 Handle product selection (multiple)
  const handleToggleProduct = useCallback((product) => {
    const productId = typeof product === 'object' ? product.id : product;
    const productData = typeof product === 'object' ? product : productResults.find(p => p.id === productId);

    setSelectedProducts((prev) => {
      if (prev.includes(productId)) {
        // Remove from selected
        setSelectedProductsData((prevData) => prevData.filter(p => p.id !== productId));
        return prev.filter((id) => id !== productId);
      } else {
        // Add to selected
        if (productData) {
          setSelectedProductsData((prevData) => {
            // Check if already exists
            if (prevData.find(p => p.id === productId)) {
              return prevData;
            }
            return [...prevData, productData];
          });
        }
        return [...prev, productId];
      }
    });
  }, [productResults]);

  // 🔹 Handle status order toggle (multiple)
  const handleToggleStatusOrder = useCallback((status) => {
    setSelectedStatusOrder((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }, []);

  // 🔹 Handle status pembayaran toggle (multiple)
  const handleToggleStatusPembayaran = useCallback((status) => {
    setSelectedStatusPembayaran((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      } else {
        return [...prev, status];
      }
    });
  }, []);

  // 🔹 Reset all filters
  const handleResetFilters = useCallback(() => {
    setDateRange(null);
    setSelectedProducts([]);
    setSelectedProductsData([]);
    setSelectedStatusOrder([]);
    setSelectedStatusPembayaran([]);
    setProductSearch("");
    setProductResults([]);
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

      // Build query parameters
      const params = new URLSearchParams({
        page: String(pageNumber),
        per_page: String(perPage),
      });

      // Add search parameter (gunakan filters.search untuk konsistensi)
      if (filters.search && filters.search.trim()) {
        params.append("search", filters.search.trim());
      }

      // Add date range filter (tanggal orderan)
      if (filters.dateRange && Array.isArray(filters.dateRange) && filters.dateRange.length === 2 && filters.dateRange[0] && filters.dateRange[1]) {
        const fromDate = new Date(filters.dateRange[0]);
        const toDate = new Date(filters.dateRange[1]);
        // Set time to start and end of day
        fromDate.setHours(0, 0, 0, 0);
        toDate.setHours(23, 59, 59, 999);
        params.append("tanggal_from", fromDate.toISOString().split('T')[0]);
        params.append("tanggal_to", toDate.toISOString().split('T')[0]);
      }

      // Add status order filter (multiple)
      if (filters.statusOrder && filters.statusOrder.length > 0) {
        filters.statusOrder.forEach(status => {
          params.append("status_order", status);
        });
      }

      // Add status pembayaran filter (multiple)
      if (filters.statusPembayaran && filters.statusPembayaran.length > 0) {
        filters.statusPembayaran.forEach(status => {
          params.append("status_pembayaran", status);
        });
      }

      // Add produk filter (multiple) - jika backend support produk_id
      if (filters.products && filters.products.length > 0) {
        filters.products.forEach(productId => {
          params.append("produk_id", productId);
        });
      }

      const res = await fetch(`/api/sales/order?${params.toString()}`, {
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

      // Handle response dengan struktur baru: { success: true, message: "...", data: [...], pagination: {...} }
      if (json.success && json.data && Array.isArray(json.data)) {
        // Normalisasi data: pastikan status_pembayaran tetap 4 jika masih ada remaining
        // dan status_order tetap "Proses" (1) meskipun ada payment yang di-reject
        const normalizedData = json.data.map((order) => {
          const totalHarga = Number(order.total_harga || 0);
          const totalPaid = Number(order.total_paid || 0);
          const remaining = order.remaining !== undefined
            ? Number(order.remaining)
            : (totalHarga - totalPaid);

          // Ambil waktu_pembayaran dari order_payment_rel jika ada
          // Prioritas: ambil dari payment yang statusnya approved (status "2") atau yang terbaru
          let waktuPembayaran = order.waktu_pembayaran || "";
          if (!waktuPembayaran && order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
            // Cari payment yang statusnya approved (status "2") terlebih dahulu
            const approvedPayment = order.order_payment_rel.find(p => String(p.status).trim() === "2");
            if (approvedPayment && approvedPayment.create_at) {
              // Format create_at dari "2025-12-27 08:57:53" ke format yang diinginkan
              const date = new Date(approvedPayment.create_at);
              const pad = (n) => n.toString().padStart(2, "0");
              waktuPembayaran = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
            } else {
              // Jika tidak ada yang approved, ambil yang terbaru (create_at terakhir)
              const latestPayment = order.order_payment_rel.sort((a, b) => {
                const dateA = new Date(a.create_at || 0);
                const dateB = new Date(b.create_at || 0);
                return dateB - dateA;
              })[0];
              if (latestPayment && latestPayment.create_at) {
                const date = new Date(latestPayment.create_at);
                const pad = (n) => n.toString().padStart(2, "0");
                waktuPembayaran = `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
              }
            }
          }

          // LOGIKA STATUS PEMBAYARAN:
          // Gunakan status dari backend untuk konsistensi dengan filter.
          // Frontend tidak boleh memaksa ubah status karena akan menyebabkan ketidaksesuaian dengan filter.
          // Contoh: Filter "Pending", tapi frontend maksa jadi "Paid" -> User bingung.
          let statusPembayaran = order.status_pembayaran;

          // Fallback ringan hanya jika null/undefined
          if (statusPembayaran === null || statusPembayaran === undefined) {
            if (totalPaid >= totalHarga && totalHarga > 0) statusPembayaran = 2;
            else if (totalPaid > 0) statusPembayaran = 4;
            else statusPembayaran = 0;
          }

          // Status Order: Gunakan dari backend
          let statusOrder = order.status_order ?? order.status ?? "1";

          return {
            ...order,
            status_pembayaran: statusPembayaran,
            status_order: statusOrder,
            total_paid: totalPaid,
            remaining: remaining,
            waktu_pembayaran: waktuPembayaran, // Pastikan waktu_pembayaran ada
          };
        });

        // Selalu replace data (bukan append) - setiap page menampilkan data yang berbeda
        setOrders(normalizedData);

        // Gunakan pagination object jika tersedia
        if (json.pagination && typeof json.pagination === 'object') {
          // Struktur pagination: { current_page, last_page, per_page, total }
          const isLastPage = json.pagination.current_page >= json.pagination.last_page;
          setHasMore(!isLastPage);
          setPaginationInfo(json.pagination);
          console.log("📄 Pagination info:", {
            current_page: json.pagination.current_page,
            last_page: json.pagination.last_page,
            total: json.pagination.total,
            hasMore: !isLastPage
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
        // Jika response tidak sesuai format yang diharapkan
        console.warn("⚠️ Unexpected response format:", json);
        setOrders([]);
        setHasMore(false);
      }

      setLoading(false);
      fetchingRef.current = false;
    } catch (err) {
      console.error("Error fetching orders:", err);
      setToast({ show: true, message: "Gagal memuat data", type: "error" });
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [perPage, filters]);

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

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPage(1);
    setOrders([]);
    setHasMore(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, dateRange, selectedStatusOrder, selectedStatusPembayaran, selectedProducts]); // Reset when search or filter changes

  // Fetch data saat page atau filters berubah
  useEffect(() => {
    if (page > 0) {
      fetchOrders(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]); // Depend pada page dan filters (sama seperti customers)

  // Scroll to top and prevent body scroll when filter modal opens
  useEffect(() => {
    if (showFilterModal && typeof window !== "undefined") {
      // Get current scroll position
      const scrollY = window.scrollY;

      // Force scroll to top immediately BEFORE locking body
      window.scrollTo(0, 0);

      // Then prevent body scroll and lock position
      requestAnimationFrame(() => {
        document.body.style.position = "fixed";
        document.body.style.top = "0";
        document.body.style.width = "100%";
        document.body.style.overflow = "hidden";
      });

      return () => {
        // Restore body scroll
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [showFilterModal]);

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
    if (message) {
      setToast({ show: true, message, type });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };

  // Helper untuk build URL gambar via proxy
  const buildImageUrl = useCallback((path) => {
    if (!path) return null;
    const cleanPath = path.replace(/^\/?(storage\/)?/, "");
    return `/api/image?path=${encodeURIComponent(cleanPath)}`;
  }, []);

  // Handler untuk buka modal gambar
  const handleOpenImageModal = useCallback((imageUrl) => {
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  }, []);

  // Handler untuk tutup modal gambar
  const handleCloseImageModal = useCallback(() => {
    setShowImageModal(false);
    setSelectedImageUrl(null);
  }, []);

  // Helper untuk mengambil bukti_pembayaran dari order_payment_rel
  const getBuktiPembayaran = useCallback((order) => {
    if (order.bukti_pembayaran) {
      return order.bukti_pembayaran;
    }
    if (order.order_payment_rel && Array.isArray(order.order_payment_rel) && order.order_payment_rel.length > 0) {
      const approvedPayment = order.order_payment_rel.find(p => String(p.status).trim() === "2");
      if (approvedPayment && approvedPayment.bukti_pembayaran) {
        return approvedPayment.bukti_pembayaran;
      }
      const latestPayment = order.order_payment_rel.sort((a, b) => {
        const dateA = new Date(a.create_at || 0);
        const dateB = new Date(b.create_at || 0);
        return dateB - dateA;
      })[0];
      if (latestPayment && latestPayment.bukti_pembayaran) {
        return latestPayment.bukti_pembayaran;
      }
    }
    return null;
  }, []);

  // Format tanggal untuk Order ID: "11 Jan 2026, 22.40"
  const formatOrderDate = useCallback((dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";

      const day = date.getDate();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");

      return `${day} ${month} ${year}, ${hours}.${minutes}`;
    } catch {
      return "-";
    }
  }, []);

  // Format tanggal & jam lengkap untuk timeline
  const formatDateTime = useCallback((dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const d = String(date.getDate()).padStart(2, '0');
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const y = date.getFullYear();
      const h = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${d}-${m}-${y} ${h}:${min}`;
    } catch {
      return "-";
    }
  }, []);

  // Format tanggal hanya menampilkan tanggal tanpa jam (YYYY-MM-DD)
  const formatDateOnly = useCallback((dateString) => {
    if (!dateString) return "-";
    try {
      // Jika sudah format YYYY-MM-DD, langsung return
      if (typeof dateString === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      // Jika ada jam, ambil hanya bagian tanggal
      if (typeof dateString === "string" && dateString.includes(" ")) {
        return dateString.split(" ")[0];
      }
      // Jika ada T (ISO format), ambil hanya bagian tanggal
      if (typeof dateString === "string" && dateString.includes("T")) {
        return dateString.split("T")[0];
      }
      // Jika Date object, format ke YYYY-MM-DD
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "-";
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    } catch {
      return "-";
    }
  }, []);

  // 🔹 Format date range untuk display
  const formatDateRange = useCallback((range) => {
    if (!range || !Array.isArray(range) || range.length !== 2 || !range[0] || !range[1]) {
      return "Pilih tanggal";
    }

    const formatDate = (date) => {
      const d = new Date(date);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    };

    return `${formatDate(range[0])} - ${formatDate(range[1])}`;
  }, []);

  // === Helper ===
  const computeStatusBayar = useCallback((o) => {
    // Cek dari order_payment_rel jika ada
    if (o.order_payment_rel && Array.isArray(o.order_payment_rel) && o.order_payment_rel.length > 0) {
      // Jika ada payment yang approved (status "2"), berarti sudah paid
      const hasApprovedPayment = o.order_payment_rel.some(p => String(p.status).trim() === "2");
      if (hasApprovedPayment) {
        return 1; // Paid
      }
      // Jika ada payment yang pending (status "1"), berarti menunggu
      const hasPendingPayment = o.order_payment_rel.some(p => String(p.status).trim() === "1");
      if (hasPendingPayment) {
        return 1; // Menunggu (dianggap sebagai status pembayaran yang sudah ada)
      }
    }
    // Fallback ke logika lama
    if (
      o.bukti_pembayaran &&
      o.bukti_pembayaran !== "" &&
      o.waktu_pembayaran &&
      o.waktu_pembayaran !== ""
    ) {
      return 1; // Paid
    }
    return 0; // Unpaid
  }, []);


  // === SUMMARY ===
  // Gunakan data dari statistics API
  const totalOrders = statistics?.total_order || 0;
  const unpaidOrders = statistics?.total_order_unpaid || 0;
  const menungguOrders = statistics?.total_order_menunggu || 0;
  const approvedOrders = statistics?.total_order_sudah_diapprove || 0;
  const ditolakOrders = statistics?.total_order_ditolak || 0;



  // === EVENT HANDLERS ===
  const handleView = (order) => {
    setSelectedOrder(order);
    setShowView(true);
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setShowEdit(true);
  };

  const handleShowPaymentHistory = (order) => {
    if (order?.id) {
      setSelectedOrderIdForHistory(order.id);
      setShowPaymentHistory(true);
    }
  };

  const handleOpenTimeline = async (order) => {
    setSelectedTimelineLog({
      orderId: order.id,
      customerName: order.customer_rel?.nama || "-",
      customerPhone: order.customer_rel?.wa || "-"
    });
    setIsTimelineModalOpen(true);
    setLoadingTimeline(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/sales/order/${order.id}/logs-follup`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const logs = Array.isArray(json.data) ? json.data : (json.data?.logs || []);
        setTimelineLogs(logs);
      } else {
        setTimelineLogs([]);
      }
    } catch (err) {
      console.error("Error fetching timeline logs:", err);
      setTimelineLogs([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const closeTimelineModal = () => {
    setIsTimelineModalOpen(false);
    setSelectedTimelineLog(null);
    setTimelineLogs([]);
  };

  const handleSuccessEdit = async (updatedFromForm) => {
    try {
      if (!selectedOrder?.id) {
        setToast({ show: true, message: "Order ID tidak valid", type: "error" });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
        return;
      }

      // Cek apakah ini konfirmasi pembayaran (ada status_pembayaran, total_paid, atau remaining)
      const isPaymentConfirmation =
        updatedFromForm.status_pembayaran !== undefined ||
        updatedFromForm.total_paid !== undefined ||
        updatedFromForm.remaining !== undefined ||
        updatedFromForm.bukti_pembayaran !== undefined;

      // Jika ini konfirmasi pembayaran, langsung update state tanpa memanggil updateOrderAdmin
      // karena konfirmasi pembayaran sudah dilakukan via API order-konfirmasi
      if (isPaymentConfirmation) {
        // Tutup modal
        setShowEdit(false);

        // Hitung remaining untuk menentukan apakah masih DP
        const totalHarga = Number(updatedFromForm.total_harga ?? selectedOrder?.total_harga ?? 0);
        const totalPaid = Number(updatedFromForm.total_paid ?? selectedOrder?.total_paid ?? 0);
        const remaining = updatedFromForm.remaining !== undefined
          ? Number(updatedFromForm.remaining)
          : (totalHarga - totalPaid);

        // Tentukan status pembayaran:
        // - Jika sudah lunas (total_paid >= total_harga), set ke 2 (Paid)
        // - Jika masih ada remaining (total_paid < total_harga), set ke 4 (DP)
        // - Status pembayaran harus tetap 4 (DP) sampai remaining = 0
        // - Perubahan status payment individual (approve/reject) hanya mempengaruhi paymentHistoryModal.js, bukan page.js
        let finalStatusPembayaran;

        if (totalPaid >= totalHarga) {
          // Jika sudah lunas, set ke 2 (Paid)
          finalStatusPembayaran = 2;
        } else if (remaining > 0 || totalPaid < totalHarga) {
          // Jika masih ada remaining, set ke 4 (DP)
          // Ini berlaku untuk konfirmasi pertama kali (dari Unpaid) maupun konfirmasi lanjutan
          finalStatusPembayaran = 4;
        } else {
          // Fallback: gunakan status dari form atau order
          finalStatusPembayaran = updatedFromForm.status_pembayaran ?? selectedOrder?.status_pembayaran ?? 0;
        }

        // Update state orders dengan data dari form (yang sudah diupdate dari konfirmasi pembayaran)
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id
              ? {
                ...o,
                ...updatedFromForm,

                // Pastikan status_pembayaran tetap 4 jika masih ada remaining
                status_pembayaran: finalStatusPembayaran,

                // Pastikan total_paid dan remaining tetap ada
                total_paid: totalPaid,
                remaining: remaining,

                // pertahankan relasi supaya view tidak error
                customer_rel: updatedFromForm.customer_rel || o.customer_rel,
                produk_rel: updatedFromForm.produk_rel || o.produk_rel,
              }
              : o
          )
        );

        // Reset selected
        setSelectedOrder(null);

        setToast({ show: true, message: updatedFromForm.message || "Pembayaran berhasil dikonfirmasi!", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);

        // Refresh statistics dan data dari backend
        await Promise.all([loadStatistics(), fetchOrders(page)]);
        return;
      }

      // Untuk update order biasa (bukan konfirmasi pembayaran), gunakan updateOrderAdmin
      const result = await updateOrderAdmin(selectedOrder.id, updatedFromForm);

      if (result.success) {
        const updatedFromAPI = result.data?.order || result.data;

        // Tutup modal
        setShowEdit(false);

        // Hitung remaining untuk menentukan apakah masih DP
        const totalHarga = Number(updatedFromAPI.total_harga ?? selectedOrder?.total_harga ?? 0);
        const totalPaid = Number(updatedFromAPI.total_paid ?? selectedOrder?.total_paid ?? 0);
        const remaining = updatedFromAPI.remaining !== undefined
          ? Number(updatedFromAPI.remaining)
          : (totalHarga - totalPaid);

        // Pastikan status_pembayaran tetap 4 jika masih ada remaining
        let finalStatusPembayaran = updatedFromAPI.status_pembayaran ?? selectedOrder?.status_pembayaran ?? 0;

        // Jika sebelumnya 4 dan masih ada remaining, tetap 4
        if (selectedOrder?.status_pembayaran === 4 && remaining > 0) {
          finalStatusPembayaran = 4;
        }
        // Jika ada pembayaran tapi belum lunas, set ke 4 (DP)
        else if (totalPaid > 0 && remaining > 0 && totalPaid < totalHarga) {
          finalStatusPembayaran = 4;
        }

        // Update state orders agar UI langsung berubah
        setOrders((prev) =>
          prev.map((o) =>
            o.id === selectedOrder.id
              ? {
                ...o,
                ...updatedFromAPI,

                // Pastikan status_pembayaran tetap 4 jika masih ada remaining
                status_pembayaran: finalStatusPembayaran,
                total_paid: totalPaid,
                remaining: remaining,

                // pertahankan relasi supaya view tidak error
                customer_rel: updatedFromAPI.customer_rel || o.customer_rel,
                produk_rel: updatedFromAPI.produk_rel || o.produk_rel,
              }
              : o
          )
        );

        // Reset selected
        setSelectedOrder(null);

        setToast({ show: true, message: result.message || "Order berhasil diupdate!", type: "success" });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);

        // Refresh statistics
        await loadStatistics();
      } else {
        setToast({ show: true, message: result.message || "Gagal mengupdate order", type: "error" });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
      }
    } catch (err) {
      console.error("Error updating order:", err);
      setToast({ show: true, message: "Terjadi kesalahan saat mengupdate order", type: "error" });
      setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
    }
  };


  const closeAllModals = () => {
    setShowAdd(false);
    setShowEdit(false);
    setShowDelete(false);
    setShowView(false);
    setSelectedOrder(null);
  };

  return (
    <Layout title="Manage Orders">
      <div className="orders-shell">
        <section className="orders-summary">
          <article className="summary-card summary-card--combined">
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <ShoppingCart size={22} />
              </div>
              <div>
                <p className="summary-card__label">Total orders</p>
                <p className="summary-card__value">{(totalOrders || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <Clock size={22} />
              </div>
              <div>
                <p className="summary-card__label">Unpaid</p>
                <p className="summary-card__value">{(unpaidOrders || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <Clock size={22} />
              </div>
              <div>
                <p className="summary-card__label">Pending</p>
                <p className="summary-card__value">{(menungguOrders || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="summary-card__label">Sukses</p>
                <p className="summary-card__value">{(approvedOrders || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
            <div className="summary-card__divider"></div>
            <div className="summary-card__column">
              <div className={`summary-card__icon accent-orange`}>
                <XCircle size={22} />
              </div>
              <div>
                <p className="summary-card__label">Ditolak</p>
                <p className="summary-card__value">{(ditolakOrders || 0).toLocaleString("id-ID")}</p>
              </div>
            </div>
          </article>
        </section>
        <section className="orders-hero">
          <div className="orders-toolbar">
            <div className="orders-search">
              <input
                type="search"
                placeholder="Cari customer, produk, alamat..."
                className="orders-search__input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <span className="orders-search__icon pi pi-search" />
            </div>
            <div className="orders-toolbar-buttons">
              {/* Filter Icon Button */}
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="customers-button customers-button--secondary"
                title="Filter"
              >
                <Filter size={16} />
              </button>
              <div style={{ position: "relative" }}>
                <Calendar
                  value={dateRange}
                  onChange={(e) => setDateRange(e.value)}
                  selectionMode="range"
                  readOnlyInput
                  showIcon
                  icon="pi pi-calendar"
                  placeholder="Pilih tanggal"
                  dateFormat="dd M yyyy"
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
                    border: "1px solid #e9ecef",
                    borderRadius: "0.5rem",
                    fontSize: "0.85rem",
                    background: "#ffffff",
                    color: "#212529",
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
              {(dateRange && Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1]) ||
                selectedProducts.length > 0 ||
                selectedStatusOrder.length > 0 ||
                selectedStatusPembayaran.length > 0 ? (
                <button
                  onClick={handleResetFilters}
                  className="customers-button customers-button--secondary"
                  title="Reset Filter"
                >
                  <i className="pi pi-times" />
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </section>
        <section className="panel orders-panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Directory</p>
              <h3 className="panel__title">Order roster</h3>
            </div>
            <div className="customers-toolbar-buttons">

              <button
                className="customers-button customers-button--primary"
                onClick={() => setShowAdd(true)}
              >
                + Tambah Pesanan
              </button>
            </div>
          </div>
          <div className="orders-table__wrapper">
            <table className="table-orders">
              <thead>
                <tr>
                  {/* STICKY LEFT 1: Order ID */}
                  <th className="sticky-left-1">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>ORDER</span>
                      <span>ID</span>
                    </div>
                  </th>

                  {/* STICKY LEFT 2: Customer */}
                  <th className="sticky-left-2">
                    CUSTOMER
                  </th>

                  {/* Product - Widened */}
                  <th className="col-product">
                    PRODUK
                  </th>

                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>STATUS</span>
                      <span>ORDER</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>STATUS</span>
                      <span>PEMBAYARAN</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>FOLLOW UP</span>
                      <span>TEXT</span>
                    </div>
                  </th>
                  <th style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span>BUKTI</span>
                      <span>PEMBAYARAN</span>
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>GROSS</span>
                      <span>REVENUE</span>
                    </div>
                  </th>
                  <th>SALES</th>

                  {/* Action Column - NON STICKY */}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.length > 0 ? (
                  orders.map((order, i) => {
                    // Handle produk name - dari produk_rel
                    const produkNama = order.produk_rel?.nama || "-";

                    // Handle customer name - dari customer_rel
                    const customerNama = order.customer_rel?.nama || "-";

                    // Get Status Order
                    const statusOrderRaw = order.status_order ?? order.status; // fallback ke order.status jika status_order kosong
                    const statusOrderValue = statusOrderRaw !== undefined && statusOrderRaw !== null
                      ? statusOrderRaw.toString()
                      : "";
                    const statusOrderInfo = STATUS_ORDER_MAP[statusOrderValue] || { label: "-", class: "default" };

                    // Get Status Pembayaran
                    let statusPembayaranValue = order.status_pembayaran;
                    if (statusPembayaranValue === null || statusPembayaranValue === undefined) {
                      statusPembayaranValue = 0;
                    } else {
                      statusPembayaranValue = Number(statusPembayaranValue);
                      if (isNaN(statusPembayaranValue)) {
                        statusPembayaranValue = 0;
                      }
                    }
                    const statusPembayaranInfo = STATUS_PEMBAYARAN_MAP[statusPembayaranValue] || STATUS_PEMBAYARAN_MAP[0];

                    // Get bukti pembayaran
                    const buktiPembayaranPath = getBuktiPembayaran(order);
                    const buktiUrl = buildImageUrl(buktiPembayaranPath);

                    return (
                      <tr key={order.id || `${order.id}-${i}`}>
                        {/* STICKY LEFT 1: Order ID + External Link */}
                        <td className="sticky-left-1">
                          <div className="order-id-cell">
                            <div className="order-id-content">
                              <div>
                                <span className="order-id-text" style={{ fontSize: "0.9rem" }}>
                                  {order.id || "-"}
                                </span>
                                <p className="order-date-text">
                                  {formatOrderDate(order.tanggal || order.create_at)}
                                </p>
                              </div>
                              <ExternalLink
                                size={16}
                                className="external-link-icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleView(order);
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* STICKY LEFT 2: Customer */}
                        <td className="sticky-left-2">
                          <div className="customer-cell" style={{ display: "flex", flexDirection: "column" }}>
                            <span className="customer-name" style={{ fontSize: "0.875rem" }}>{customerNama}</span>
                            <span className="customer-detail">
                              {order.customer_rel?.wa ? `+${order.customer_rel.wa}` : "-"}
                            </span>
                            <span className="customer-detail" style={{ fontSize: "0.75rem", marginTop: "2px", color: "#64748b" }}>
                              Sales: {order.customer_rel?.sales_rel?.nama || order.customer_rel?.sales_nama || "-"}
                            </span>
                          </div>
                        </td>

                        {/* Product - Widened */}
                        <td className="col-product">
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span style={{ fontSize: "0.875rem", fontWeight: "500", color: "#111827" }}>{produkNama}</span>
                            {order.bundling_rel && (
                              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                Paket: {order.bundling_rel.nama}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Order */}
                        <td>
                          <span className={`status-badge order-${statusOrderInfo?.class || 'default'}`}>
                            {statusOrderInfo?.label || order.status_order}
                          </span>
                        </td>

                        {/* Status Pembayaran */}
                        <td>
                          <span className={`status-badge ${statusPembayaranInfo?.class || 'default'}`}>
                            {statusPembayaranInfo?.label || order.status_pembayaran}
                          </span>
                        </td>

                        {/* Follow Up Text */}
                        <td>
                          <WABubbleChat
                            customerId={order.customer_rel?.id || order.customer}
                            orderId={order.id}
                            orderStatus={statusOrderValue}
                            statusPembayaran={statusPembayaranValue}
                            productId={order.produk_rel?.id || order.produk_id}
                            customerWa={order.customer_rel?.wa}
                            onOpenTimeline={() => handleOpenTimeline(order)}
                          />
                        </td>

                        {/* Bukti Pembayaran */}
                        <td style={{ textAlign: 'center' }}>
                          {buktiUrl ? (
                            <ImageIcon
                              size={20}
                              className="proof-icon"
                              style={{ cursor: "pointer", margin: "0 auto" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenImageModal(buktiUrl);
                              }}
                            />
                          ) : (
                            <span className="no-data">-</span>
                          )}
                        </td>

                        {/* Gross Revenue */}
                        <td className="revenue-text">
                          Rp {Number(order.total_harga || 0).toLocaleString("id-ID")}
                        </td>

                        {/* Sales */}
                        <td>
                          <span style={{ fontSize: "0.875rem", color: "#111827" }}>
                            {order.customer_rel?.sales_rel?.nama || order.customer_rel?.sales_nama || "-"}
                          </span>
                        </td>

                        {/* Action Column - NON STICKY */}
                        <td>
                          <button
                            className="orders-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(order);
                            }}
                            style={{
                              width: "100%",
                              padding: "0.4rem 0.75rem",
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap"
                            }}
                          >
                            Update / Konfirmasi
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="orders-empty">
                      {orders.length ? "Tidak ada hasil pencarian." : "Loading data..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination dengan Next/Previous Button */}
          <div className="orders-pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", padding: "1.5rem", flexWrap: "wrap" }}>
            {/* Previous Button */}
            <button
              className="orders-pagination__btn"
              onClick={handlePrevPage}
              disabled={page === 1 || loading}
              aria-label="Previous page"
              style={{
                padding: "0.75rem 1rem",
                minWidth: "100px",
                background: page === 1 || loading ? "#e5e7eb" : "#f1a124",
                color: page === 1 || loading ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: "0.5rem",
                cursor: page === 1 || loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                justifyContent: "center",
                transition: "all 0.2s ease"
              }}
            >
              <i className="pi pi-chevron-left" />
              Previous
            </button>

            {/* Page Info */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              color: "var(--dash-text)",
              fontWeight: 500
            }}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <i className="pi pi-spin pi-spinner" />
                  Loading...
                </span>
              ) : (
                <span>
                  Page {paginationInfo?.current_page || page} of {paginationInfo?.last_page || "?"}
                  {paginationInfo?.total && ` (${paginationInfo.total} total)`}
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
                background: !hasMore || loading ? "#e5e7eb" : "#f1a124",
                color: !hasMore || loading ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: "0.5rem",
                cursor: !hasMore || loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                justifyContent: "center",
                transition: "all 0.2s ease"
              }}
            >
              Next
              <i className="pi pi-chevron-right" />
            </button>
          </div>
        </section>

      </div>

      {/* MODALS - Render di luar main content untuk memastikan z-index bekerja */}
      {showAdd && (
        <AddOrders
          onClose={() => setShowAdd(false)}
          onAdd={async () => {
            setShowAdd(false);
            // Refresh data and show success message
            await requestRefresh("Pesanan baru berhasil ditambahkan!");
          }}
        />
      )}

      {showView && selectedOrder && (
        <ViewOrders
          order={{
            ...selectedOrder,
            customer: selectedOrder.customer_rel?.nama || "-",
          }}
          onClose={() => {
            setShowView(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {showEdit && selectedOrder && (
        <UpdateOrders
          order={{
            ...selectedOrder,
            customer: selectedOrder.customer_rel?.nama || "-",
          }}
          onClose={() => {
            setShowEdit(false);
            setSelectedOrder(null);
            requestRefresh(""); // Auto refresh setelah edit
          }}
          onSave={handleSuccessEdit}
          refreshOrders={() => requestRefresh("")}
        />
      )}

      {/* Payment Details Styles */}
      <style jsx>{`
        .payment-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        .payment-main {
          font-size: 0.875rem;
          color: #111827;
          word-wrap: break-word;
        }

        .payment-main strong {
          font-weight: 600;
          color: #1f2937;
        }

        .payment-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.25rem;
          padding: 0.5rem;
          background: #f9fafb;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
          width: 100%;
          box-sizing: border-box;
        }

        .payment-list-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.25rem 0;
          font-size: 0.75rem;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .payment-number {
          color: #6b7280;
          font-weight: 500;
          flex-shrink: 0;
        }

        .payment-amount {
          color: #059669;
          font-weight: 600;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .payment-list-placeholder {
          padding: 0.25rem 0;
          font-size: 0.75rem;
        }

        .payment-hint {
          color: #9ca3af;
          font-style: italic;
        }

        .payment-breakdown {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-top: 0.375rem;
          padding-top: 0.375rem;
          border-top: 1px solid #e5e7eb;
          width: 100%;
          box-sizing: border-box;
        }

        .payment-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .payment-label {
          color: #6b7280;
          font-weight: 500;
          flex-shrink: 0;
        }

        .payment-label.payment-clickable {
          cursor: pointer;
          transition: opacity 0.2s ease, color 0.2s ease;
        }

        .payment-label.payment-clickable:hover {
          opacity: 0.8;
          color: #c85400;
          text-decoration: underline;
        }

        .payment-value {
          font-weight: 600;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .payment-value.paid {
          color: #059669;
        }

        .payment-value.remaining {
          color: #dc2626;
        }

        .payment-clickable {
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .payment-clickable:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .payment-details {
            gap: 0.375rem;
          }

          .payment-main {
            font-size: 0.8125rem;
          }

          .payment-list,
          .payment-breakdown {
            font-size: 0.6875rem;
            padding: 0.375rem;
          }

          .payment-list-item,
          .payment-item {
            font-size: 0.6875rem;
          }
        }

        .payment-clickable {
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .payment-clickable:hover {
          opacity: 0.8;
          text-decoration: underline;
        }

        .modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
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

        .wa-bubble-container:hover {
            transform: scale(1.02);
        }
      `}</style>

      {/* Modal Payment History */}
      {/* Filter Modal */}
      {showFilterModal && typeof window !== "undefined" && createPortal(
        <div
          className="modal-overlay"
          onClick={() => setShowFilterModal(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(17, 24, 39, 0.55)",
            backdropFilter: "blur(3px)",
            margin: 0,
            padding: "1rem",
            boxSizing: "border-box",
            overflowY: "auto",
            overflowX: "hidden",
          }}
          onWheel={(e) => {
            // Prevent body scroll when scrolling modal content
            e.stopPropagation();
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "600px",
              width: "90%",
              position: "relative",
              zIndex: 10000,
              margin: "auto",
              flexShrink: 0,
            }}
          >
            <div className="modal-header" style={{
              padding: "1.5rem 1.75rem",
              borderBottom: "1px solid #e5e7eb",
              background: "#ffffff"
            }}>
              <h3 style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#111827",
                letterSpacing: "-0.01em"
              }}>
                Filter Orders
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowFilterModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#6b7280",
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.color = "#111827";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#6b7280";
                }}
              >
                <i className="pi pi-times" style={{ fontSize: "1.125rem" }} />
              </button>
            </div>
            <div className="modal-body" style={{
              maxHeight: "70vh",
              overflowY: "auto",
              padding: "1.75rem",
              background: "#ffffff"
            }}>
              {/* Produk Filter */}
              <div style={{ marginBottom: "2rem" }}>
                <label className="field-label" style={{
                  marginBottom: "0.875rem",
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                  color: "#111827",
                  letterSpacing: "-0.01em"
                }}>
                  Produk
                </label>
                <div style={{ position: "relative", marginBottom: "0.875rem" }}>
                  <input
                    type="text"
                    placeholder="Cari produk..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="field-input"
                    style={{
                      width: "100%",
                      padding: "0.875rem 2.75rem 0.875rem 1rem",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "0.625rem",
                      fontSize: "0.9375rem",
                      background: "#ffffff",
                      transition: "all 0.2s",
                      color: "#111827",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#ff6c00";
                      e.target.style.boxShadow = "0 0 0 3px rgba(255, 108, 0, 0.1)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.boxShadow = "0 1px 2px rgba(0, 0, 0, 0.05)";
                    }}
                  />
                  <span className="pi pi-search" style={{
                    position: "absolute",
                    right: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: "1rem",
                    pointerEvents: "none",
                  }} />
                </div>
                {/* Show selected products first, then search results */}
                {(selectedProductsData.length > 0 || productResults.length > 0) && (
                  <div style={{
                    marginTop: "0.75rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "0.625rem",
                    maxHeight: "280px",
                    overflowY: "auto",
                    background: "#ffffff",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                  }}>
                    {/* Selected products section */}
                    {selectedProductsData.length > 0 && (
                      <>
                        {selectedProductsData.map((prod) => {
                          const isSelected = selectedProducts.includes(prod.id);
                          return (
                            <div
                              key={`selected-${prod.id}`}
                              onClick={() => handleToggleProduct(prod)}
                              style={{
                                padding: "0.875rem 1.125rem",
                                cursor: "pointer",
                                borderBottom: "1px solid #f3f4f6",
                                background: isSelected ? "#fff5ed" : "#ffffff",
                                borderLeft: isSelected ? "4px solid #ff6c00" : "4px solid transparent",
                                transition: "all 0.15s",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = "#f9fafb";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = "#ffffff";
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => { }}
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  cursor: "pointer",
                                  accentColor: "#ff6c00",
                                }}
                              />
                              <span style={{
                                color: isSelected ? "#c85400" : "#111827",
                                fontWeight: isSelected ? "600" : "500",
                                fontSize: "0.9375rem",
                                flex: 1,
                              }}>
                                {prod.nama}
                              </span>
                              {isSelected && (
                                <span style={{
                                  fontSize: "0.75rem",
                                  color: "#c85400",
                                  fontWeight: "600",
                                  background: "#fff5ed",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "0.25rem",
                                }}>
                                  Dipilih
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {productResults.length > 0 && productResults.some(prod => !selectedProducts.includes(prod.id)) && (
                          <div style={{
                            padding: "0.5rem 1rem",
                            background: "#f9fafb",
                            borderTop: "1px solid #e5e7eb",
                            borderBottom: "1px solid #e5e7eb",
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}>
                            Hasil Pencarian
                          </div>
                        )}
                      </>
                    )}
                    {/* Search results (exclude already selected) */}
                    {productResults
                      .filter(prod => !selectedProducts.includes(prod.id))
                      .map((prod) => {
                        return (
                          <div
                            key={`result-${prod.id}`}
                            onClick={() => handleToggleProduct(prod)}
                            style={{
                              padding: "0.875rem 1.125rem",
                              cursor: "pointer",
                              borderBottom: "1px solid #f3f4f6",
                              background: "#ffffff",
                              borderLeft: "4px solid transparent",
                              transition: "all 0.15s",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#f9fafb";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "#ffffff";
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => { }}
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer",
                                accentColor: "#ff6c00",
                              }}
                            />
                            <span style={{
                              color: "#111827",
                              fontWeight: "500",
                              fontSize: "0.9375rem",
                              flex: 1,
                            }}>
                              {prod.nama}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
                {selectedProductsData.length > 0 && (
                  <div style={{ marginTop: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {selectedProductsData.map((product) => (
                      <span
                        key={product.id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          background: "#fff5ed",
                          border: "1px solid #ff6c00",
                          borderRadius: "0.375rem",
                          fontSize: "0.8125rem",
                          color: "#c85400",
                          fontWeight: "500",
                        }}
                      >
                        {product.nama}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleProduct(product);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#c85400",
                            cursor: "pointer",
                            padding: 0,
                            margin: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <i className="pi pi-times" style={{ fontSize: "0.75rem" }} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Order Filter */}
              <div style={{ marginBottom: "2rem" }}>
                <label className="field-label" style={{
                  marginBottom: "0.875rem",
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                  color: "#111827",
                  letterSpacing: "-0.01em"
                }}>
                  Status Order
                </label>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                  background: "#f9fafb",
                  padding: "0.75rem",
                  borderRadius: "0.625rem",
                  border: "1.5px solid #e5e7eb",
                }}>
                  {Object.entries(STATUS_ORDER_MAP).map(([value, { label }]) => {
                    const isChecked = selectedStatusOrder.includes(value);
                    return (
                      <label
                        key={value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          padding: "0.75rem 1rem",
                          borderRadius: "0.5rem",
                          background: isChecked ? "#fff5ed" : "transparent",
                          border: isChecked ? "1.5px solid #ff6c00" : "1.5px solid transparent",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.borderColor = "#e5e7eb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "transparent";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStatusOrder(value)}
                          style={{
                            marginRight: "0.75rem",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#ff6c00",
                          }}
                        />
                        <span style={{
                          color: isChecked ? "#c85400" : "#111827",
                          fontWeight: isChecked ? "600" : "500",
                          fontSize: "0.9375rem",
                        }}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status Pembayaran Filter */}
              <div style={{ marginBottom: "2rem" }}>
                <label className="field-label" style={{
                  marginBottom: "0.875rem",
                  display: "block",
                  fontSize: "0.9375rem",
                  fontWeight: "600",
                  color: "#111827",
                  letterSpacing: "-0.01em"
                }}>
                  Status Pembayaran
                </label>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                  background: "#f9fafb",
                  padding: "0.75rem",
                  borderRadius: "0.625rem",
                  border: "1.5px solid #e5e7eb",
                }}>
                  {Object.entries(STATUS_PEMBAYARAN_MAP).map(([value, { label }]) => {
                    const isChecked = selectedStatusPembayaran.includes(String(value));
                    return (
                      <label
                        key={value}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                          padding: "0.75rem 1rem",
                          borderRadius: "0.5rem",
                          background: isChecked ? "#fff5ed" : "transparent",
                          border: isChecked ? "1.5px solid #ff6c00" : "1.5px solid transparent",
                          transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.background = "#ffffff";
                            e.currentTarget.style.borderColor = "#e5e7eb";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isChecked) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.borderColor = "transparent";
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleStatusPembayaran(String(value))}
                          style={{
                            marginRight: "0.75rem",
                            width: "18px",
                            height: "18px",
                            cursor: "pointer",
                            accentColor: "#ff6c00",
                          }}
                        />
                        <span style={{
                          color: isChecked ? "#c85400" : "#111827",
                          fontWeight: isChecked ? "600" : "500",
                          fontSize: "0.9375rem",
                        }}>{label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              padding: "1.5rem 1.75rem",
              borderTop: "1px solid #e5e7eb",
              background: "#f9fafb",
            }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#ffffff",
                  border: "1.5px solid #e5e7eb",
                  borderRadius: "0.625rem",
                  color: "#374151",
                  fontWeight: "600",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#d1d5db";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ffffff";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <i className="pi pi-times" style={{ fontSize: "0.875rem" }} />
                Reset
              </button>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#ff6c00",
                  border: "none",
                  borderRadius: "0.625rem",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "0.9375rem",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  boxShadow: "0 2px 4px rgba(255, 108, 0, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e55a00";
                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(255, 108, 0, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#ff6c00";
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(255, 108, 0, 0.2)";
                }}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Image Modal Overlay */}
      {showImageModal && selectedImageUrl && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            cursor: "pointer",
          }}
          onClick={handleCloseImageModal}
        >
          <button
            onClick={handleCloseImageModal}
            style={{
              position: "absolute",
              top: "1rem",
              right: "1rem",
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "1.5rem",
              transition: "background 0.2s ease",
              zIndex: 10001,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
            }}
            aria-label="Tutup"
          >
            <i className="pi pi-times" />
          </button>
          <div
            style={{
              position: "relative",
              maxWidth: "90%",
              maxHeight: "90%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImageUrl}
              alt="Bukti Pembayaran - Full Size"
              style={{
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "8px",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                cursor: "zoom-in",
              }}
              onClick={(e) => {
                // Zoom in/out on click
                if (e.target.style.transform === "scale(2)") {
                  e.target.style.transform = "scale(1)";
                  e.target.style.cursor = "zoom-in";
                } else {
                  e.target.style.transform = "scale(2)";
                  e.target.style.cursor = "zoom-out";
                }
              }}
              onError={(e) => {
                console.error("Gagal memuat gambar:", selectedImageUrl);
                e.target.style.display = "none";
              }}
            />
          </div>
        </div>,
        document.body
      )}

      <PaymentHistoryModal
        orderId={selectedOrderIdForHistory}
        isOpen={showPaymentHistory}
        onClose={() => {
          setShowPaymentHistory(false);
          setSelectedOrderIdForHistory(null);
        }}
      />

      {/* Toast Notification */}
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

      {/* Timeline Modal */}
      {isTimelineModalOpen && selectedTimelineLog && (
        <>
          <div className="modal-overlay" onClick={closeTimelineModal}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h3 className="modal-title">Timeline Customer</h3>
                  <p className="modal-subtitle">
                    {selectedTimelineLog.customerName} • {selectedTimelineLog.customerPhone}
                  </p>
                </div>
                <button onClick={closeTimelineModal} className="close-btn"><X size={20} /></button>
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
                    {!selectedTimelineLog.orderId && <p style={{ fontSize: '0.8rem', color: '#ef4444' }}>Warning: Log ini tidak memiliki Order ID.</p>}
                  </div>
                ) : (
                  <div className="timeline-wrapper">
                    {timelineLogs.map((item, idx) => {
                      const isLatest = idx === timelineLogs.length - 1;

                      // Keterangan Cleanup
                      let noteContent = item.keterangan || "Tidak ada keterangan";
                      try {
                        const messageMatch = noteContent.match(/Pesan:\s*(.*?)\s*(?:Response:|(?={"code":))/s);
                        if (messageMatch && messageMatch[1]) {
                          noteContent = `Pesan: ${messageMatch[1].trim()}`;
                        }
                      } catch (e) {
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
        </>
      )}

    </Layout>
  );
}
