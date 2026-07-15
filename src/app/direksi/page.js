"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import "@/styles/sales/dashboard-premium.css";
import "@/styles/sales/dashboard-tabs.css";
import "@/styles/hr-dashboard.css";
import Layout from "@/components/Layout";
import DashboardTabs from "@/components/DashboardTabs";
import GreetingBanner from "@/components/GreetingBanner";
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Code,
  Film,
  ShoppingCart,
  CreditCard,
  Package,
  Percent,
  DollarSign,
  Truck,
  Wallet,
  PiggyBank,
  UserCheck,
  Brain,
  MessageSquare,
  CheckSquare,
  CalendarDays,
  Server,
  Image as ImageIcon,
  Video,
  Palette,
  Zap,
  ClipboardCheck,
  UserMinus,
} from "lucide-react";
import { getApiUrl } from "@/config/api";
import { useRouter } from "next/navigation";
import { getDivisionHome } from "@/lib/divisionRoutes";
import dynamic from "next/dynamic";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid, LineChart, Line } from "recharts";

// Lazy load chart components
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

const divisionConfigs = {
  sales: {
    label: "Sales",
    title: "Sales Dashboard Overview",
    Icon: ShoppingBag,
  },
  hr: {
    label: "HR",
    title: "HR Dashboard Overview",
    Icon: Users,
  },
  marketing: {
    label: "Marketing",
    title: "Marketing Dashboard Overview",
    Icon: TrendingUp,
  },
  it: {
    label: "IT",
    title: "IT Dashboard Overview",
    Icon: Code,
  },
  multimedia: {
    label: "Multimedia",
    title: "Multimedia Dashboard Overview",
    Icon: Film,
  },
};

