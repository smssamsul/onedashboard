"use client";

import "@/styles/sales/dashboard-premium.css";
import "@/styles/finance/dashboard-premium.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import AttendanceCard from "@/components/AttendanceCard";
import { useCallback, useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Target,
  BarChart3,
} from "lucide-react";

export default function MarketingDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dummy data untuk marketing dashboard
  const DUMMY_DATA = {
    overview: {
      campaigns_active: 5,
      campaigns_total: 12,
      leads_generated: 245,
      conversion_rate: 12.5,
    },
    metrics: {
      reach: 125000,
      engagement: 8500,
      impressions: 450000,
      clicks: 12500,
    },
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
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
  const metrics = data?.metrics;

  const formatNumber = (value) => {
    if (!value) return "0";
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const summaryCards = [
    {
      title: "Active Campaigns",
      value: overview?.campaigns_active?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Target size={24} />,
      color: "accent-blue",
    },
    {
      title: "Total Campaigns",
      value: overview?.campaigns_total?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <BarChart3 size={24} />,
      color: "accent-purple",
    },
    {
      title: "Leads Generated",
      value: overview?.leads_generated?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Users size={24} />,
      color: "accent-green",
    },
    {
      title: "Conversion Rate",
      value: overview?.conversion_rate ? `${overview.conversion_rate}%` : (loading ? "…" : "0%"),
      icon: <TrendingUp size={24} />,
      color: "accent-orange",
    },
  ];

  const metricCards = [
    {
      title: "Reach",
      value: metrics?.reach ? formatNumber(metrics.reach) : (loading ? "…" : "0"),
      icon: <Users size={24} />,
      color: "accent-blue",
    },
    {
      title: "Engagement",
      value: metrics?.engagement ? formatNumber(metrics.engagement) : (loading ? "…" : "0"),
      icon: <TrendingUp size={24} />,
      color: "accent-green",
    },
    {
      title: "Impressions",
      value: metrics?.impressions ? formatNumber(metrics.impressions) : (loading ? "…" : "0"),
      icon: <BarChart3 size={24} />,
      color: "accent-purple",
    },
    {
      title: "Clicks",
      value: metrics?.clicks ? formatNumber(metrics.clicks) : (loading ? "…" : "0"),
      icon: <Target size={24} />,
      color: "accent-orange",
    },
  ];

  return (
    <Layout title="Dashboard | Marketing Panel" aboveContent={<GreetingBanner />}>
      <div className="dashboard-shell">
        {error && <div className="dashboard-alert">{error}</div>}
        <AttendanceCard />

        <section className="financial-snapshot-section">
          <div className="financial-grid">
            {summaryCards.map((card) => (
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
          <article className="panel panel--summary">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Marketing Metrics</p>
                <h3 className="panel__title">Performance Overview</h3>
              </div>
            </div>

            <div className="order-summary-list">
              {metricCards.map((card) => (
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
