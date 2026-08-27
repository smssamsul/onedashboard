"use client";

import "@/styles/sales/dashboard-premium.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  ShoppingCart,
  CreditCard,
  Percent,
  Package,
  User,
} from "lucide-react";
import dynamic from "next/dynamic";

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
const LazyYAxis = dynamic(
  () => import("recharts").then((mod) => mod.YAxis),
  { ssr: false }
);
const LazyTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const LazyLegend = dynamic(
  () => import("recharts").then((mod) => mod.Legend),
  { ssr: false }
);
const LazyCartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const LazyComposedChart = dynamic(
  () => import("recharts").then((mod) => mod.ComposedChart),
  { ssr: false }
);
const LazyBar = dynamic(
  () => import("recharts").then((mod) => mod.Bar),
  { ssr: false }
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activityRangeDays, setActivityRangeDays] = useState(30);

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
      const response = await fetch(`/api/sales/dashboard?days=${encodeURIComponent(activityRangeDays)}`, {
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
  }, [activityRangeDays]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const overview = data?.overview;
  const statistik = data?.statistik;

  const summaryCards = useMemo(() => {
    return [
      {
        title: "Total Orders",
        value: overview?.orders_total?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <ShoppingCart size={24} />,
        color: "color-info",
      },
      {
        title: "Total Paid",
        value: overview?.orders_paid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <CreditCard size={24} />,
        color: "color-success",
      },
      {
        title: "Paid Ratio",
        value: overview?.paid_ratio_formatted ?? (loading ? "…" : "0%"),
        icon: <Percent size={24} />,
        color: "color-warning",
      },
      {
        title: "Unpaid Orders",
        value: overview?.orders_unpaid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <Package size={24} />,
        color: "color-error",
      },
    ];
  }, [overview, loading]);

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

  // State for Meta Ads daily performance
  const [metaAdsDaily, setMetaAdsDaily] = useState([]);
  const [loadingMetaAds, setLoadingMetaAds] = useState(true);

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

  // Load Meta Ads daily performance (last 30 days)
  const loadMetaAdsDaily = useCallback(async () => {
    setLoadingMetaAds(true);
    try {
      const token = localStorage.getItem("token");
      const endDate = new Date().toISOString().slice(0, 10);
      const startDate = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
      const response = await fetch(
        `/api/sales/meta-ads/performance/overview?start_date=${startDate}&end_date=${endDate}&status=active`,
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );
      if (!response.ok) return;
      const json = await response.json();
      const list = json?.data?.daily || [];
      setMetaAdsDaily(
        list.map((d) => {
          const dt = new Date(d.date);
          const label = isNaN(dt)
            ? d.date
            : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(dt);
          return {
            label,
            spend: Number(d.spend || 0),
            leads: Number(d.leads || 0),
            purchase: Number(d.conversions || 0),
          };
        })
      );
    } catch (err) {
      console.error("Error loading meta ads daily performance:", err);
    } finally {
      setLoadingMetaAds(false);
    }
  }, []);

  useEffect(() => {
    loadMetaAdsDaily();
  }, [loadMetaAdsDaily]);

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

        <section className="dashboard-staff-section">
          <div className="dashboard-staff-layout dashboard-staff-layout--single">
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
                    <div style={{ padding: '0.5rem', color: 'var(--color-text-secondary)' }}>Loading tabs...</div>
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
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading performa sales...</div>
                  ) : salesStatistics.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Belum ada data sales.</div>
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
                                <p className="staff-card__email" style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
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
                                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Overall</p>
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
                                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>This Period</p>
                              </div>
                            </div>

                            {/* row 2 */}
                            <div className="staff-card__stat-row">
                              <div className="staff-card__stat">
                                <p className="staff-card__stat-label">Total Orders</p>
                                <p className="staff-card__stat-value">{staff.orders?.total ?? 0}</p>
                                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>Overall</p>
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
                                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>This Period</p>
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
                                  <p className="staff-card__stat-value" style={{ color: 'var(--color-success-dark)' }}>
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
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '2px' }}>
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
                  border-bottom: 1px solid var(--color-divider);
                }
                .staff-tabs-nav::-webkit-scrollbar {
                  height: 4px;
                }
                .staff-tabs-nav::-webkit-scrollbar-thumb {
                  background: var(--color-grey-200);
                  border-radius: 10px;
                }
                .staff-tab-btn {
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  padding: 8px 16px;
                  background: var(--color-bg-default);
                  border: 1px solid var(--color-border);
                  border-radius: 10px;
                  color: var(--color-text-secondary);
                  font-size: 0.85rem;
                  font-weight: 600;
                  cursor: pointer;
                  white-space: nowrap;
                  transition: all 0.2s;
                }
                .staff-tab-btn:hover {
                  background: var(--color-grey-100);
                  border-color: var(--color-grey-300);
                }
                .staff-tab-btn.active {
                  background: var(--color-primary-main);
                  border-color: var(--color-primary-main);
                  color: #fff;
                  box-shadow: none;
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
                .growth-indicator.up { background: var(--color-success-lighter); color: var(--color-success-dark); }
                .growth-indicator.down { background: var(--color-error-lighter); color: var(--color-error-dark); }
                .growth-indicator.small { font-size: 0.65rem; }
                .conversion-badge {
                  display: flex;
                  align-items: center;
                  gap: 4px;
                  background: var(--color-info-lighter);
                  color: var(--color-info-dark);
                  padding: 4px 8px;
                  border-radius: 6px;
                  font-size: 0.7rem;
                  font-weight: 700;
                }
                .staff-card__stat-value.highlight {
                  color: var(--color-text-primary);
                  font-size: 1.1rem;
                  font-weight: 800;
                }
              `}</style>
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
                  <LazyCartesianGrid stroke="var(--color-divider)" vertical={false} />
                  <LazyXAxis dataKey="label" stroke="var(--color-text-secondary)" fontSize={12} tickMargin={12} />
                  <LazyTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                    formatter={(value, name) => [value, name === "orders" ? "Order" : "Transaksi"]}
                  />
                  <LazyLine type="monotone" dataKey="orders" stroke="var(--color-primary-main)" strokeWidth={3} dot={false} name="orders" />
                  <LazyLine
                    type="monotone"
                    dataKey="transactions"
                    stroke="var(--color-accent-main)"
                    strokeWidth={3}
                    dot={false}
                    name="transactions"
                  />
                </LazyChart>
              </LazyResponsiveContainer>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                Loading chart...
              </div>
            )}
            {!chartHasData && <p className="panel__empty">Belum ada data transaksi untuk periode ini.</p>}
            {!chartHasData && <p className="panel__empty">Belum ada data transaksi untuk periode ini.</p>}
          </article>
        </section>

        {/* META ADS: SPEND VS LEADS GROWTH */}
        <section className="dashboard-panels">
          <article className="panel panel--chart">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Spend vs Leads (30 hari terakhir)</p>
                <h3 className="panel__title">Meta Ads Performance</h3>
              </div>
            </div>

            {LazyResponsiveContainer && LazyComposedChart && LazyBar && LazyLine && LazyXAxis && LazyYAxis && LazyTooltip && LazyLegend && LazyCartesianGrid ? (
              <LazyResponsiveContainer width="100%" height={280}>
                <LazyComposedChart data={metaAdsDaily.length > 0 ? metaAdsDaily : [{ label: "-", spend: 0, leads: 0, purchase: 0 }]}>
                  <LazyCartesianGrid stroke="var(--color-divider)" vertical={false} />
                  <LazyXAxis dataKey="label" stroke="var(--color-text-secondary)" fontSize={12} tickMargin={12} />
                  <LazyYAxis yAxisId="left" stroke="var(--color-text-secondary)" fontSize={12} />
                  <LazyYAxis yAxisId="right" orientation="right" stroke="var(--color-text-secondary)" fontSize={12} />
                  <LazyTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }}
                    formatter={(value, name) => [name === "spend" ? new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value) : value, name === "spend" ? "Biaya" : name === "leads" ? "Leads" : "Purchase"]}
                  />
                  <LazyLegend formatter={(name) => (name === "spend" ? "Biaya" : name === "leads" ? "Leads" : "Purchase")} />
                  <LazyBar yAxisId="left" dataKey="spend" fill="var(--color-primary-main)" radius={[4, 4, 0, 0]} name="spend" />
                  <LazyLine yAxisId="right" type="monotone" dataKey="leads" stroke="var(--color-accent-main)" strokeWidth={3} dot={false} name="leads" />
                  <LazyLine yAxisId="right" type="monotone" dataKey="purchase" stroke="var(--color-success-dark)" strokeWidth={3} dot={false} name="purchase" />
                </LazyComposedChart>
              </LazyResponsiveContainer>
            ) : (
              <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
                Loading chart...
              </div>
            )}
            {!loadingMetaAds && metaAdsDaily.length === 0 && <p className="panel__empty">Belum ada data Meta Ads untuk periode ini.</p>}
          </article>
        </section>
      </div>
    </Layout>
  );
}
