"use client";

import "@/styles/sales/dashboard-premium.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Percent,
  Package,
  DollarSign,
  Truck,
  Wallet,
  PiggyBank,
  User,
} from "lucide-react";
import { getOrders } from "@/lib/sales/orders";
import dynamic from "next/dynamic";
import ProductPerformanceAll from "@/components/sales/ProductPerformanceAll";
import axios from "axios";

// Lazy load heavy components
const LazyChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false }
);
const LazyLine = dynamic(
  () => import("recharts").then((mod) => mod.Line),
  { ssr: false }
);
const LazyResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const LazyXAxis = dynamic(
  () => import("recharts").then((mod) => mod.XAxis),
  { ssr: false }
);
const LazyTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const LazyCartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityRangeDays, setActivityRangeDays] = useState(30);
  const [financeRangeDays, setFinanceRangeDays] = useState(30);

  const requestDays = useMemo(() => Math.max(activityRangeDays, financeRangeDays), [activityRangeDays, financeRangeDays]);

  const makeRangeLabel = (days) => `Last ${days} days`;

  const formatShortDay = (date) => {
    try {
      return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(date);
    } catch {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
  };

  const buildSeriesForLastNDays = useCallback(
    (points, days) => {
      const list = Array.isArray(points) ? points : [];
      const byKey = new Map();
      for (const p of list) {
        if (!p) continue;
        const key = p.date || p.tanggal || p.label;
        if (key != null) byKey.set(String(key), p);
      }

      const out = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const label = formatShortDay(d);

        const hit = byKey.get(iso) || byKey.get(label);
        out.push({
          label,
          orders: hit?.order ?? hit?.orders ?? 0,
          transactions: hit?.transaksi ?? hit?.transactions ?? 0,
        });
      }
      return out;
    },
    [formatShortDay]
  );

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/sales/dashboard?days=${encodeURIComponent(requestDays)}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Gagal memuat data dashboard");
      }

      const json = await response.json();
      setData(json.data);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, [requestDays]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const overview = data?.overview;
  const financial = data?.financial;
  const statistik = data?.statistik;

  const summaryCards = useMemo(() => {
    return [
      {
        title: "Total Orders",
        value: overview?.orders_total?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <ShoppingCart size={24} />,
        color: "accent-orange",
      },
      {
        title: "Total Paid",
        value: overview?.orders_paid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <CreditCard size={24} />,
        color: "accent-orange",
      },
      {
        title: "Paid Ratio",
        value: overview?.paid_ratio_formatted ?? (loading ? "…" : "0%"),
        icon: <Percent size={24} />,
        color: "accent-orange",
      },
      {
        title: "Unpaid Orders",
        value: overview?.orders_unpaid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <Package size={24} />,
        color: "accent-orange",
      },
    ];
  }, [overview, loading]);

  const revenueCards = useMemo(() => {
    return [
      {
        title: "Gross Revenue",
        value: financial?.gross_revenue_formatted ?? (loading ? "…" : "Rp0"),
        icon: <DollarSign size={24} />,
        color: "accent-orange",
      },
      {
        title: "Shipping Cost",
        value: financial?.shipping_cost_formatted ?? (loading ? "…" : "Rp0"),
        icon: <Truck size={24} />,
        color: "accent-orange",
      },
      {
        title: "Net Revenue",
        value: financial?.net_revenue_formatted ?? (loading ? "…" : "Rp0"),
        icon: <Wallet size={24} />,
        color: "accent-orange",
      },
      {
        title: "Gross Profit",
        value: financial?.gross_profit_formatted ?? (loading ? "…" : "Rp0"),
        icon: <PiggyBank size={24} />,
        color: "accent-orange",
      },
      {
        title: "Net Profit",
        value: financial?.net_profit_formatted ?? (loading ? "…" : "Rp0"),
        icon: <TrendingUp size={24} />,
        color: "accent-orange",
      },
    ];
  }, [financial, loading]);

  const activityTrend = useMemo(() => {
    const raw =
      data?.chart_transaksi_order?.map((point) => ({
        label: point.label,
        order: point.order,
        transaksi: point.transaksi,
        date: point.date,
        tanggal: point.tanggal,
      })) ?? [];

    // If API provides dated points (ideal), build a full N-day series.
    // If API only provides limited points (e.g., weekday buckets), we still show them as-is.
    const hasDateKey = raw.some((p) => p?.date || p?.tanggal);
    if (hasDateKey) return buildSeriesForLastNDays(raw, activityRangeDays);

    return raw.map((p) => ({
      label: p.label,
      orders: p.order ?? 0,
      transactions: p.transaksi ?? 0,
    }));
  }, [data, activityRangeDays, buildSeriesForLastNDays]);

  const chartHasData = activityTrend.length > 0;
  const staffCardsRef = useRef([]);

  // State for Sales Statistics
  const [salesStatistics, setSalesStatistics] = useState([]);
  const [loadingStatistics, setLoadingStatistics] = useState(true);
  const [activeStaffId, setActiveStaffId] = useState(null);
  const [periodInfo, setPeriodInfo] = useState(null);

  // State for Global Product Statistics (Statistics-All)
  const [productStatsAll, setProductStatsAll] = useState([]);
  const [productSummaryAll, setProductSummaryAll] = useState(null);
  const [loadingProdAll, setLoadingProdAll] = useState(true);

  // State for Recent Activity Lists
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentFollowups, setRecentFollowups] = useState([]);

  // Helper formatter
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
    });
  };

  // Load Recent Activity (Orders & Followups)
  const loadRecentActivity = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");

      // 1. Fetch Recent Orders
      const ordersRes = await getOrders(1, 10);
      if (ordersRes && Array.isArray(ordersRes.data)) {
        setRecentOrders(ordersRes.data.slice(0, 10));
      }

      // 2. Fetch Recent Followups (Last 30 days to ensure data visibility)
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const dateFrom = d.toISOString().split("T")[0];
      const dateTo = new Date().toISOString().split("T")[0];

      const fpRes = await fetch(`/api/sales/logs-follup?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (fpRes.ok) {
        const json = await fpRes.json();
        if (json.success && Array.isArray(json.data)) {
          // Sort by created_at desc
          const sorted = json.data.sort((a, b) => new Date(b.created_at || b.create_at) - new Date(a.created_at || a.create_at));
          setRecentFollowups(sorted.slice(0, 10));
        }
      }
    } catch (e) {
      console.error("Ordered/Followup fetch error:", e);
    }
  }, []);

  useEffect(() => {
    loadRecentActivity();
  }, [loadRecentActivity]);

  // Load Sales Statistics
  const loadSalesStatistics = useCallback(async () => {
    setLoadingStatistics(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/sales/statistics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        console.error("Gagal memuat statistik sales");
        return;
      }

      const json = await response.json();
      if (json.success && json.data?.statistics) {
        setSalesStatistics(json.data.statistics);
        if (json.data.statistics.length > 0) {
          setActiveStaffId(json.data.statistics[0].sales_id);
        }
        if (json.data.period) setPeriodInfo(json.data.period);
      }
    } catch (err) {
      console.error("Error loading sales statistics:", err);
    } finally {
      setLoadingStatistics(false);
    }
  }, []);

  useEffect(() => {
    loadSalesStatistics();
  }, [loadSalesStatistics]);

  // Load Global Product Statistics (All Staff)
  const loadGlobalProductStats = useCallback(async () => {
    setLoadingProdAll(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/sales/dashboard/produk-statistics-all", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setProductStatsAll(response.data.data.produk_statistics || []);
        setProductSummaryAll(response.data.data.summary || null);
      }
    } catch (err) {
      console.error("Error loading global product stats:", err);
    } finally {
      setLoadingProdAll(false);
    }
  }, []);

  useEffect(() => {
    loadGlobalProductStats();
  }, [loadGlobalProductStats]);

  // Scroll effect untuk staff cards
  useEffect(() => {
    if (loadingStatistics || salesStatistics.length === 0) return;

    // Reset visibility just in case
    staffCardsRef.current.forEach((card) => {
      if (card) card.classList.remove("visible");
    });

    const observerOptions = {
      root: null,
      rootMargin: "50px",
      threshold: 0.1,
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe cards untuk animasi saat scroll
    setTimeout(() => {
      staffCardsRef.current.forEach((card) => {
        if (card) {
          // Check initial visibility
          const rect = card.getBoundingClientRect();
          if (rect.top < window.innerHeight && rect.bottom > 0) {
            card.classList.add("visible");
          }
          observer.observe(card);
        }
      });
    }, 100);

    return () => {
      staffCardsRef.current.forEach((card) => {
        if (card) observer.unobserve(card);
      });
    };
  }, [salesStatistics, loadingStatistics]);

  return (
    <Layout title="Dashboard" aboveContent={<GreetingBanner />}>
      <div className="dashboard-shell">
        {error && <div className="dashboard-alert">{error}</div>}
        <section className="dashboard-hero">
          <div className="dashboard-summary-horizontal">
            {summaryCards.map((card, index) => (
              <article className="summary-card" key={card.title}>
                <div className={`summary-card__icon ${card.color}`}>{card.icon}</div>
                <div>
                  <p className="summary-card__label">{card.title}</p>
                  <p className="summary-card__value">{card.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <ProductPerformanceAll
          productStats={productStatsAll}
          productSummary={productSummaryAll}
          loading={loadingProdAll}
        />

        <section className="dashboard-staff-section">
          <div className="dashboard-staff-layout">
            <article className="panel panel--staff">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">
                    Data per staff sales
                    {periodInfo && (
                      <span style={{ fontWeight: 'normal', opacity: 0.8, marginLeft: '4px' }}>
                        ({new Date(periodInfo.start_date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(periodInfo.end_date).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })})
                      </span>
                    )}
                  </p>
                  <h3 className="panel__title">Sales Performance</h3>
                </div>
              </div>

              <div className="staff-performance-tabs">
                {/* Tab Navigation */}
                <div className="staff-tabs-nav">
                  {loadingStatistics ? (
                    <div style={{ padding: '0.5rem', color: '#64748b' }}>Loading tabs...</div>
                  ) : (
                    salesStatistics.map((staff) => (
                      <button
                        key={staff.sales_id}
                        className={`staff-tab-btn ${activeStaffId === staff.sales_id ? 'active' : ''}`}
                        onClick={() => setActiveStaffId(staff.sales_id)}
                      >
                        <User size={14} />
                        <span>{staff.sales_nama}</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Tab Content (The Card) */}
                <div className="staff-tabs-content">
                  {loadingStatistics ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading performa sales...</div>
                  ) : salesStatistics.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Belum ada data sales.</div>
                  ) : (
                    salesStatistics
                      .filter(s => s.sales_id === activeStaffId)
                      .map((staff, index) => (
                        <article
                          className="staff-card visible"
                          key={staff.sales_id || index}
                        >
                          <div className="staff-card__header">
                            <div className="staff-card__avatar">
                              <User size={24} />
                            </div>
                            <div className="staff-card__header-info">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <h4 className="staff-card__name">{staff.sales_nama}</h4>
                                  <p className="staff-card__role">
                                    {staff.sales_level === "2" ? "Sales Representative" : "Sales Staff"}
                                  </p>
                                </div>
                                <div className="conversion-badge">
                                  <Percent size={12} />
                                  <span>{staff.conversion_rates?.customer_to_order_formatted ?? "0%"} Rate</span>
                                </div>
                              </div>
                              {staff.sales_email && (
                                <p className="staff-card__email" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                                  {staff.sales_email}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="staff-card__stats">
                            {/* row 1 */}
                            <div className="staff-card__stat-row">
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Total Customers</p>
                                <p className="staff-card__stat-value">{staff.customers?.total ?? 0}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Overall</p>
                              </div>
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">New leads</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <p className="staff-card__stat-value">{staff.customers?.new_this_period ?? 0}</p>
                                  {staff.customers?.growth !== 0 && (
                                    <span className={`growth-indicator ${staff.customers?.growth > 0 ? 'up' : 'down'}`}>
                                      {staff.customers?.growth_formatted}
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>This Period</p>
                              </div>
                            </div>

                            {/* row 2 */}
                            <div className="staff-card__stat-row">
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Total Orders</p>
                                <p className="staff-card__stat-value">{staff.orders?.total ?? 0}</p>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Overall</p>
                              </div>
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Orders</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <p className="staff-card__stat-value">{staff.orders?.this_period ?? 0}</p>
                                  {staff.orders?.growth !== 0 && (
                                    <span className={`growth-indicator ${staff.orders?.growth > 0 ? 'up' : 'down'}`}>
                                      {staff.orders?.growth_formatted}
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: '0.65rem', color: '#94a3b8' }}>This Period</p>
                              </div>
                            </div>

                            {/* row 3 */}
                            <div className="staff-card__stat-row">
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Total Revenue</p>
                                <p className="staff-card__stat-value highlight">
                                  {staff.revenue?.total_formatted ?? "Rp 0"}
                                </p>
                              </div>
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Revenue</p>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <p className="staff-card__stat-value" style={{ color: '#059669' }}>
                                    {staff.revenue?.this_period_formatted ?? "Rp 0"}
                                  </p>
                                  {staff.revenue?.growth !== 0 && (
                                    <span className={`growth-indicator small ${staff.revenue?.growth > 0 ? 'up' : 'down'}`}>
                                      {staff.revenue?.growth_formatted} vs prev
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* row 4 */}
                            <div className="staff-card__stat-row">
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">AVG ORDER VALUE</p>
                                <p className="staff-card__stat-value">
                                  {staff.average_order_value?.this_period_formatted ?? "Rp 0"}
                                </p>
                              </div>
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Last Activity</p>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                  Active {periodInfo ? 'this month' : 'now'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </article>
                      ))
                  )}
                </div>
              </div>

              <style jsx>{`
                .staff-performance-tabs {
                  display: flex;
                  flex-direction: column;
                  gap: 1.5rem;
                  margin-top: 1rem;
                }
                .staff-tabs-nav {
                  display: flex;
                  gap: 0.5rem;
                  overflow-x: auto;
                  padding-bottom: 0.5rem;
                  border-bottom: 1px solid #f1f5f9;
                }
                .staff-tabs-nav::-webkit-scrollbar {
                  height: 4px;
                }
                .staff-tabs-nav::-webkit-scrollbar-thumb {
                  background: #e2e8f0;
                  border-radius: 10px;
                }
                .staff-tab-btn {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 8px 16px;
                  background: #f8fafc;
                  border: 1px solid #e2e8f0;
                  border-radius: 10px;
                  color: #64748b;
                  font-size: 0.85rem;
                  font-weight: 600;
                  cursor: pointer;
                  white-space: nowrap;
                  transition: all 0.2s;
                }
                .staff-tab-btn:hover {
                  background: #f1f5f9;
                  border-color: #cbd5e1;
                }
                .staff-tab-btn.active {
                  background: #f97316;
                  border-color: #f97316;
                  color: #fff;
                  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25);
                }
                .staff-tabs-content {
                  animation: fadeIn 0.3s ease;
                }
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
                .staff-card {
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  background: transparent !important;
                }
                .growth-indicator {
                  font-size: 0.75rem;
                  font-weight: 700;
                  padding: 2px 6px;
                  border-radius: 4px;
                }
                .growth-indicator.up { background: #dcfce7; color: #15803d; }
                .growth-indicator.down { background: #fef2f2; color: #b91c1c; }
                .growth-indicator.small { font-size: 0.65rem; }
                .conversion-badge {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: #eff6ff;
                  color: #3b82f6;
                  padding: 4px 8px;
                  border-radius: 6px;
                  font-size: 0.7rem;
                  font-weight: 700;
                }
                .staff-card__stat-value.highlight {
                  color: #1e293b;
                  font-size: 1.1rem;
                  font-weight: 800;
                }
              `}</style>
            </article>

            <article className="panel panel--revenue">
              <div className="panel__header">
                <div>
                  <p className="panel__eyebrow">Revenue breakdown</p>
                  <h3 className="panel__title">Financial Snapshot</h3>
                </div>
                <label className="panel__filter" aria-label="Filter range for Financial Snapshot">
                  <select
                    className="panel__select"
                    value={financeRangeDays}
                    onChange={(e) => setFinanceRangeDays(Number(e.target.value))}
                  >
                    <option value={7}>{makeRangeLabel(7)}</option>
                    <option value={14}>{makeRangeLabel(14)}</option>
                    <option value={30}>{makeRangeLabel(30)}</option>
                  </select>
                </label>
              </div>

              <div className="revenue-grid">
                {revenueCards.map((card) => (
                  <article className="revenue-card" key={card.title}>
                    <div className={`revenue-card__icon ${card.color}`}>{card.icon}</div>
                    <div>
                      <p className="revenue-card__label">{card.title}</p>
                      <p className="revenue-card__value">{card.value}</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </div>
        </section>

        <section className="dashboard-panels">
          <article className="panel panel--chart">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Orders vs Transactions</p>
                <h3 className="panel__title">Sales Activity</h3>
              </div>
              <label className="panel__filter" aria-label="Filter range for Sales Activity">
                <select
                  className="panel__select"
                  value={activityRangeDays}
                  onChange={(e) => setActivityRangeDays(Number(e.target.value))}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </label>
            </div>

            {LazyResponsiveContainer && LazyChart && LazyLine && LazyXAxis && LazyTooltip && LazyCartesianGrid ? (
              <LazyResponsiveContainer width="100%" height={280}>
                <LazyChart data={chartHasData ? activityTrend : [{ label: "-", orders: 0, transactions: 0 }]}>
                  <LazyCartesianGrid stroke="#F1F5F9" vertical={false} />
                  <LazyXAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickMargin={12} />
                  <LazyTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }}
                    formatter={(value, name) => [value, name === "orders" ? "Order" : "Transaksi"]}
                  />
                  <LazyLine type="monotone" dataKey="orders" stroke="#ff6c00" strokeWidth={3} dot={false} name="orders" />
                  <LazyLine
                    type="monotone"
                    dataKey="transactions"
                    stroke="#c85400"
                    strokeWidth={3}
                    dot={false}
                    name="transactions"
                  />
                </LazyChart>
              </LazyResponsiveContainer>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                Loading chart...
              </div>
            )}
            {!chartHasData && <p className="panel__empty">Belum ada data transaksi untuk periode ini.</p>}
            {!chartHasData && <p className="panel__empty">Belum ada data transaksi untuk periode ini.</p>}
          </article>
        </section>

        {/* TWO TABLES: FOLLOW UP HISTORY & RECENT ORDERS */}
        <section className="dashboard-panels">
          <div style={{ display: 'grid', gridTemplateColumns: '475px 1fr', gap: '1.5rem', width: '100%' }} className="recent-activity-grid">

            <style jsx>{`
                @media (max-width: 1024px) {
                  .recent-activity-grid {
                    grid-template-columns: 1fr !important;
                  }
                }
              `}</style>

            {/* TABLE 1: RECENT FOLLOW UP */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, padding: '1.5rem 1.5rem 1rem 1.5rem', color: '#1e293b' }}>
                Riwayat Terakhir Follow Up
              </h3>
              <div className="table-wrapper" style={{ margin: 0 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>CUSTOMER</th>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>FOLLOW UP</th>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>TANGGAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFollowups.length > 0 ? (
                      recentFollowups.map((log, idx) => {
                        const typeId = log.follup || log.type;
                        const typeMap = {
                          1: "Follow Up 1",
                          2: "Follow Up 2",
                          3: "Follow Up 3",
                          4: "Follow Up 4",
                          5: "Register",
                          6: "Proses",
                          7: "Selesai",
                          8: "Upselling",
                          11: "Reminder Trainer",
                        };

                        let label = log.follup_rel?.nama || log.nama || typeMap[typeId] || log.type_label;

                        // Fallback handling
                        if (!label || label === "-") {
                          label = typeId ? `Type ${typeId}` : "Unknown";
                        }

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: '0.8rem', color: '#334155' }}>
                              {log.customer_rel?.nama || log.customer_nama || log.customer?.nama || "-"}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#334155' }}>
                              {label}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>
                              {formatDateTime(log.create_at || log.created_at)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="3" className="table-empty" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada follow up terbaru.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABLE 2: RECENT ORDERS */}
            <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, padding: '1.5rem 1.5rem 1rem 1.5rem', color: '#1e293b' }}>
                Pembelian Terakhir
              </h3>
              <div className="table-wrapper" style={{ margin: 0 }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>CUSTOMER</th>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>PRODUK</th>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>TOTAL</th>
                      <th style={{ background: '#f97316', padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#ffffff', textTransform: 'uppercase' }}>TANGGAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order, idx) => {
                        // Priority: produk_rel.nama -> existing logic
                        const productName = order.produk_rel?.nama ||
                          (Array.isArray(order.items) && order.items[0]
                            ? order.items[0].nama_produk || order.items[0].nama
                            : (order.produk_nama || "-"));

                        // Priority: customer_rel.nama -> existing logic
                        const customerName = order.customer_rel?.nama ||
                          order.nama_customer ||
                          order.customer?.nama ||
                          order.nama ||
                          "-";

                        return (
                          <tr key={idx}>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 500, fontSize: '0.8rem', color: '#334155' }}>
                              {customerName}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }} title={productName}>
                              {productName.length > 13 ? productName.substring(0, 13) + "..." : productName}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: '0.8rem', color: '#0f172a' }}>
                              {formatCurrency(order.total_harga)}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #f1f5f9', fontSize: '0.8rem', color: '#64748b' }}>
                              {formatDateTime(order.created_at || order.create_at || order.tanggal_dibuat)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="4" className="table-empty" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Belum ada order terbaru.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </section>
      </div>
    </Layout>
  );
}
