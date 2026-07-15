"use client";

import "@/styles/sales/dashboard-premium.css";
import "@/styles/finance/dashboard-premium.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import AttendanceCard from "@/components/AttendanceCard";
import { useCallback, useEffect, useState } from "react";
import {
  Server,
  Code,
  Database,
  Shield,
} from "lucide-react";

export default function ITDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dummy data untuk IT dashboard
  const DUMMY_DATA = {
    overview: {
      systems_active: 12,
      systems_monitored: 8,
      tickets_resolved: 45,
      tickets_pending: 7,
    },
    metrics: {
      uptime: 99.8,
      servers: 8,
      databases: 5,
      security_alerts: 2,
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
      title: "Active Systems",
      value: overview?.systems_active?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Server size={24} />,
      color: "accent-blue",
    },
    {
      title: "Systems Monitored",
      value: overview?.systems_monitored?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Code size={24} />,
      color: "accent-purple",
    },
    {
      title: "Tickets Resolved",
      value: overview?.tickets_resolved?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Database size={24} />,
      color: "accent-green",
    },
    {
      title: "Tickets Pending",
      value: overview?.tickets_pending?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Shield size={24} />,
      color: "accent-orange",
    },
  ];

  const metricCards = [
    {
      title: "System Uptime",
      value: metrics?.uptime ? `${metrics.uptime}%` : (loading ? "…" : "0%"),
      icon: <Server size={24} />,
      color: "accent-green",
    },
    {
      title: "Servers",
      value: metrics?.servers ? formatNumber(metrics.servers) : (loading ? "…" : "0"),
      icon: <Code size={24} />,
      color: "accent-blue",
    },
    {
      title: "Databases",
      value: metrics?.databases ? formatNumber(metrics.databases) : (loading ? "…" : "0"),
      icon: <Database size={24} />,
      color: "accent-purple",
    },
    {
      title: "Security Alerts",
      value: metrics?.security_alerts ? formatNumber(metrics.security_alerts) : (loading ? "…" : "0"),
      icon: <Shield size={24} />,
      color: "accent-orange",
    },
  ];

  return (
    <Layout title="Dashboard | IT Panel" aboveContent={<GreetingBanner />}>
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
                <p className="panel__eyebrow">IT Infrastructure</p>
                <h3 className="panel__title">System Overview</h3>
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
