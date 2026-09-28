"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Layout from "@/components/Layout";
import styles from "./scoReport.module.css";

const OPSI_RENTANG = [
  { value: "7", label: "7 Hari Terakhir" },
  { value: "14", label: "14 Hari Terakhir" },
  { value: "30", label: "30 Hari Terakhir" },
  { value: "90", label: "90 Hari Terakhir" },
  { value: "bulan_ini", label: "Bulan Ini" },
  { value: "bulan_lalu", label: "Bulan Lalu" },
  { value: "custom", label: "Custom" },
];

// Kolom tabel: key = field dari API, sortable semua.
const KOLOM = [
  { key: "biaya", label: "Biaya", fmt: "rp" },
  { key: "impresi", label: "Impresi", fmt: "n" },
  { key: "cpm", label: "CPM", fmt: "rp" },
  { key: "leads", label: "Leads", fmt: "n" },
  { key: "cpl", label: "Biaya/Lead", fmt: "rp" },
  { key: "order", label: "Order", fmt: "n" },
  { key: "closing", label: "Closing", fmt: "n" },
  { key: "closing_rate", label: "Lead→Closing", fmt: "pct" },
  { key: "biaya_per_closing", label: "Biaya/Closing", fmt: "rp" },
  { key: "omzet", label: "Omzet", fmt: "rp" },
  { key: "roas", label: "ROAS", fmt: "roas" },
];

