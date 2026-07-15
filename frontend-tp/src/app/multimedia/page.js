"use client";

import "@/styles/sales/dashboard-premium.css";
import "@/styles/finance/dashboard-premium.css";
import Layout from "@/components/Layout";
import GreetingBanner from "@/components/GreetingBanner";
import AttendanceCard from "@/components/AttendanceCard";
import { useCallback, useEffect, useState } from "react";
import {
  Film,
  Image,
  Video,
  Palette,
} from "lucide-react";

export default function MultimediaDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dummy data untuk multimedia dashboard
  const DUMMY_DATA = {
    overview: {
      projects_active: 8,
      projects_completed: 24,
      assets_created: 156,
      videos_produced: 12,
    },
    metrics: {
      images: 89,
      videos: 12,
      designs: 45,
      animations: 10,
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
      title: "Active Projects",
      value: overview?.projects_active?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Film size={24} />,
      color: "accent-purple",
    },
    {
      title: "Completed Projects",
      value: overview?.projects_completed?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Video size={24} />,
      color: "accent-blue",
    },
    {
      title: "Assets Created",
      value: overview?.assets_created?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Image size={24} />,
      color: "accent-green",
    },
    {
      title: "Videos Produced",
      value: overview?.videos_produced?.toLocaleString("id-ID") ?? (loading ? "…" : "0"),
      icon: <Palette size={24} />,
      color: "accent-orange",
    },
  ];

  const metricCards = [
    {
      title: "Images",
      value: metrics?.images ? formatNumber(metrics.images) : (loading ? "…" : "0"),
      icon: <Image size={24} />,
      color: "accent-blue",
    },
    {
      title: "Videos",
      value: metrics?.videos ? formatNumber(metrics.videos) : (loading ? "…" : "0"),
      icon: <Video size={24} />,
      color: "accent-purple",
    },
    {
      title: "Designs",
      value: metrics?.designs ? formatNumber(metrics.designs) : (loading ? "…" : "0"),
      icon: <Palette size={24} />,
      color: "accent-green",
    },
    {
      title: "Animations",
      value: metrics?.animations ? formatNumber(metrics.animations) : (loading ? "…" : "0"),
      icon: <Film size={24} />,
      color: "accent-orange",
    },
  ];

  return (
    <Layout title="Dashboard | Multimedia Panel" aboveContent={<GreetingBanner />}>
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
                <p className="panel__eyebrow">Multimedia Assets</p>
                <h3 className="panel__title">Production Overview</h3>
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
