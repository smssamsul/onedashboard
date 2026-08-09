"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import { API_ENDPOINTS } from "@/config/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import styles from "./ai-usage.module.css";

function fmt(n) {
  return Number(n || 0).toLocaleString("id-ID");
}
function fmtUsd(n) {
  return "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}
function labelFitur(fitur) {
  const map = {
    analisa_meta_ads: "Analisa AI Meta Ads",
    ai_sales_chat: "AI Sales Chat",
    ai_simulasi: "Simulasi AI",
    sentiment_chat: "Sentiment Chat",
    intent_classifier: "Intent Classifier",
    woowa_off_topic_check: "Cek Relevansi WA (Woowa)",
  };
  return map[fitur] || fitur;
}
function labelModel(model) {
  const map = {
    "claude-sonnet-5": "Claude Sonnet 5",
    "claude-haiku-4-5-20251001": "Claude Haiku 4.5",
  };
  return map[model] || model;
}
function defaultDari() {
  const d = new Date();
  d.setDate(d.getDate() - 29);
  return d.toISOString().slice(0, 10);
}
function defaultSampai() {
  return new Date().toISOString().slice(0, 10);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip}>
      <p className={styles.tooltipLabel}>{label}</p>
      <p style={{ margin: "2px 0", fontSize: "0.8rem" }}>
        Biaya: <strong>{fmtUsd(payload[0].value)}</strong>
      </p>
    </div>
  );
}

