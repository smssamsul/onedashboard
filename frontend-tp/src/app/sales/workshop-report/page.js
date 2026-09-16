"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import styles from "./workshopReport.module.css";

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const TIER_LIST = [
  { key: "platinum", label: "Platinum" },
  { key: "gold", label: "Gold" },
  { key: "silver", label: "Silver" },
  { key: "reseat", label: "Reseat" },
];

function formatRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
}

function formatAngka(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

export default function WorkshopReportPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tahun, setTahun] = useState(new Date().getFullYear());

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("token") : "";
  }

  const fetchData = useCallback(
    async (tahunValue) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sales/workshop-report?tahun=${tahunValue}`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.message || "Gagal memuat rekap workshop");
        }
      } catch {
        setError("Terjadi kesalahan koneksi ke server");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchData(tahun);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTahunChange(value) {
    const t = Number(value);
    setTahun(t);
    fetchData(t);
  }

  const bulanan = data?.bulanan || [];
  const total = data?.total_tahun;
  const tahunTersedia = data?.tahun_tersedia?.length ? data.tahun_tersedia : [String(tahun)];

  return (
    <Layout title="Rekap Workshop">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Rekap Workshop</h1>
            <p className={styles.pageSubtitle}>Omzet Workshop per bulan, dipecah per tier Platinum/Gold/Silver/Reseat</p>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Tahun</span>
            <select className={styles.yearSelect} value={tahun} onChange={(e) => handleTahunChange(e.target.value)}>
              {tahunTersedia.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.loadingState}>Memuat...</div>
        ) : (
          <>
            <div className={styles.summaryRow}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Total Omzet {tahun}</div>
                <div className={styles.summaryValue}>{formatRp(total?.omzet)}</div>
                <div className={styles.summarySub}>{formatAngka(total?.peserta)} peserta</div>
              </div>
              {TIER_LIST.map((t) => (
                <div key={t.key} className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>{t.label}</div>
                  <div className={styles.summaryValue} data-tier={t.key}>
                    {formatAngka(total?.tier?.[t.key]?.count)}
                  </div>
                  <div className={styles.summarySub}>{formatRp(total?.tier?.[t.key]?.omzet)}</div>
                </div>
              ))}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Peserta</th>
                    <th>Omzet</th>
                    {TIER_LIST.map((t) => (
                      <th key={t.key}>{t.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulanan.map((b) => (
                    <tr key={b.bulan} className={b.total_peserta === 0 ? styles.emptyRow : ""}>
                      <td className={styles.bulanCell}>{NAMA_BULAN[b.bulan - 1]}</td>
                      <td>{formatAngka(b.total_peserta)}</td>
                      <td>{formatRp(b.total_omzet)}</td>
                      {TIER_LIST.map((t) => (
                        <td key={t.key}>
                          {b.tier[t.key].count > 0 ? `${b.tier[t.key].count} · ${formatRp(b.tier[t.key].omzet)}` : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <td>Total {tahun}</td>
                    <td>{formatAngka(total?.peserta)}</td>
                    <td>{formatRp(total?.omzet)}</td>
                    {TIER_LIST.map((t) => (
                      <td key={t.key}>
                        {formatAngka(total?.tier?.[t.key]?.count)} · {formatRp(total?.tier?.[t.key]?.omzet)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