export default function DireksiDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeDivision, setActiveDivision] = useState("sales");
  const [data, setData] = useState({
    sales: null,
    hr: null,
    marketing: null,
    it: null,
    multimedia: null,
  });

  useEffect(() => {
    // Check if user is direksi (level 9 atau divisi 9)
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        const isDireksi = (user.level === "9" || user.level === 9) || (user.divisi === "9" || user.divisi === 9);
        if (!isDireksi) {
          const targetRoute = getDivisionHome(user.divisi, user.level);
          router.push(targetRoute || "/login");
          return;
        }
      } catch (e) {
        router.push("/login");
        return;
      }
    } else {
      router.push("/login");
      return;
    }

    loadDashboard();
  }, [router]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch(getApiUrl("direksi/dashboard"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (res.status === 403) {
        setError("Akses ditolak. Hanya direksi yang dapat mengakses halaman ini.");
        setLoading(false);
        return;
      }

      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Gagal memuat data dashboard");
        return;
      }

      setData(json.data);
    } catch (e) {
      console.error("Error loading direksi dashboard:", e);
      setError("Terjadi kesalahan saat memuat data dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const formatCurrency = (value) => {
    if (!value) return "Rp 0";
    return "Rp " + new Intl.NumberFormat("id-ID").format(value);
  };

  const activeData = data[activeDivision];
  const activeConfig = divisionConfigs[activeDivision];

  // Summary cards berdasarkan divisi
  const summaryCards = useMemo(() => {
    if (!activeData) return [];

    switch (activeDivision) {
      case "sales":
        return [
          {
            title: "Total Orders",
            value: formatNumber(activeData.overview?.orders_total || 0),
            icon: <ShoppingCart size={24} />,
            color: "accent-orange",
          },
          {
            title: "Total Paid",
            value: formatNumber(activeData.overview?.orders_paid || 0),
            icon: <CreditCard size={24} />,
            color: "accent-orange",
          },
          {
            title: "Paid Ratio",
            value: activeData.overview?.paid_ratio_formatted ?? (loading ? "…" : "0%"),
            icon: <Percent size={24} />,
            color: "accent-orange",
          },
          {
            title: "Unpaid Orders",
            value: formatNumber(activeData.overview?.orders_unpaid || 0),
            icon: <Package size={24} />,
            color: "accent-orange",
          },
        ];

      case "hr":
        return [
          {
            title: "Total Karyawan",
            value: formatNumber(activeData.statistik?.total_karyawan || 0),
            icon: <Users size={22} />,
            color: "accent-indigo",
          },
          {
            title: "Karyawan Aktif",
            value: formatNumber(activeData.statistik?.karyawan_aktif || 0),
            icon: <ClipboardCheck size={22} />,
            color: "accent-emerald",
          },
          {
            title: "Sedang Cuti (hari ini)",
            value: formatNumber(activeData.cuti?.cuti_aktif_hari_ini || 0),
            icon: <CalendarDays size={22} />,
            color: "accent-blue",
          },
          {
            title: "Resign (total)",
            value: formatNumber(activeData.statistik?.karyawan_resign || 0),
            icon: <UserMinus size={22} />,
            color: "accent-rose",
          },
        ];

      case "marketing":
        return [
          {
            title: "Total Leads",
            value: formatNumber(activeData.leads?.total || 0),
            icon: <TrendingUp size={24} />,
            color: "accent-blue",
          },
          {
            title: "Leads Hari Ini",
            value: formatNumber(activeData.leads?.new_today || 0),
            icon: <TrendingUp size={24} />,
            color: "accent-emerald",
          },
          {
            title: "Penjualan Bulan Ini",
            value: activeData.penjualan?.total_month_formatted || "Rp 0",
            icon: <ShoppingCart size={24} />,
            color: "accent-purple",
          },
          {
            title: "Penjualan Hari Ini",
            value: activeData.penjualan?.today_formatted || "Rp 0",
            icon: <CreditCard size={24} />,
            color: "accent-indigo",
          },
        ];

      case "it":
        return [
          {
            title: "Total Projects",
            value: formatNumber(activeData.progress_report?.projects_total || 0),
            icon: <Code size={24} />,
            color: "accent-blue",
          },
          {
            title: "Projects Completed",
            value: formatNumber(activeData.progress_report?.projects_completed || 0),
            icon: <CheckSquare size={24} />,
            color: "accent-emerald",
          },
          {
            title: "Projects In Progress",
            value: formatNumber(activeData.progress_report?.projects_in_progress || 0),
            icon: <Code size={24} />,
            color: "accent-purple",
          },
          {
            title: "System Uptime",
            value: `${activeData.progress_report?.systems_uptime || 0}%`,
            icon: <Server size={24} />,
            color: "accent-indigo",
          },
        ];

      case "multimedia":
        return [
          {
            title: "Total Konten",
            value: formatNumber(activeData.konten?.total || 0),
            icon: <Film size={24} />,
            color: "accent-blue",
          },
          {
            title: "Images",
            value: formatNumber(activeData.konten?.images || 0),
            icon: <ImageIcon size={24} />,
            color: "accent-emerald",
          },
          {
            title: "Videos",
            value: formatNumber(activeData.konten?.videos || 0),
            icon: <Video size={24} />,
            color: "accent-purple",
          },
          {
            title: "Projects Aktif",
            value: formatNumber(activeData.insight?.projects_active || 0),
            icon: <Zap size={24} />,
            color: "accent-indigo",
          },
        ];

      default:
        return [];
    }
  }, [activeData, activeDivision, loading]);

  // Revenue cards untuk Sales
  const revenueCards = useMemo(() => {
    if (activeDivision !== "sales" || !activeData?.financial) return [];

    return [
      {
        title: "Gross Revenue",
        value: activeData.financial.gross_revenue_formatted ?? (loading ? "…" : "Rp0"),
        icon: <DollarSign size={24} />,
        color: "accent-orange",
      },
      {
        title: "Shipping Cost",
        value: activeData.financial.shipping_cost_formatted ?? (loading ? "…" : "Rp0"),
        icon: <Truck size={24} />,
        color: "accent-orange",
      },
      {
        title: "Net Revenue",
        value: activeData.financial.net_revenue_formatted ?? (loading ? "…" : "Rp0"),
        icon: <Wallet size={24} />,
        color: "accent-orange",
      },
      {
        title: "Gross Profit",
        value: activeData.financial.gross_profit_formatted ?? (loading ? "…" : "Rp0"),
        icon: <PiggyBank size={24} />,
        color: "accent-orange",
      },
      {
        title: "Net Profit",
        value: activeData.financial.net_profit_formatted ?? (loading ? "…" : "Rp0"),
        icon: <TrendingUp size={24} />,
        color: "accent-orange",
      },
    ];
  }, [activeDivision, activeData, loading]);

  // Chart data untuk Sales
  const activityTrend = useMemo(() => {
    if (activeDivision !== "sales" || !activeData?.chart_transaksi_order) return [];

    return activeData.chart_transaksi_order.map((point) => ({
      label: point.label,
      orders: point.order,
      transactions: point.transaksi,
    }));
  }, [activeDivision, activeData]);

  const tabs = Object.entries(divisionConfigs).map(([key, config]) => ({
    key,
    label: config.label,
    Icon: config.Icon,
  }));

  return (
    <Layout title="Dashboard Direksi" aboveContent={<GreetingBanner />}>
      <div className="dashboard-shell">
        <DashboardTabs tabs={tabs} activeKey={activeDivision} onChange={setActiveDivision} />
        
        {error && <div className="dashboard-alert">{error}</div>}

        {/* Sales Dashboard */}
        {activeDivision === "sales" && activeData && (
          <>
            <section className="dashboard-hero">
              <div className="dashboard-hero__copy">
                <p className="dashboard-hero__eyebrow">Performance</p>
                <h2 className="dashboard-hero__title">{activeConfig?.title || "Dashboard Overview"}</h2>
                <p className="dashboard-hero__subtitle">
                  Dashboard terpusat untuk melihat performa semua divisi perusahaan
                </p>
              </div>

              {loading ? (
                <div className="dashboard-summary-horizontal">
                  {[1, 2, 3, 4].map((i) => (
                    <article className="summary-card" key={i}>
                      <div className="summary-card__icon accent-orange">
                        <div style={{ width: 24, height: 24, background: "#e5e7eb", borderRadius: 4 }} />
                      </div>
                      <div>
                        <p className="summary-card__label">Loading...</p>
                        <p className="summary-card__value">…</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="dashboard-summary-horizontal">
                  {summaryCards.map((card) => (
                    <article className="summary-card" key={card.title}>
                      <div className={`summary-card__icon ${card.color}`}>{card.icon}</div>
                      <div>
                        <p className="summary-card__label">{card.title}</p>
                        <p className="summary-card__value">{card.value}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panels">
              <article className="panel panel--chart">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Orders vs Transactions</p>
                    <h3 className="panel__title">Sales Activity</h3>
                  </div>
                  <span className="panel__meta">Last 14 days</span>
                </div>

                {LazyResponsiveContainer && LazyChart && LazyLine && LazyXAxis && LazyTooltip && LazyCartesianGrid ? (
                  <LazyResponsiveContainer width="100%" height={280}>
                    <LazyChart data={activityTrend.length > 0 ? activityTrend : [{ label: "-", orders: 0, transactions: 0 }]}>
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
                {activityTrend.length === 0 && <p className="panel__empty">Belum ada data transaksi untuk periode ini.</p>}
              </article>

              <article className="panel panel--revenue">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Revenue breakdown</p>
                    <h3 className="panel__title">Financial Snapshot</h3>
                  </div>
                  <span className="panel__meta accent-green">Stable</span>
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
            </section>
          </>
        )}

        {/* HR Dashboard */}
        {activeDivision === "hr" && activeData && (
          <>
            <section className="hr-hero">
              <div className="hr-hero__copy">
                <p className="hr-hero__eyebrow">HR Overview</p>
                <h2 className="hr-hero__title">Ringkasan Data Karyawan</h2>
                <span className="hr-hero__meta">
                  Menampilkan data riil dari tabel karyawan, absensi, dan cuti
                </span>
              </div>

              <div className="hr-summary-grid">
                {summaryCards.map((card) => (
                  <article className="hr-summary-card" key={card.title}>
                    <div className={`hr-summary-card__icon ${card.color}`}>{card.icon}</div>
                    <div>
                      <p className="hr-summary-card__label">{card.title}</p>
                      <p className="hr-summary-card__value">{loading ? "-" : card.value}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="hr-panels">
              <article className="hr-panel hr-panel--chart">
                <div className="hr-panel__header">
                  <div>
                    <p className="hr-panel__eyebrow">Kehadiran</p>
                    <h3 className="hr-panel__title">7 hari terakhir</h3>
                  </div>
                  <span className="hr-panel__meta">
                    Hari ini: {activeData.absensi?.hadir_hari_ini || 0} hadir,{" "}
                    {activeData.absensi?.terlambat_hari_ini || 0} telat (
                    {activeData.absensi?.persentase_kehadiran || 0}%)
                  </span>
                </div>

                {activeData.chart_absensi?.length === 0 ? (
                  <div className="hr-empty-state">
                    Belum ada data absensi untuk 7 hari terakhir.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={activeData.chart_absensi || []}>
                      <CartesianGrid stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="label" stroke="#94A3B8" fontSize={12} tickMargin={12} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #E2E8F0" }}
                      />
                      <Bar dataKey="hadir" name="Hadir" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="telat" name="Telat" fill="#F97316" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </article>

              <article className="hr-panel hr-panel--spotlight">
                <div className="hr-panel__header">
                  <div>
                    <p className="hr-panel__eyebrow">Karyawan</p>
                    <h3 className="hr-panel__title">Karyawan terbaru</h3>
                  </div>
                </div>

                <div className="spotlight-grid spotlight-grid--list">
                  {activeData.karyawan_terbaru?.length === 0 ? (
                    <div className="hr-empty-state">Belum ada data karyawan.</div>
                  ) : (
                    activeData.karyawan_terbaru?.map((k) => (
                      <article className="spotlight-card" key={k.id}>
                        <div>
                          <p className="spotlight-card__label">{k.nama}</p>
                          <p className="spotlight-card__value">
                            Departemen: {k.departemen ?? "-"} • Join:{" "}
                            {k.tanggal_join ?? "-"}
                          </p>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </article>

              <article className="hr-panel hr-panel--compliance">
                <div className="hr-panel__header">
                  <div>
                    <p className="hr-panel__eyebrow">Cuti</p>
                    <h3 className="hr-panel__title">Pengajuan cuti terbaru</h3>
                  </div>
                  <span className="hr-panel__meta">
                    Pending: {activeData.cuti?.cuti_pending || 0}
                  </span>
                </div>

                <div className="compliance-list">
                  {activeData.cuti_terbaru?.length === 0 ? (
                    <div className="hr-empty-state">Belum ada data cuti.</div>
                  ) : (
                    activeData.cuti_terbaru?.map((c) => (
                      <div className="compliance-item" key={c.id}>
                        <div>
                          <p className="compliance-item__title">
                            {c.karyawan_rel?.nama ?? "Karyawan"} -{" "}
                            {c.type_rel?.nama ?? "Cuti"}
                          </p>
                          <p className="compliance-item__owner">
                            {c.start_date} s/d {c.end_date}
                          </p>
                        </div>
                        <span className="compliance-item__due">
                          {c.status_cuti ?? "-"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </article>
            </section>
          </>
        )}

        {/* Marketing Dashboard */}
        {activeDivision === "marketing" && activeData && (
          <>
            <section className="dashboard-hero">
              <div className="dashboard-hero__copy">
                <p className="dashboard-hero__eyebrow">Performance</p>
                <h2 className="dashboard-hero__title">{activeConfig?.title || "Dashboard Overview"}</h2>
                <p className="dashboard-hero__subtitle">
                  Dashboard terpusat untuk melihat performa semua divisi perusahaan
                </p>
              </div>

              <div className="dashboard-summary-horizontal">
                {summaryCards.map((card) => (
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
          </>
        )}

        {/* IT Dashboard */}
        {activeDivision === "it" && activeData && (
          <>
            <section className="dashboard-hero">
              <div className="dashboard-hero__copy">
                <p className="dashboard-hero__eyebrow">Performance</p>
                <h2 className="dashboard-hero__title">{activeConfig?.title || "Dashboard Overview"}</h2>
                <p className="dashboard-hero__subtitle">
                  Dashboard terpusat untuk melihat performa semua divisi perusahaan
                </p>
              </div>

              <div className="dashboard-summary-horizontal">
                {summaryCards.map((card) => (
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
              <article className="panel panel--revenue">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Progress Report</p>
                    <h3 className="panel__title">IT Dashboard Details</h3>
                  </div>
                  <span className="panel__meta accent-green">Active</span>
                </div>

                <div className="revenue-grid">
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-amber">
                      <Code size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Projects Pending</p>
                      <p className="revenue-card__value">{formatNumber(activeData.progress_report?.projects_pending || 0)}</p>
                    </div>
                  </article>
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-emerald">
                      <CheckSquare size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Tickets Resolved</p>
                      <p className="revenue-card__value">{formatNumber(activeData.progress_report?.tickets_resolved || 0)}</p>
                    </div>
                  </article>
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-red">
                      <CheckSquare size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Tickets Pending</p>
                      <p className="revenue-card__value">{formatNumber(activeData.progress_report?.tickets_pending || 0)}</p>
                    </div>
                  </article>
                </div>
              </article>
            </section>
          </>
        )}

        {/* Multimedia Dashboard */}
        {activeDivision === "multimedia" && activeData && (
          <>
            <section className="dashboard-hero">
              <div className="dashboard-hero__copy">
                <p className="dashboard-hero__eyebrow">Performance</p>
                <h2 className="dashboard-hero__title">{activeConfig?.title || "Dashboard Overview"}</h2>
                <p className="dashboard-hero__subtitle">
                  Dashboard terpusat untuk melihat performa semua divisi perusahaan
                </p>
              </div>

              <div className="dashboard-summary-horizontal">
                {summaryCards.map((card) => (
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
              <article className="panel panel--revenue">
                <div className="panel__header">
                  <div>
                    <p className="panel__eyebrow">Detail Information</p>
                    <h3 className="panel__title">Multimedia Dashboard Details</h3>
                  </div>
                  <span className="panel__meta accent-green">Active</span>
                </div>

                <div className="revenue-grid">
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-purple">
                      <Palette size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Designs</p>
                      <p className="revenue-card__value">{formatNumber(activeData.konten?.designs || 0)}</p>
                    </div>
                  </article>
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-pink">
                      <Zap size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Animations</p>
                      <p className="revenue-card__value">{formatNumber(activeData.konten?.animations || 0)}</p>
                    </div>
                  </article>
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-teal">
                      <CheckSquare size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Projects Completed</p>
                      <p className="revenue-card__value">{formatNumber(activeData.insight?.projects_completed || 0)}</p>
                    </div>
                  </article>
                  <article className="revenue-card">
                    <div className="revenue-card__icon accent-indigo">
                      <TrendingUp size={24} />
                    </div>
                    <div>
                      <p className="revenue-card__label">Engagement Rate</p>
                      <p className="revenue-card__value">{activeData.insight?.engagement_rate || 0}%</p>
                    </div>
                  </article>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </Layout>
  );
}
