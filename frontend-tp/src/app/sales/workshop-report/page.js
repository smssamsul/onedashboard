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

const TIER_LABEL = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  reseat: "Reseat",
};

function formatRp(n) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
}

function formatAngka(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

function formatTanggal(s) {
  if (!s) return "-";
  const d = new Date(s + "T00:00:00");
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function WorkshopReportPage() {
  const router = useRouter();
  const now = new Date();
  const [tahunTersedia, setTahunTersedia] = useState([now.getFullYear()]);
  const [tahun, setTahun] = useState(now.getFullYear());
  const [bulan, setBulan] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTahun, setLoadingTahun] = useState(true);
  const [error, setError] = useState(null);

  function getToken() {
    return typeof window !== "undefined" ? localStorage.getItem("token") : "";
  }

  const fetchPeserta = useCallback(
    async (tahunValue, bulanValue) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/sales/workshop-report/peserta?tahun=${tahunValue}&bulan=${bulanValue}`, {
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
    async function fetchTahun() {
      setLoadingTahun(true);
      try {
        const res = await fetch(`/api/sales/workshop-report/tahun-tersedia`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        });
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const json = await res.json();
        if (json.success && json.data?.length) {
          setTahunTersedia(json.data);
          if (!json.data.includes(tahun)) {
            setTahun(json.data[0]);
            fetchPeserta(json.data[0], bulan);
            setLoadingTahun(false);
            return;
          }
        }
      } catch {
        // biarkan default tahun sekarang kalau gagal
      } finally {
        setLoadingTahun(false);
      }
      fetchPeserta(tahun, bulan);
    }
    fetchTahun();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTahunChange(value) {
    const t = Number(value);
    setTahun(t);
    fetchPeserta(t, bulan);
  }

  function handleBulanChange(value) {
    const b = Number(value);
    setBulan(b);
    fetchPeserta(tahun, b);
  }

  const ringkasan = data?.ringkasan;
  const peserta = data?.peserta || [];

  return (
    <Layout title="Rekap Workshop">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Rekap Workshop</h1>
            <p className={styles.pageSubtitle}>Pilih tahun & bulan untuk melihat daftar peserta Workshop dan detailnya</p>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Tahun</span>
            <select className={styles.yearSelect} value={tahun} onChange={(e) => handleTahunChange(e.target.value)} disabled={loadingTahun}>
              {tahunTersedia.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span className={styles.filterLabel}>Bulan</span>
            <select className={styles.yearSelect} value={bulan} onChange={(e) => handleBulanChange(e.target.value)}>
              {NAMA_BULAN.map((nama, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {nama}
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
                <div className={styles.summaryLabel}>
                  Total {NAMA_BULAN[bulan - 1]} {tahun}
                </div>
                <div className={styles.summaryValue}>{formatRp(ringkasan?.total_omzet)}</div>
                <div className={styles.summarySub}>{formatAngka(ringkasan?.total_peserta)} peserta</div>
              </div>
              {TIER_LIST.map((t) => (
                <div key={t.key} className={styles.summaryCard}>
                  <div className={styles.summaryLabel}>{t.label}</div>
                  <div className={styles.summaryValue} data-tier={t.key}>
                    {formatAngka(ringkasan?.tier?.[t.key]?.count)}
                  </div>
                  <div className={styles.summarySub}>{formatRp(ringkasan?.tier?.[t.key]?.omzet)}</div>
                </div>
              ))}
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Nama</th>
                    <th>WA</th>
                    <th>Tier</th>
                    <th>Produk</th>
                    <th>Harga</th>
                    <th>Sumber</th>
                  </tr>
                </thead>
                <tbody>
                  {peserta.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyState}>
                        Tidak ada peserta Workshop di {NAMA_BULAN[bulan - 1]} {tahun}
                      </td>
                    </tr>
                  ) : (
                    peserta.map((p) => (
                      <tr key={p.order_id}>
                        <td className={styles.leftCell}>{formatTanggal(p.tanggal)}</td>
                        <td className={styles.leftCell}>{p.nama}</td>
                        <td className={styles.leftCell}>{p.wa || "-"}</td>
                        <td className={styles.leftCell}>
                          {p.tier ? (
                            <span className={styles.tierBadge} data-tier={p.tier}>
                              {TIER_LABEL[p.tier]}
                            </span>
                          ) : (
                            <span className={styles.tierBadge}>Lainnya</span>
                          )}
                        </td>
                        <td className={styles.leftCell}>{p.produk_nama || "-"}</td>
                        <td>{formatRp(p.harga)}</td>
                        <td className={styles.leftCell}>{p.sumber || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {peserta.length > 0 && (
                  <tfoot>
                    <tr className={styles.totalRow}>
                      <td colSpan={5} className={styles.leftCell}>
                        Total {formatAngka(ringkasan?.total_peserta)} peserta
                      </td>
                      <td>{formatRp(ringkasan?.total_omzet)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