function tglLokal(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hitungRentang(opsi, customDari, customSampai) {
  const now = new Date();
  const hariIni = tglLokal(now);
  if (opsi === "custom") return { dari: customDari || hariIni, sampai: customSampai || hariIni };
  if (opsi === "bulan_ini") return { dari: tglLokal(new Date(now.getFullYear(), now.getMonth(), 1)), sampai: hariIni };
  if (opsi === "bulan_lalu") {
    return {
      dari: tglLokal(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      sampai: tglLokal(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  const d = new Date();
  d.setDate(d.getDate() - (Number(opsi) - 1));
  return { dari: tglLokal(d), sampai: hariIni };
}

const fmtRp = (n) =>
  n === null || n === undefined
    ? "–"
    : new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);
const fmtN = (n) => (n === null || n === undefined ? "–" : Number(n || 0).toLocaleString("id-ID"));
const fmtPct = (n) => (n === null || n === undefined ? "–" : `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`);
const fmtRoas = (n) => (n === null || n === undefined ? "–" : `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 2 })}x`);

// Ambang ROAS sama dengan yang dipakai Analisa AI Meta Ads.
function levelRoas(r) {
  if (r === null || r === undefined) return "none";
  if (r < 3) return "buruk";
  if (r < 5) return "tipis";
  if (r < 9) return "sehat";
  return "baik";
}

function formatNilai(kolom, v) {
  if (kolom.fmt === "rp") return fmtRp(v);
  if (kolom.fmt === "pct") return fmtPct(v);
  if (kolom.fmt === "roas") return <span className={styles.roas} data-level={levelRoas(v)}>{fmtRoas(v)}</span>;
  return fmtN(v);
}

function formatTgl(s) {
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function ScoReportPage() {
  const [opsi, setOpsi] = useState("30");
  const [customDari, setCustomDari] = useState("");
  const [customSampai, setCustomSampai] = useState("");
  const [status, setStatus] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sort, setSort] = useState({ key: "biaya", dir: "desc" });

  const rentang = useMemo(() => hitungRentang(opsi, customDari, customSampai), [opsi, customDari, customSampai]);

  const fetchData = useCallback(async () => {
    if (opsi === "custom" && (!customDari || !customSampai)) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ start_date: rentang.dari, end_date: rentang.sampai, status });
      const res = await fetch(`/api/sales/meta-ads/performance/sco?${params}`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Gagal memuat data");
      setData(json);
    } catch (e) {
      setError(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [rentang, status, opsi, customDari, customSampai]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const baris = useMemo(() => {
    const list = [...(data?.data || [])];
    const { key, dir } = sort;
    list.sort((a, b) => {
      const av = a[key], bv = b[key];
      // Nilai kosong (mis. ROAS tanpa biaya) selalu di bawah.
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (key === "produk_nama") return dir === "asc" ? String(av).localeCompare(bv) : String(bv).localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });
    return list;
  }, [data, sort]);

  const klikSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "produk_nama" ? "asc" : "desc" }));

  const total = data?.total;
  const belum = data?.belum_terpetakan;
  const tanpaIklan = data?.total_tanpa_iklan;

  return (
    <Layout title="Dashboard SCO">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h2 className={styles.pageTitle}>Dashboard SCO</h2>
            <p className={styles.pageSubtitle}>
              Biaya &amp; impresi iklan Meta, leads, dan closing per produk
              {data?.meta?.range && ` · ${formatTgl(data.meta.range.start)} – ${formatTgl(data.meta.range.end)}`}
            </p>
          </div>
          <div className={styles.filterGroup}>
            <select id="sco-rentang" className={styles.select} value={opsi} onChange={(e) => setOpsi(e.target.value)} aria-label="Rentang tanggal">
              {OPSI_RENTANG.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {opsi === "custom" && (
              <>
                <input id="sco-dari" type="date" className={styles.select} value={customDari} onChange={(e) => setCustomDari(e.target.value)} aria-label="Dari tanggal" />
                <span className={styles.sep}>–</span>
                <input id="sco-sampai" type="date" className={styles.select} value={customSampai} onChange={(e) => setCustomSampai(e.target.value)} aria-label="Sampai tanggal" />
              </>
            )}
            <select id="sco-status" className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status campaign">
              <option value="all">Semua campaign</option>
              <option value="active">Hanya campaign aktif</option>
            </select>
          </div>
        </div>

        {data && data.connected === false && (
          <div className={styles.notice}>Belum ada akun Meta Ads yang terhubung, jadi biaya &amp; impresi masih kosong.</div>
        )}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading && !data ? (
          <div className={styles.loadingState}>Memuat...</div>
        ) : total ? (
          <div className={loading ? styles.memuat : undefined}>
            <div className={styles.summaryRow}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Biaya iklan</div>
                <div className={styles.summaryValue}>{fmtRp(total.biaya)}</div>
                <div className={styles.summarySub}>termasuk PPN {data.meta?.ppn_persen}%</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Impresi</div>
                <div className={styles.summaryValue}>{fmtN(total.impresi)}</div>
                <div className={styles.summarySub}>CPM {fmtRp(total.cpm)}</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Leads</div>
                <div className={styles.summaryValue}>{fmtN(total.leads)}</div>
                <div className={styles.summarySub}>{fmtRp(total.cpl)} / lead</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Closing</div>
                <div className={styles.summaryValue}>{fmtN(total.closing)}</div>
                <div className={styles.summarySub}>{fmtRp(total.biaya_per_closing)} / closing · {fmtPct(total.closing_rate)} dari leads</div>
              </div>
              <div className={styles.summaryCard}>
                <div className={styles.summaryLabel}>Omzet closing</div>
                <div className={styles.summaryValue}>{fmtRp(total.omzet)}</div>
                <div className={styles.summarySub}>
                  ROAS <span className={styles.roas} data-level={levelRoas(total.roas)}>{fmtRoas(total.roas)}</span>
                </div>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>
                      <button type="button" className={styles.sortBtn} onClick={() => klikSort("produk_nama")} data-aktif={sort.key === "produk_nama" ? sort.dir : undefined}>
                        Produk
                      </button>
                    </th>
                    {KOLOM.map((k) => (
                      <th key={k.key}>
                        <button type="button" className={styles.sortBtn} onClick={() => klikSort(k.key)} data-aktif={sort.key === k.key ? sort.dir : undefined}>
                          {k.label}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {baris.length === 0 ? (
                    <tr>
                      <td colSpan={KOLOM.length + 1} className={styles.emptyState}>Tidak ada biaya iklan maupun order di rentang ini.</td>
                    </tr>
                  ) : (
                    baris.map((b) => (
                      <tr key={b.produk_id} className={b.ada_iklan ? undefined : styles.tanpaIklan}>
                        <td className={styles.produkCell}>
                          <div className={styles.produkNama}>{b.produk_nama}</div>
                          <div className={styles.produkSub} title={b.campaigns.join("\n")}>
                            {b.ada_iklan ? `Campaign: ${b.campaigns.join(", ")}` : "Tanpa iklan Meta di rentang ini"}
                          </div>
                        </td>
                        {KOLOM.map((k) => (
                          <td key={k.key}>{formatNilai(k, b[k.key])}</td>
                        ))}
                      </tr>
                    ))
                  )}
                  {belum && belum.biaya > 0 && (
                    <tr className={styles.belumRow}>
                      <td className={styles.produkCell}>
                        <div className={styles.produkNama}>Belum terpetakan ke produk</div>
                        <div className={styles.produkSub} title={belum.campaigns.join("\n")}>Campaign: {belum.campaigns.join(", ")}</div>
                      </td>
                      <td>{fmtRp(belum.biaya)}</td>
                      <td>{fmtN(belum.impresi)}</td>
                      <td>{fmtRp(belum.cpm)}</td>
                      <td>{fmtN(belum.leads)}</td>
                      <td>{fmtRp(belum.cpl)}</td>
                      <td colSpan={6}></td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className={styles.totalRow}>
                    <td>Total produk beriklan</td>
                    {KOLOM.map((k) => (
                      <td key={k.key}>{formatNilai(k, total[k.key])}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>

            {tanpaIklan && tanpaIklan.jumlah_produk > 0 && (
              <p className={styles.infoTanpaIklan}>
                Di luar total: {fmtN(tanpaIklan.jumlah_produk)} produk tanpa iklan Meta (baris abu-abu) menghasilkan{" "}
                {fmtN(tanpaIklan.closing)} closing dengan omzet {fmtRp(tanpaIklan.omzet)}.
              </p>
            )}

            <details className={styles.catatan}>
              <summary>Cara angka dihitung</summary>
              <ul>
                <li><b>Biaya, impresi, leads</b> dari data Meta Ads (disinkron tiap jam). Biaya sudah termasuk PPN {data.meta?.ppn_persen}%.</li>
                <li><b>Leads</b> = hasil iklan: <i>Contact</i> (chat WA) untuk campaign CTWA, <i>Leads</i> untuk campaign landing page.</li>
                <li><b>Closing</b> = order produk itu yang statusnya Paid atau Waiting Approval, dari semua sumber order, berdasarkan tanggal order dibuat. <b>Order</b> = semua order yang masuk.</li>
                <li>Campaign dicocokkan ke produk dari namanya (mis. &quot;Jakarta/CTWA&quot; → Seminar Ternak Properti Jakarta). Kalau cocok ke beberapa produk, biayanya dibagi sesuai porsi order tiap produk (persentase di daftar campaign).</li>
                <li>Campaign yang tidak cocok ke produk mana pun tampil di baris &quot;Belum terpetakan&quot; dan tetap ikut di total biaya.</li>
                <li>Warna ROAS: merah di bawah 3x, kuning 3–5x, hijau 5x ke atas.</li>
              </ul>
            </details>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