export default function AiUsageDashboardPage() {
  const [dari, setDari] = useState(defaultDari());
  const [sampai, setSampai] = useState(defaultSampai());
  const [data, setData] = useState(null);
  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [halaman, setHalaman] = useState(1);

  const fetchRingkasan = useCallback(async (d, s) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`${API_ENDPOINTS.admin.aiUsageRingkasan}?dari=${d}&sampai=${s}`, { disableToast: true });
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.message || "Gagal memuat ringkasan");
      }
    } catch {
      setError("Terjadi kesalahan koneksi ke server");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLog = useCallback(async (d, s, page) => {
    try {
      const res = await api(`${API_ENDPOINTS.admin.aiUsageLog}?dari=${d}&sampai=${s}&page=${page}`, { disableToast: true });
      if (res.success) setLog(res.data);
    } catch {
      // Diamkan - tabel log cuma pelengkap, tidak perlu banner error terpisah
    }
  }, []);

  useEffect(() => { fetchRingkasan(dari, sampai); fetchLog(dari, sampai, 1); setHalaman(1); }, []); // eslint-disable-line

  function terapkanFilter() {
    fetchRingkasan(dari, sampai);
    fetchLog(dari, sampai, 1);
    setHalaman(1);
  }

  function pindahHalaman(page) {
    setHalaman(page);
    fetchLog(dari, sampai, page);
  }

  const chartData = (data?.per_hari || []).map((r) => ({
    tanggal: r.tanggal?.slice(5) ?? r.tanggal,
    biaya: Number(r.biaya_usd),
  }));

  return (
    <Layout title="Penggunaan AI">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Penggunaan &amp; Biaya AI</h1>
            <p className={styles.pageSubtitle}>
              Estimasi token dan biaya semua fitur yang memanggil Claude (Analisa Meta Ads, AI Sales, dll)
            </p>
          </div>
        </div>

        <div className={styles.filterRow}>
          <label className={styles.filterLabel}>
            Dari
            <input type="date" className={styles.filterInput} value={dari} onChange={(e) => setDari(e.target.value)} />
          </label>
          <label className={styles.filterLabel}>
            Sampai
            <input type="date" className={styles.filterInput} value={sampai} onChange={(e) => setSampai(e.target.value)} />
          </label>
          <button className={styles.filterBtn} onClick={terapkanFilter}>Terapkan</button>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading && (
          <div className={styles.skeletonGrid}>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!loading && data && (
          <>
            <div className={styles.grid4}>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Estimasi Biaya</span>
                <div className={styles.cardValue}>{fmtUsd(data.total?.total_biaya_usd)}</div>
                <span className={styles.cardDesc}>{dari} s/d {sampai}</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Jumlah Panggilan</span>
                <div className={styles.cardValue}>{fmt(data.total?.jumlah_panggilan)}</div>
                <span className={styles.cardDesc}>{fmt(data.total?.jumlah_gagal)} gagal</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Input Token</span>
                <div className={styles.cardValue}>{fmt(data.total?.total_input_tokens)}</div>
                <span className={styles.cardDesc}>token masuk</span>
              </div>
              <div className={styles.card}>
                <span className={styles.cardLabel}>Output Token</span>
                <div className={styles.cardValue}>{fmt(data.total?.total_output_tokens)}</div>
                <span className={styles.cardDesc}>termasuk thinking</span>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h4 className={styles.chartTitle}>Biaya per Hari</h4>
              {chartData.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtUsd(v)} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="biaya" fill="rgba(99,102,241,0.75)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyState}>Tidak ada data di rentang ini</div>
              )}
            </div>

            <div className={styles.tableCard}>
              <h4 className={styles.chartTitle}>Breakdown per Fitur</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Fitur</th><th>Panggilan</th><th>Total Token</th><th>Biaya</th></tr>
                  </thead>
                  <tbody>
                    {data.per_fitur?.length ? (
                      data.per_fitur.map((row, i) => (
                        <tr key={i}>
                          <td><strong>{labelFitur(row.fitur)}</strong></td>
                          <td>{fmt(row.jumlah_panggilan)}</td>
                          <td>{fmt(row.total_tokens)}</td>
                          <td className={styles.cBiaya}>{fmtUsd(row.biaya_usd)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={4} className={styles.tdEmpty}>Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.tableCard}>
              <h4 className={styles.chartTitle}>Breakdown per Model</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Model</th><th>Panggilan</th><th>Input Token</th><th>Output Token</th><th>Biaya</th></tr>
                  </thead>
                  <tbody>
                    {data.per_model?.length ? (
                      data.per_model.map((row, i) => (
                        <tr key={i}>
                          <td><code className={styles.code}>{labelModel(row.model)}</code></td>
                          <td>{fmt(row.jumlah_panggilan)}</td>
                          <td>{fmt(row.input_tokens)}</td>
                          <td>{fmt(row.output_tokens)}</td>
                          <td className={styles.cBiaya}>{fmtUsd(row.biaya_usd)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5} className={styles.tdEmpty}>Tidak ada data</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.tableCard}>
              <h4 className={styles.chartTitle}>Log Terbaru</h4>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr><th>Waktu</th><th>Fitur</th><th>Model</th><th>Token (in/out)</th><th>Biaya</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {log?.data?.length ? (
                      log.data.map((row) => (
                        <tr key={row.id}>
                          <td>{row.created_at?.replace("T", " ").slice(0, 19)}</td>
                          <td>{labelFitur(row.fitur)}</td>
                          <td><code className={styles.code}>{labelModel(row.model)}</code></td>
                          <td>{fmt(row.input_tokens)} / {fmt(row.output_tokens)}</td>
                          <td className={styles.cBiaya}>{fmtUsd(row.estimasi_biaya_usd)}</td>
                          <td>{row.sukses ? <span className={styles.badgeOk}>sukses</span> : <span className={styles.badgeGagal}>gagal</span>}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} className={styles.tdEmpty}>Tidak ada log</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {log && log.last_page > 1 && (
                <div className={styles.pagination}>
                  <button className={styles.pageBtn} disabled={halaman <= 1} onClick={() => pindahHalaman(halaman - 1)}>Sebelumnya</button>
                  <span className={styles.pageInfo}>Halaman {log.current_page} dari {log.last_page}</span>
                  <button className={styles.pageBtn} disabled={halaman >= log.last_page} onClick={() => pindahHalaman(halaman + 1)}>Berikutnya</button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
