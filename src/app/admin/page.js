"use client";

import "@/styles/sales/dashboard-premium.css";
import Layout from "@/components/Layout";
import DashboardTabs from "@/components/DashboardTabs";
import GreetingBanner from "@/components/GreetingBanner";
import AttendanceCard from "@/components/AttendanceCard";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
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
  LayoutDashboard as LayoutIcon,
  ShoppingBag,
  Users2,
  Briefcase,
  UserPlus,
  UserMinus,
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
const LazyTooltip = dynamic(
  () => import("recharts").then((mod) => mod.Tooltip),
  { ssr: false }
);
const LazyCartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
// Create motion component wrapper
const createMotionDiv = () => {
  let MotionDiv = null;
  return dynamic(
    () => import("framer-motion").then((mod) => {
      MotionDiv = mod.motion.div;
      return { default: MotionDiv };
    }),
    { ssr: false }
  );
};

const LazyMotionDiv = createMotionDiv();

const hrMockData = {
  statistik: {
    total_penjualan_hari_ini_formatted: "Rp 125.000",
  },
  hrMetrics: {
    activeEmployees: 134,
    openRoles: 11,
    newHires30d: 9,
    attrition30d: 3,
  },
  engagement: [
    { label: "Engagement score", value: "8.4 / 10", delta: "+0.4 QoQ" },
    { label: "Policy completion", value: "92%", delta: "+5% this week" },
    { label: "Internal mobility", value: "14%", delta: "+2% YTD" },
  ],
  pipelineStages: [
    { stage: "Sourcing", candidates: 48, status: "+6 vs last week" },
    { stage: "Screening", candidates: 21, status: "On track" },
    { stage: "Interviews", candidates: 12, status: "2 offers out" },
    { stage: "Offers", candidates: 4, status: "75% acceptance" },
  ],
  chart_transaksi_order: [
    { label: "Mon", order: 4, transaksi: 120000 },
    { label: "Tue", order: 6, transaksi: 150000 },
    { label: "Wed", order: 5, transaksi: 130000 },
    { label: "Thu", order: 7, transaksi: 190000 },
    { label: "Fri", order: 3, transaksi: 90000 },
    { label: "Sat", order: 2, transaksi: 60000 },
    { label: "Sun", order: 1, transaksi: 40000 },
  ],
  overview: {
    orders_total: 28,
    orders_paid: 18,
    orders_unpaid: 10,
    paid_ratio_formatted: "64.3%",
    customers_total: 42,
    customers_new_today: 3,
  },
  financial: {
    gross_revenue_formatted: "Rp 850.000",
    shipping_cost_formatted: "Rp 75.000",
    net_revenue_formatted: "Rp 775.000",
    gross_profit_formatted: "Rp 620.000",
    net_profit_formatted: "Rp 520.000",
  },
};

const divisionConfigs = {
  admin: {
    label: "Admin Overview",
    title: "Admin Dashboard Overview",
    endpoint: "/api/admin/sales/dashboard",
    Icon: LayoutIcon,
  },
  sales: {
    label: "Sales Dashboard",
    title: "Sales Dashboard Overview",
    endpoint: "/api/admin/sales/dashboard",
    Icon: ShoppingBag,
  },
  hr: {
    label: "HR Dashboard",
    title: "HR Dashboard Overview",
    endpoint: null,
    mockData: hrMockData,
    Icon: Users2,
  },
};

