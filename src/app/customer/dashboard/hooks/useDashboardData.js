"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCustomerSession } from "@/lib/customerAuth";
import { fetchCustomerDashboard } from "@/lib/customerDashboard";

export function useDashboardData() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState({
    stats: [
      { id: "total", label: "Total Order", value: 0 },
      { id: "active", label: "Order Aktif", value: 0 },
    ],
    activeOrders: [],
    articles: [],
    customerInfo: null,
    unpaidCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatCurrency = (value) => {
    if (!value) return "Rp 0";
    const numberValue = Number(String(value).replace(/\D/g, ""));
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numberValue || 0);
  };

  const parseDateFromString = (value) => {
    if (!value) return null;
    const direct = Date.parse(value);
    if (!Number.isNaN(direct)) return new Date(direct);

    const match = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/.exec(value.trim());
    if (match) {
      const [, dd, mm, yyyy, hh = "00", min = "00"] = match;
      const iso = `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
      const parsed = Date.parse(iso);
      if (!Number.isNaN(parsed)) return new Date(parsed);
    }
    return null;
  };

  const getOrderStartDate = (order) => {
    return (
      parseDateFromString(order.webinar?.start_time) ||
      parseDateFromString(order.webinar?.start_time_formatted) ||
      parseDateFromString(order.tanggal_event) ||
      parseDateFromString(order.tanggal_order_raw) ||
      null
    );
  };

  const adaptOrders = (orders = []) =>
    orders.map((order) => {
      const kategoriNama = order.kategori_nama || "Produk";
      const formatKategori = (nama) => {
        if (!nama) return "Produk";
        return nama.charAt(0).toUpperCase() + nama.slice(1);
      };

      const typeLabel = formatKategori(kategoriNama);
      const schedule =
        order.webinar?.start_time_formatted ||
        order.webinar?.start_time ||
        order.tanggal_order ||
        "-";

      const getActionLabel = (kategoriNama) => {
        const kategoriLower = kategoriNama?.toLowerCase() || "";
        if (kategoriLower === "seminar") return "Join Seminar";
        if (kategoriLower === "e-book" || kategoriLower === "ebook") return "Buka Ebook";
        if (kategoriLower === "webinar") return "Join Webinar";
        if (kategoriLower === "workshop") return "Join Workshop";
        return "Lihat Detail";
      };

      const actionLabel = getActionLabel(kategoriNama);
      const startDate = getOrderStartDate(order);
      const statusPembayaran = order.status_pembayaran || order.status_pembayaran_id;

      // Order dianggap terbayar jika status_pembayaran === 2 (Paid/Sukses)
      const isPaid = statusPembayaran === 2 || statusPembayaran === "2";

      return {
        id: order.id,
        type: typeLabel,
        title: order.produk_nama || "Produk Tanpa Nama",
        slug: order.ebook_url || order.produk_kode || order.kategori_nama || "-",
        total: order.total_harga_formatted || formatCurrency(order.total_harga),
        total_harga: order.total_harga, // Simpan raw number untuk perhitungan
        kategoriNama: kategoriNama,
        orderDate: order.tanggal_order || "-",
        schedule,
        actionLabel,
        startDate,
        isPaid,
        statusPembayaran,
        paymentMethod: order.metode_bayar || "manual",
      };
    });

  const loadDashboardData = useCallback(async () => {
    const session = getCustomerSession();

    if (!session.token) {
      setError("Token tidak ditemukan. Silakan login kembali.");
      setLoading(false);
      router.replace("/customer");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Fetch Dashboard Data (Stats & Orders)
      const data = await fetchCustomerDashboard(session.token);

      // 2. Fetch Fresh Customer Detail (GET)
      // Ini penting untuk memastikan data 'alamat' dll terbaru, karena dashboard stats mungkin cache
      let freshProfile = null;
      try {
        const detailRes = await fetch("/api/customer/customer/detail", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.token}`,
            "Accept": "application/json",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache"
          },
          cache: "no-store" // Disable Next.js caching
        });
        const detailJson = await detailRes.json();
        if (detailJson.success && detailJson.data) {
          freshProfile = detailJson.data;
        }
      } catch (err) {
        console.warn("[DASHBOARD] Failed to fetch fresh detail:", err);
      }

      // Merge: Dashboard Data < Fresh Profile
      // Profile detail menang karena dia source of truth untuk field form
      const customerData = {
        ...(data.customer || {}),
        ...(freshProfile || {})
      };

      // Sync customer data to localStorage
      if (Object.keys(customerData).length > 0) {
        const existingUser = session.user || {};
        const updatedUser = {
          ...existingUser,
          ...customerData,
          // Explicitly preserve verifikasi if present in new data, else keep existing
          verifikasi: customerData.verifikasi !== undefined
            ? customerData.verifikasi
            : existingUser.verifikasi,
        };
        localStorage.setItem("customer_user", JSON.stringify(updatedUser));
        setDashboardData(prev => ({ ...prev, customerInfo: updatedUser }));
      }

      // Update stats
      const newStats = [
        { id: "total", label: "Total Order", value: data?.statistik?.total_order ?? 0 },
        { id: "active", label: "Order Aktif", value: data?.statistik?.order_aktif ?? 0 },
      ];

      // Kumpulkan semua order dari berbagai sumber
      const allOrders = [
        ...(data?.orders_aktif || []),
        ...(data?.orders_pending || []),
        ...(data?.order_proses || []),
        ...(data?.orders_proses || []),
      ];

      // Order Aktif: semua order (tidak peduli status pembayaran)
      // Filter untuk menghindari duplikat berdasarkan ID
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex((o) => o.id === order.id)
      );
      const activeOrders = uniqueOrders;

      // Get unpaid orders for count (status_pembayaran belum 2)
      const unpaidOrders = uniqueOrders.filter((order) => {
        const statusPembayaran = order.status_pembayaran || order.status_pembayaran_id;
        return statusPembayaran !== 2 && statusPembayaran !== "2";
      });

      const unpaidCount = unpaidOrders.length;

      // Process bonus articles from active orders
      const bonusArticles = [];
      uniqueOrders.forEach(order => {
        if (order.post_rel && Array.isArray(order.post_rel) && order.post_rel.length > 0) {
          bonusArticles.push({
            productName: order.produk_nama || "Produk",
            posts: order.post_rel
          });
        }
      });

      setDashboardData({
        stats: newStats,
        activeOrders: adaptOrders(activeOrders),
        articles: bonusArticles,
        customerInfo: customerData || session.user,
        unpaidCount,
      });
    } catch (error) {
      console.error("[DASHBOARD] Failed to load data:", error);
      setError(error.message || "Gagal memuat data dashboard.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    ...dashboardData,
    loading,
    error,
    refetch: loadDashboardData,
  };
}


