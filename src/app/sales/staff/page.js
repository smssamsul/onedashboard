"use client";

import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/orders-page.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import { useState, useEffect, useCallback } from "react";
import SummaryStats from "@/components/salesStaff/SummaryStats";
import ProductPerformance from "@/components/salesStaff/ProductPerformance";
import RecentOrders from "@/components/salesStaff/RecentOrders";
import FollowUpActivity from "@/components/salesStaff/FollowUpActivity";
import { getOrderStatisticPerSales } from "@/lib/sales/orders";
import axios from "axios";

const BASE_URL = "/api";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    prosesCount: 0,
    successCount: 0,
    upsellingCount: 0,
    batalCount: 0,
  });

  const [recentOrders, setRecentOrders] = useState([]);
  const [followUpHistory, setFollowUpHistory] = useState([]);
  const [mePerformance, setMePerformance] = useState(null);
  const [productStats, setProductStats] = useState([]);
  const [productSummary, setProductSummary] = useState(null);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      // Get current user ID from localStorage
      const userDataStr = localStorage.getItem("user");
      let currentUserId = null;
      if (userDataStr) {
        try {
          const user = JSON.parse(userDataStr);
          currentUserId = user.id;
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }

      const statsPromise = getOrderStatisticPerSales();
      const dashPromise = axios.get(`${BASE_URL}/sales/dashboard`, {
        params: { sales_id: currentUserId },
        headers: { Authorization: `Bearer ${token}` }
      });
      const prodStatsPromise = axios.get(`${BASE_URL}/sales/dashboard/produk-statistics`, {
        params: { sales_id: currentUserId },
        headers: { Authorization: `Bearer ${token}` }
      });
      const salesOrdersPromise = axios.get(`${BASE_URL}/sales/order/sales`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const [statsData, dashRes, prodRes, salesOrdersRes] = await Promise.all([
        statsPromise.catch(() => []),
        dashPromise.catch(() => ({ data: { success: false } })),
        prodStatsPromise.catch(() => ({ data: { success: false } })),
        salesOrdersPromise.catch(() => ({ data: { success: false } }))
      ]);

      // Order Statistics
      if (statsData && Array.isArray(statsData) && statsData.length > 0) {
        const myStats = statsData.find(s => Number(s.sales_id) === Number(currentUserId)) || statsData[0];
        if (myStats) {
          setOrderStats({
            totalOrders: Number(myStats.total_order) || 0,
            unpaidCount: Number(myStats.total_order_unpaid) || 0,
            prosesCount: Number(myStats.total_order_menunggu) || 0,
            paidCount: Number(myStats.total_order_sudah_diapprove) || 0,
            totalRevenue: Number(myStats.revenue) || 0,
            totalRevenueFormatted: formatCurrency(myStats.revenue),
            conversionRateFormatted: myStats.total_order > 0
              ? `${((myStats.total_order_sudah_diapprove / myStats.total_order) * 100).toFixed(2)}%`
              : "0.00%",
          });
          setMePerformance({
            ...myStats,
            conversion_rate_formatted: myStats.total_order > 0
              ? `${((myStats.total_order_sudah_diapprove / myStats.total_order) * 100).toFixed(2)}%`
              : "0.00%"
          });
        }
      }

      // Activity Feed (Dashboard Data)
      if (dashRes.data.success) {
        setFollowUpHistory(dashRes.data.data.riwayat_follow_up || []);
      }

      // Product Statistics
      if (prodRes.data.success && prodRes.data.data) {
        setProductStats(prodRes.data.data.produk_statistics || []);
        setProductSummary(prodRes.data.data.summary || null);
      }

      // Recent Sales Orders
      if (salesOrdersRes.data.success) {
        const orders = salesOrdersRes.data.data?.data || salesOrdersRes.data.data || [];
        setRecentOrders(orders.slice(0, 10));
      }

    } catch (err) {
      console.error("Critical error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Format date and time
  const formatDate = (date) => {
    const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    const months = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Layout title="Dashboard" aboveContent={<GreetingBanner />}>
      <div className="dashboard-shell">

        {/* 1. Summary Cards (Total Revenue, Orders, etc) */}
        <SummaryStats
          orderStats={orderStats}
          mePerformance={mePerformance}
        />

        {/* 2. Product Performance Wide Table */}
        <ProductPerformance
          productStats={productStats}
          productSummary={productSummary}
          loading={loading}
        />

        {/* 3. Grid for Recent Orders and Activity Feed */}
        <div className="dashboard-grid-two-columns">
          <RecentOrders
            recentOrders={recentOrders}
            formatCurrency={formatCurrency}
          />

          <FollowUpActivity
            followUpHistory={followUpHistory}
          />
        </div>

      </div>

      <style jsx>{`
        .dashboard-grid-two-columns {
          display: grid;
          grid-template-columns: 1.5fr 1fr;
          gap: 2rem;
          margin-top: 1rem;
        }
        
        @media (max-width: 1280px) {
          .dashboard-grid-two-columns { grid-template-columns: 1fr; }
        }
      `}</style>
    </Layout>
  );
}