export default function Dashboard() {
  const [activeDivision, setActiveDivision] = useState("admin");
  const [dataMap, setDataMap] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});

  const loadDivisionData = useCallback(
    async (division) => {
      const config = divisionConfigs[division];
      if (!config || dataMap[division]) return;

      if (config.mockData) {
        setDataMap((prev) => ({ ...prev, [division]: config.mockData }));
        setLoadingMap((prev) => ({ ...prev, [division]: false }));
        setErrorMap((prev) => ({ ...prev, [division]: null }));
        return;
      }

      setLoadingMap((prev) => ({ ...prev, [division]: true }));
      setErrorMap((prev) => ({ ...prev, [division]: null }));

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(config.endpoint, {
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
        setDataMap((prev) => ({ ...prev, [division]: json.data }));
      } catch (err) {
        setErrorMap((prev) => ({
          ...prev,
          [division]: err.message || "Terjadi kesalahan saat memuat data",
        }));
      } finally {
        setLoadingMap((prev) => ({ ...prev, [division]: false }));
      }
    },
    [dataMap]
  );

  useEffect(() => {
    loadDivisionData(activeDivision);
  }, [activeDivision, loadDivisionData]);

  const activeData = dataMap[activeDivision];
  const isLoading = loadingMap[activeDivision] ?? false;
  // Only show loading if we're actually loading AND don't have data yet
  const loading = isLoading && !activeData && !errorMap[activeDivision];
  const error = errorMap[activeDivision];
  const overview = activeData?.overview;
  const financial = activeData?.financial;
  const statistik = activeData?.statistik;

  const isHR = activeDivision === "hr";

  const summaryCards = useMemo(() => {
    if (isHR) {
      return [
        {
          title: "Active Employees",
          value: activeData?.hrMetrics?.activeEmployees ?? (loading ? "…" : "0"),
          icon: <Users2 size={24} />,
          color: "accent-indigo",
        },
        {
          title: "Open Requisitions",
          value: activeData?.hrMetrics?.openRoles ?? (loading ? "…" : "0"),
          icon: <Briefcase size={24} />,
          color: "accent-emerald",
        },
        {
          title: "New Hires (30d)",
          value: activeData?.hrMetrics?.newHires30d ?? (loading ? "…" : "0"),
          icon: <UserPlus size={24} />,
          color: "accent-blue",
        },
        {
          title: "Attrition (30d)",
          value: activeData?.hrMetrics?.attrition30d ?? (loading ? "…" : "0"),
          icon: <UserMinus size={24} />,
          color: "accent-red",
        },
      ];
    }

    return [
      {
        title: "Total Orders",
        value: overview?.orders_total?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <ShoppingCart size={24} />,
        color: "accent-blue",
      },
      {
        title: "Total Paid",
        value: overview?.orders_paid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <CreditCard size={24} />,
        color: "accent-emerald",
      },
      {
        title: "Paid Ratio",
        value: overview?.paid_ratio_formatted ?? (loading ? "…" : "0%"),
        icon: <Percent size={24} />,
        color: "accent-amber",
      },
      {
        title: "Unpaid Orders",
        value: overview?.orders_unpaid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <Package size={24} />,
        color: "accent-red",
      },
    ];
  }, [isHR, activeData, overview, loading]);

  const revenueCards = useMemo(() => {
    if (isHR) {
      return [];
    }

    return [
      {
        title: "Gross Revenue",
        value: financial?.gross_revenue_formatted ?? (loading ? "…" : "Rp0"),
        icon: <DollarSign size={24} />,
        color: "accent-emerald",
      },
      {
        title: "Shipping Cost",
        value: financial?.shipping_cost_formatted ?? (loading ? "…" : "Rp0"),
        icon: <Truck size={24} />,
        color: "accent-purple",
      },
      {
        title: "Net Revenue",
        value: financial?.net_revenue_formatted ?? (loading ? "…" : "Rp0"),
        icon: <Wallet size={24} />,
        color: "accent-indigo",
      },
      {
        title: "Gross Profit",
        value: financial?.gross_profit_formatted ?? (loading ? "…" : "Rp0"),
        icon: <PiggyBank size={24} />,
        color: "accent-pink",
      },
      {
        title: "Net Profit",
        value: financial?.net_profit_formatted ?? (loading ? "…" : "Rp0"),
        icon: <TrendingUp size={24} />,
        color: "accent-teal",
      },
    ];
  }, [isHR, financial, loading]);

  const activityTrend = useMemo(() => {
    return (
      activeData?.chart_transaksi_order?.map((point) => ({
        label: point.label,
        orders: point.order,
        transactions: point.transaksi,
      })) ?? []
    );
  }, [activeData]);

  const chartHasData = activityTrend.length > 0;
  const activeConfig = divisionConfigs[activeDivision];
  const tabs = Object.entries(divisionConfigs).map(([key, config]) => ({
    key,
    label: config.label,
    Icon: config.Icon,
  }));

  return (
    <Layout title="Dashboard | Admin Panel" aboveContent={<GreetingBanner />}>
      <div className="dashboard-shell">
        <DashboardTabs tabs={tabs} activeKey={activeDivision} onChange={setActiveDivision} />
        {error && <div className="dashboard-alert">{error}</div>}
        <AttendanceCard />
        <section className="dashboard-hero">
          <div className="dashboard-hero__copy">
            <p className="dashboard-hero__eyebrow">Performance</p>
            <h2 className="dashboard-hero__title">{activeConfig?.title || "Dashboard Overview"}</h2>
            <p className="dashboard-hero__subtitle">{activeConfig?.description}</p>
          </div>

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

        <section className="dashboard-panels">
          <article className="panel panel--chart">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Orders vs Transactions</p>
                <h3 className="panel__title">
                  {activeDivision === "sales" ? "Sales Activity" : "Division Activity"}
                </h3>
              </div>
              <span className="panel__meta">Last 30 days</span>
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
                  <LazyLine type="monotone" dataKey="orders" stroke="#6366F1" strokeWidth={3} dot={false} name="orders" />
                  <LazyLine
                    type="monotone"
                    dataKey="transactions"
                    stroke="#F97316"
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
          </article>

          <article className="panel panel--revenue">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">
                  {isHR ? "Talent health" : "Revenue breakdown"}
                </p>
                <h3 className="panel__title">
                  {isHR ? "People Snapshot" : "Financial Snapshot"}
                </h3>
              </div>
              <span className="panel__meta accent-green">Stable</span>
            </div>

            {isHR ? (
              <div className="hr-panel-grid">
                <div className="hr-pipeline">
                  {activeData?.pipelineStages?.map((stage) => (
                    <article className="hr-pipeline-card" key={stage.stage}>
                      <div>
                        <p className="hr-pipeline-card__label">{stage.stage}</p>
                        <p className="hr-pipeline-card__value">{stage.candidates} candidates</p>
                      </div>
                      <span className="hr-pipeline-card__status">{stage.status}</span>
                    </article>
                  ))}
                </div>
                <div className="hr-spotlight-grid">
                  {activeData?.engagement?.map((metric) => (
                    <article className="hr-spotlight-card" key={metric.label}>
                      <p className="hr-spotlight-card__label">{metric.label}</p>
                      <p className="hr-spotlight-card__value">{metric.value}</p>
                      <span className="hr-spotlight-card__delta">{metric.delta}</span>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
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
            )}
          </article>
        </section>
      </div>
    </Layout>
  );
}
