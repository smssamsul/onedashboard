"use client";

import "@/styles/sales/dashboard-premium.css";
import "@/styles/finance/dashboard-premium.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import AttendanceCard from "@/components/AttendanceCard";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  PiggyBank,
  CreditCard,
  FileCheck,
  AlertCircle,
  ShoppingCart,
  Percent,
  Package,
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

export default function FinanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dummy data untuk finance dashboard
  const DUMMY_DATA = {
    overview: {
      orders_pending: 0,
      orders_approved: 0,
      orders_rejected: 0,
      orders_dp: 0,
      orders_total: 129,
      orders_paid: 26,
      paid_ratio: 20.16,
      orders_unpaid: 103,
    },
    financial: {
      net_revenue: 2500000,
      net_profit: 2500000,
      cash_flow: 1800000,
      outstanding_payments: 3500000,
    },
    statistik: {
      profit_margin: 28.0,
      growth_rate: 18.5,
    },
    chart_financial: [
      { label: "Week 1", pemasukan: 45000000, pengeluaran: 32000000 },
      { label: "Week 2", pemasukan: 52000000, pengeluaran: 38000000 },
      { label: "Week 3", pemasukan: 48000000, pengeluaran: 35000000 },
      { label: "Week 4", pemasukan: 61000000, pengeluaran: 42000000 },
    ],
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      // const token = localStorage.getItem("token");
      // const response = await fetch("/api/finance/dashboard", {
      //   method: "GET",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "Accept": "application/json",
      //     ...(token ? { Authorization: `Bearer ${token}` } : {}),
      //   },
      // });
      // const json = await response.json();
      // setData(json.data);

      // Using dummy data for now
      setTimeout(() => {
        setData(DUMMY_DATA);
        setLoading(false);
      }, 500);
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat memuat data");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const overview = data?.overview;
  const financial = data?.financial;
  const statistik = data?.statistik;

  const formatCurrency = (value) => {
    if (!value) return "Rp0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const summaryCards = useMemo(() => {
    return [
      {
        title: "Pending Approval",
        value: overview?.orders_pending?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <Clock size={24} />,
        color: "accent-amber",
      },
      {
        title: "Approved Transactions",
        value: overview?.orders_approved?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <CheckCircle size={24} />,
        color: "accent-emerald",
      },
      {
        title: "Rejected Transactions",
        value: overview?.orders_rejected?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <XCircle size={24} />,
        color: "accent-red",
      },
      {
        title: "DP Transactions",
        value: overview?.orders_dp?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <FileCheck size={24} />,
        color: "accent-blue",
      },
    ];
  }, [overview, loading]);

  const revenueCards = useMemo(() => {
    return [
      {
        title: "Net Revenue",
        value: financial?.net_revenue ? formatCurrency(financial.net_revenue) : (loading ? "…" : "Rp0"),
        icon: <TrendingUp size={24} />,
        color: "accent-orange",
      },
      {
        title: "Net Profit",
        value: financial?.net_profit ? formatCurrency(financial.net_profit) : (loading ? "…" : "Rp0"),
        icon: <PiggyBank size={24} />,
        color: "accent-orange",
      },
      {
        title: "Cash Flow",
        value: financial?.cash_flow ? formatCurrency(financial.cash_flow) : (loading ? "…" : "Rp0"),
        icon: <Wallet size={24} />,
        color: "accent-orange",
      },
      {
        title: "Outstanding Payments",
        value: financial?.outstanding_payments ? formatCurrency(financial.outstanding_payments) : (loading ? "…" : "Rp0"),
        icon: <AlertCircle size={24} />,
        color: "accent-orange",
      },
    ];
  }, [financial, loading]);

  const orderSummaryCards = useMemo(() => {
    return [
      {
        title: "Total Transactions",
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
        value: overview?.paid_ratio ? `${overview.paid_ratio}%` : (loading ? "…" : "0%"),
        icon: <Percent size={24} />,
        color: "accent-orange",
      },
      {
        title: "Unpaid Transactions",
        value: overview?.orders_unpaid?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
        icon: <Package size={24} />,
        color: "accent-orange",
      },
    ];
  }, [overview, loading]);

  const activityTrend = useMemo(() => {
    return (
      data?.chart_financial?.map((point) => ({
        label: point.label,
        pemasukan: point.pemasukan / 1000000, // Convert to millions for display
        pengeluaran: point.pengeluaran / 1000000,
      })) ?? []
    );
  }, [data]);

  const chartHasData = activityTrend.length > 0;

  return (
    <Layout title="Dashboard | Finance Panel" aboveContent={<GreetingBanner />}>
      <div className="dashboard-shell">
        {error && <div className="dashboard-alert">{error}</div>}
        <AttendanceCard />

        <section className="financial-snapshot-section">
          <div className="financial-grid">
            {revenueCards.map((card) => (
              <article className="financial-card" key={card.title}>
                <div className={`financial-card__icon ${card.color}`}>{card.icon}</div>
                <div>
                  <p className="financial-card__label">{card.title}</p>
                  <p className="financial-card__value">{card.value}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-panels">
          <article className="panel panel--chart">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Financial Activity</p>
                <h3 className="panel__title">S-Curve Chart</h3>
              </div>
              <span className="panel__meta">Last 30 days</span>
            </div>

            {LazyResponsiveContainer && LazyChart && LazyLine && LazyXAxis && LazyTooltip && LazyCartesianGrid ? (
              <LazyResponsiveContainer width="100%" height={400}>
                <LazyChart data={chartHasData ? activityTrend : [{ label: "-", pemasukan: 0, pengeluaran: 0 }]}>
                  <LazyCartesianGrid stroke="#F1F5F9" vertical={false} />
                  <LazyXAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickMargin={12} />
                  <LazyTooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }}
                    formatter={(value, name) => [
                      `Rp${Number(value).toLocaleString("id-ID")}M`,
                      name === "pemasukan" ? "Pemasukan" : "Pengeluaran"
                    ]}
                  />
                  <LazyLine type="monotone" dataKey="pemasukan" stroke="#10b981" strokeWidth={3} dot={false} name="pemasukan" />
                  <LazyLine
                    type="monotone"
                    dataKey="pengeluaran"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={false}
                    name="pengeluaran"
                  />
                </LazyChart>
              </LazyResponsiveContainer>
            ) : (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                Loading chart...
              </div>
            )}
            {!chartHasData && <p className="panel__empty">Belum ada data finansial untuk periode ini.</p>}
          </article>

          <article className="panel panel--summary">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Transaction Summary</p>
                <h3 className="panel__title">Transactions Overview</h3>
              </div>
            </div>

            <div className="order-summary-list">
              {orderSummaryCards.map((card) => (
                <article className="order-summary-card" key={card.title}>
                  <div className={`order-summary-card__icon ${card.color}`}>{card.icon}</div>
                  <div>
                    <p className="order-summary-card__label">{card.title}</p>
                    <p className="order-summary-card__value">{card.value}</p>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    </Layout>
  );
}
