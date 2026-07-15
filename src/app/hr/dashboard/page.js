"use client";

import { useEffect, useState } from "react";
import "@/styles/hr-dashboard.css";
import Layout from "@/components/Layout";
import AttendanceCard from "@/components/AttendanceCard";
import { motion } from "framer-motion";
import {
  Users,
  UserMinus,
  ClipboardCheck,
  CalendarDays,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid } from "recharts";
import { getApiUrl } from "@/config/api";
import MonthlyAttendanceTable from "@/components/MonthlyAttendanceTable";

export default function HrDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    statistik: {
      total_karyawan: 0,
      karyawan_aktif: 0,
      karyawan_resign: 0,
    },
    absensi: {
      hadir_hari_ini: 0,
      terlambat_hari_ini: 0,
      persentase_kehadiran: 0,
    },
    cuti: {
      cuti_aktif_hari_ini: 0,
      cuti_pending: 0,
    },
    chart_absensi: [],
    karyawan_terbaru: [],
    cuti_terbaru: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const res = await fetch(getApiUrl("hr/dashboard"), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (res.status === 401) {
          window.location.href = "/login";
          return;
        }

        const json = await res.json();
        if (!json.success) {
          setError(json.message || "Gagal memuat data dashboard");
          return;
        }

        setStats((prev) => ({
          ...prev,
          ...json.data,
        }));
      } catch (e) {
        console.error("Error loading HR dashboard:", e);
        setError("Terjadi kesalahan saat memuat data dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const summaryCards = [
    {
      title: "Total Karyawan",
      value: stats.statistik.total_karyawan,
      icon: <Users size={22} />,
      tone: "accent-indigo",
    },
    {
      title: "Karyawan Aktif",
      value: stats.statistik.karyawan_aktif,
      icon: <ClipboardCheck size={22} />,
      tone: "accent-emerald",
    },
    {
      title: "Sedang Cuti (hari ini)",
      value: stats.cuti.cuti_aktif_hari_ini,
      icon: <CalendarDays size={22} />,
      tone: "accent-blue",
    },
    {
      title: "Resign (total)",
      value: stats.statistik.karyawan_resign,
      icon: <UserMinus size={22} />,
      tone: "accent-rose",
    },
  ];

  return (
    <Layout title="Dashboard | Human Resources">
      <div className="hr-dashboard-shell">
        <AttendanceCard />

        <section className="hr-hero">
          <motion.div
            className="hr-hero__copy"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="hr-hero__eyebrow">HR Overview</p>
            <h2 className="hr-hero__title">Ringkasan Data Karyawan</h2>
            <span className="hr-hero__meta">
              Menampilkan data riil dari tabel karyawan, absensi, dan cuti
            </span>
          </motion.div>

          <motion.div
            className="hr-summary-grid"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {summaryCards.map((card) => (
              <article className="hr-summary-card" key={card.title}>
                <div className={`hr-summary-card__icon ${card.tone}`}>{card.icon}</div>
                <div>
                  <p className="hr-summary-card__label">{card.title}</p>
                  <p className="hr-summary-card__value">{loading ? "-" : card.value}</p>
                </div>
              </article>
            ))}
          </motion.div>
        </section>

        {error && (
          <div className="hr-error-banner">
            {error}
          </div>
        )}


        <MonthlyAttendanceTable />
      </div>
    </Layout>
  );
}

