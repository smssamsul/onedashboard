"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

function getToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
}

function fmtRp(n) {
  return "Rp " + Number(n || 0).toLocaleString("id-ID");
}

function fmt(n) {
  return Number(n || 0).toLocaleString("id-ID");
}

/** Nilai turunan bisa null kalau penyebutnya 0 - jangan tampilkan sebagai "Rp 0". */
function fmtRpOpsional(n) {
  return n === null || n === undefined ? "-" : fmtRp(Math.round(n));
}

function fmtPersen(n) {
  return n === null || n === undefined ? "-" : `${Number(n).toLocaleString("id-ID")}%`;
}

function fmtRoas(n) {
  return n === null || n === undefined ? "-" : `${Number(n).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}x`;
}

/**
 * Warna ROAS menurut ambang yang dipakai tim:
 *   < 3      merah   - belum sehat
 *   3 - 5    kuning  - masih tipis
 *   5 - 8,9  hijau   - sehat
 *   > 8,9    oranye  - luar biasa
 */
function warnaRoas(n) {
  if (n === null || n === undefined) return "#9ca3af";
  if (n < 3) return "#dc2626";
  if (n < 5) return "#ca8a04";
  if (n <= 8.9) return "#16a34a";
  return "#ea580c";
}

const LABEL_TARGETING = {
  umur: "Umur",
  gender: "Gender",
  lokasi: "Lokasi",
  minat: "Minat",
  custom_audience: "Custom audience",
  platform: "Platform",
};

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const BULAN_SINGKAT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/**
 * Ubah nilai tanggal dari API jadi Date lokal tengah malam.
 * Menerima dua bentuk: "YYYY-MM-DD" polos (dibaca apa adanya, karena kalau
 * dilewatkan Date() string polos dianggap UTC dan bisa mundur sehari) dan
 * ISO bertimezone (dikonversi ke waktu lokal dulu baru diambil tanggalnya).
 */
function parseTanggal(nilai) {
  if (!nilai) return null;
  const teks = String(nilai);

  if (teks.includes("T")) {
    const d = new Date(teks);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  const [y, m, d] = teks.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** "27 Jul" untuk label sumbu yang sempit */
function fmtTglSingkat(nilai) {
  const d = parseTanggal(nilai);
  if (!d) return nilai ?? "";
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]}`;
}

/** "27 Jul 2026" untuk tooltip yang punya ruang lebih */
function fmtTglPanjang(nilai) {
  const d = parseTanggal(nilai);
  if (!d) return nilai ?? "";
  return `${d.getDate()} ${BULAN_SINGKAT[d.getMonth()]} ${d.getFullYear()}`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{fmtTglPanjang(label)}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: <strong>{entry.name === "Biaya" ? fmtRp(entry.value) : fmt(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

/** Angka utama di atas, metrik biaya turunannya di bawah dengan warna redup. */
function SelMetrik({ utama, bawah, labelBawah }) {
  return (
    <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
      <div style={{ fontWeight: 600 }}>{utama}</div>
      {bawah !== undefined && (
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
          {labelBawah ? `${labelBawah} ` : ""}{bawah}
        </div>
      )}
    </td>
  );
}

/** Baris detail: setting ad set + produk yang dipakai buat ambil data order. */
function BarisDetailCampaign({ campaign, jumlahKolom }) {
  const adSets = campaign.ad_sets || [];
  const produk = campaign.produk_terkait || [];

  return (
    <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
      <td colSpan={jumlahKolom} style={{ padding: "14px 18px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
          Setting Ad Set ({adSets.length})
        </div>

        {adSets.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af", margin: "0 0 12px" }}>
            Belum ada data ad set tersimpan. Jalankan Sync untuk menariknya dari Meta.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, marginBottom: 14 }}>
            {adSets.map((s) => (
              <div key={s.ad_set_id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{s.name || s.ad_set_id}</span>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: s.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: s.status === "ACTIVE" ? "#166534" : "#6b7280", whiteSpace: "nowrap" }}>
                    {s.status || "-"}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.7 }}>
                  <div>
                    <strong>Budget:</strong>{" "}
                    {s.daily_budget ? `${fmtRp(s.daily_budget)}/hari` : s.lifetime_budget ? `${fmtRp(s.lifetime_budget)} (lifetime)` : "-"}
                  </div>
                  <div><strong>Optimasi:</strong> {s.optimization_goal || "-"} {s.billing_event ? `(bayar per ${s.billing_event})` : ""}</div>
                  {(s.start_time || s.end_time) && (
                    <div><strong>Jadwal:</strong> {s.start_time || "?"} s/d {s.end_time || "tanpa batas"}</div>
                  )}
                  {Object.entries(s.targeting || {}).map(([k, v]) => (
                    <div key={k}><strong>{LABEL_TARGETING[k] || k}:</strong> {v}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
          Produk pembanding {campaign.lokasi ? `(lokasi: ${campaign.lokasi})` : ""}
        </div>
        {produk.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
            {campaign.lokasi
              ? `Tidak ada produk aktif dengan keyword lokasi "${campaign.lokasi}". Kolom order, buyer, dan ROAS jadi kosong.`
              : "Nama campaign tidak menyebut kota, jadi tidak bisa dipasangkan ke produk. Kolom order, buyer, dan ROAS jadi kosong."}
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {produk.map((p) => (
              <span key={p.id} style={{ fontSize: 11, background: "#eef2ff", color: "#3730a3", padding: "3px 10px", borderRadius: 999 }}>
                {p.nama || `Produk #${p.id}`}
              </span>
            ))}
          </div>
        )}

        {campaign.lokasi_dipakai_bersama && (
          <p style={{ fontSize: 11, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "6px 10px", marginTop: 10, marginBottom: 0 }}>
            Lokasi <strong>{campaign.lokasi}</strong> juga dipakai campaign lain. Order dan buyer kota ini dihitung di setiap campaign tersebut, jadi jangan dijumlahkan antar baris.
          </p>
        )}
      </td>
    </tr>
  );
}

/**
 * Konten performa Meta Ads - dipakai bareng oleh halaman
 * Marketing (/marketing/meta-ads) dan halaman laporan Sales (/sales/meta-ads-report).
 * Baca dari endpoint performance yang sama; tombol Sync hanya di sisi Marketing.
 */
export default function MetaAdsOverviewContent({
  connectAccountHref = "/marketing/meta-ads/accounts",
  showConnectButton = true,
  showSyncButton = true,
}) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connected, setConnected] = useState(true);
  const [daily, setDaily] = useState([]);
  const [totals, setTotals] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [startDate, setStartDate] = useState(todayMinus(29));
  const [endDate, setEndDate] = useState(todayMinus(0));
  const [tampilkanNonAktif, setTampilkanNonAktif] = useState(false);
  const [barisTerbuka, setBarisTerbuka] = useState({});
  const [ppnPersen, setPpnPersen] = useState(11);
  const [error, setError] = useState("");

  const toggleBaris = useCallback((id) => {
    setBarisTerbuka((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = `start_date=${startDate}&end_date=${endDate}&status=${tampilkanNonAktif ? "all" : "active"}`;

      const [overviewRes, campaignsRes] = await Promise.all([
        fetch(`/api/sales/meta-ads/performance/overview?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        }),
        fetch(`/api/sales/meta-ads/performance/campaigns?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        }),
      ]);

      const overviewJson = await overviewRes.json();
      const campaignsJson = await campaignsRes.json();

      setConnected(overviewJson.connected !== false);
      setDaily((overviewJson.data?.daily || []).map((d) => ({
        ...d,
        Biaya: Number(d.spend || 0),
        Leads: Number(d.leads || 0),
        Contact: Number(d.contact || 0),
        Purchase: Number(d.conversions || 0),
      })));
      setTotals(overviewJson.data?.totals || null);
      setCampaigns(campaignsJson.data || []);
      setPpnPersen(campaignsJson.meta?.ppn_persen ?? overviewJson.data?.ppn_persen ?? 11);
    } catch (e) {
      console.error("[META ADS] Gagal memuat data:", e);
      setError("Gagal memuat data performa Meta Ads.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, tampilkanNonAktif]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Total baris tabel. Sengaja dihitung dari `campaigns` (baris yang benar-benar
   * tampil), bukan dari `totals` milik endpoint overview — supaya totalnya selalu
   * cocok dengan yang dijumlah manual di layar, termasuk saat filter "hanya aktif"
   * sedang menyala.
   *
   * Metrik turunan (CPM/CPL/CPO/CPB/rasio/ROAS) dihitung ulang dari angka total,
   * BUKAN dirata-rata per baris. Rata-rata dari rasio itu menyesatkan: campaign
   * bermodal Rp 700 ribu akan menarik rata-rata sekuat campaign bermodal Rp 4 juta.
   */
  const totalTabel = useMemo(() => {
    if (!campaigns.length) return null;

    const jml = (kunci) => campaigns.reduce((t, c) => t + Number(c[kunci] || 0), 0);
    const bagi = (a, b) => (b > 0 ? a / b : null);
    const bulat2 = (n) => (n === null ? null : Math.round(n * 100) / 100);

    const spendPpn = jml("spend_ppn");
    const impressions = jml("impressions");
    const leads = jml("leads");
    const purchase = jml("purchase");
    const order = jml("order");
    const buyer = jml("buyer");
    const revenue = jml("revenue");

    return {
      jumlahCampaign: campaigns.length,
      spend: jml("spend"),
      spend_ppn: spendPpn,
      impressions,
      leads,
      contact: jml("contact"),
      purchase,
      order,
      buyer,
      revenue,
      cpm: impressions > 0 ? (spendPpn / impressions) * 1000 : null,
      cpl: bagi(spendPpn, leads),
      cost_per_purchase: bagi(spendPpn, purchase),
      cpo: bagi(spendPpn, order),
      cpb: bagi(spendPpn, buyer),
      rasio_lead_to_purchase: bulat2(leads > 0 ? (purchase / leads) * 100 : null),
      rasio_order_to_buyer: bulat2(order > 0 ? (buyer / order) * 100 : null),
      roas: bagi(revenue, spendPpn),
    };
  }, [campaigns]);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    const t = toast.loading("Menarik data terbaru dari Meta...");
    try {
      const res = await fetch(`/api/sales/meta-ads/performance/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        body: JSON.stringify({ days: 30 }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message || "Sync selesai.", { id: t });
        await load();
      } else {
        toast.error(json.message || "Sync gagal.", { id: t });
      }
    } catch (e) {
      console.error("[META ADS] Gagal sync:", e);
      toast.error("Gagal menghubungi server untuk sync.", { id: t });
    } finally {
      setSyncing(false);
    }
  }, [syncing, load]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Meta Ads - Overview</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
          <span style={{ fontSize: 13, color: "#6b7280" }}>s/d</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#4b5563", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={tampilkanNonAktif}
              onChange={(e) => setTampilkanNonAktif(e.target.checked)}
              style={{ cursor: "pointer" }}
            />
            Tampilkan campaign non-aktif
          </label>
          {showSyncButton && (
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Tarik data terbaru dari Meta sekarang"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 6, border: "1px solid #F1A124", background: syncing ? "#fff9f0" : "#F1A124",
                color: syncing ? "#F1A124" : "#fff", fontSize: 13, fontWeight: 600,
                cursor: syncing ? "not-allowed" : "pointer",
              }}
            >
              <RefreshCw size={15} style={syncing ? { animation: "metaSpin 1s linear infinite" } : undefined} />
              {syncing ? "Menyinkron..." : "Sync"}
            </button>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes metaSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {error && <div style={{ color: "#dc2626", marginBottom: 16 }}>{error}</div>}

      {!loading && !connected ? (
        <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 48, textAlign: "center" }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Belum ada akun Meta Ads yang terhubung</h3>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: showConnectButton ? 16 : 0 }}>
            {showConnectButton
              ? "Sambungkan akun Meta Ads dulu di halaman Setting Akun supaya data performa bisa mulai ditarik."
              : "Tim Marketing perlu menyambungkan akun Meta Ads dulu supaya data performa bisa mulai ditarik."}
          </p>
          {showConnectButton && (
            <a href={connectAccountHref} style={{ display: "inline-block", padding: "8px 16px", background: "#111827", color: "#fff", borderRadius: 8, fontSize: 14, textDecoration: "none" }}>
              Buka Setting Akun
            </a>
          )}
        </div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Biaya", value: fmtRp(totals?.spend), color: "#111827" },
              { label: `Biaya + PPN ${ppnPersen}%`, value: fmtRp(Math.round(Number(totals?.spend || 0) * (1 + ppnPersen / 100))), color: "#111827" },
              { label: "Impresi", value: fmt(totals?.impressions), color: "#7c3aed" },
              { label: "Leads", value: fmt(totals?.leads), color: "#2563eb" },
              { label: "Contact", value: fmt(totals?.contact), color: "#0d9488" },
              { label: "Purchase", value: fmt(totals?.conversions), color: "#16a34a" },
            ].map((tile) => (
              <div key={tile.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{tile.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: tile.color }}>{loading ? "..." : tile.value}</div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Tren Harian</h3>
            {daily.length === 0 && !loading ? (
              <p style={{ color: "#9ca3af", fontSize: 13, textAlign: "center", padding: 40 }}>Belum ada data untuk rentang tanggal ini.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" fontSize={12} tickFormatter={fmtTglSingkat} />
                  <YAxis yAxisId="left" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Biaya" fill="#111827" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="Leads" stroke="#2563eb" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="Contact" stroke="#0d9488" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="Purchase" stroke="#16a34a" strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Campaign table */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                Performa per Campaign {tampilkanNonAktif ? "(semua status)" : "(hanya aktif)"}
              </h3>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Klik baris untuk melihat setting ad set</span>
            </div>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 14px" }}>
              Semua biaya per hasil (CPM, CPL, cost/purchase, CPO, CPB) dan ROAS dihitung dari biaya termasuk PPN {ppnPersen}%.
              Order, buyer, dan ROAS berasal dari order internal. Pencocokan utama memakai <b>utm_campaign</b> pada order;
              order yang tidak membawa UTM baru dicocokkan lewat keyword lokasi pada nama campaign dan nama produk.
              Buyer &amp; revenue mencakup pembayaran <b>Paid</b> maupun <b>Waiting Approval</b>, jadi sebagian kecil masih bisa turun kalau finance menolak.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1320 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", color: "#374151" }}>
                    <th style={{ padding: "8px 12px" }}>Campaign</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Biaya</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Biaya + PPN {ppnPersen}%</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Impresi<br /><span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>CPM</span></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Leads<br /><span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>CPL</span></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Contact</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Purchase<br /><span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>Cost/purchase</span></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Order<br /><span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>CPO</span></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Buyer<br /><span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>CPB</span></th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Lead &rarr;<br />Purchase</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Order &rarr;<br />Buyer</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Revenue<br /><span style={{ fontWeight: 400, fontSize: 11, color: "#6b7280" }}>ROAS</span></th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                        {loading
                          ? "Memuat..."
                          : tampilkanNonAktif
                            ? "Belum ada campaign tersimpan."
                            : "Tidak ada campaign aktif. Centang \"Tampilkan campaign non-aktif\" untuk melihat sisanya."}
                      </td>
                    </tr>
                  ) : (
                    <>
                    {totalTabel && (
                      <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", fontWeight: 600 }}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 700 }}>TOTAL</div>
                          <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                            {totalTabel.jumlahCampaign} campaign{tampilkanNonAktif ? "" : " aktif"}
                          </div>
                        </td>
                        <td style={{ padding: "10px 12px" }} />
                        <SelMetrik utama={fmtRp(totalTabel.spend)} />
                        <SelMetrik utama={fmtRp(totalTabel.spend_ppn)} />
                        <SelMetrik utama={fmt(totalTabel.impressions)} bawah={fmtRpOpsional(totalTabel.cpm)} />
                        <SelMetrik utama={fmt(totalTabel.leads)} bawah={fmtRpOpsional(totalTabel.cpl)} />
                        <SelMetrik utama={fmt(totalTabel.contact)} />
                        <SelMetrik utama={fmt(totalTabel.purchase)} bawah={fmtRpOpsional(totalTabel.cost_per_purchase)} />
                        <SelMetrik utama={fmt(totalTabel.order)} bawah={fmtRpOpsional(totalTabel.cpo)} />
                        <SelMetrik utama={fmt(totalTabel.buyer)} bawah={fmtRpOpsional(totalTabel.cpb)} />
                        <SelMetrik utama={fmtPersen(totalTabel.rasio_lead_to_purchase)} />
                        <SelMetrik utama={fmtPersen(totalTabel.rasio_order_to_buyer)} />
                        <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 700 }}>{fmtRp(totalTabel.revenue)}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: warnaRoas(totalTabel.roas), marginTop: 2 }}>{fmtRoas(totalTabel.roas)}</div>
                        </td>
                      </tr>
                    )}
                    {campaigns.map((c) => {
                      const terbuka = !!barisTerbuka[c.id];
                      return (
                        <Fragment key={c.id}>
                          <tr
                            onClick={() => toggleBaris(c.id)}
                            style={{ borderBottom: terbuka ? "none" : "1px solid #f3f4f6", cursor: "pointer" }}
                          >
                            <td style={{ padding: "8px 12px", minWidth: 240 }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                {terbuka ? <ChevronDown size={15} style={{ marginTop: 2, flexShrink: 0, color: "#6b7280" }} /> : <ChevronRight size={15} style={{ marginTop: 2, flexShrink: 0, color: "#9ca3af" }} />}
                                <div>
                                  <div style={{ fontWeight: 500 }}>{c.name || c.campaign_id}</div>
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: 10, color: "#6b7280" }}>{(c.ad_sets || []).length} ad set</span>
                                    {c.lokasi ? (
                                      <span style={{ fontSize: 10, background: "#eef2ff", color: "#3730a3", padding: "1px 7px", borderRadius: 999 }}>{c.lokasi}</span>
                                    ) : (
                                      <span style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280", padding: "1px 7px", borderRadius: 999 }} title="Nama campaign tidak menyebut kota. Order tetap terhitung kalau ada yang membawa utm_campaign cocok.">
                                        tanpa lokasi
                                      </span>
                                    )}
                                    {/* Asal angka order dibedakan: lewat UTM itu bukti langsung,
                                        lewat lokasi cuma kesamaan nama kota. */}
                                    {c.order_dari_utm > 0 && (
                                      <span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", padding: "1px 7px", borderRadius: 999 }} title="Order yang membawa utm_campaign cocok dengan nama campaign ini - bukti langsung">
                                        {c.order_dari_utm} via UTM
                                      </span>
                                    )}
                                    {c.order_dari_lokasi > 0 && (
                                      <span style={{ fontSize: 10, background: "#f3f4f6", color: "#6b7280", padding: "1px 7px", borderRadius: 999 }} title="Order tanpa UTM, dicocokkan lewat kesamaan nama kota pada campaign dan produk - perkiraan, bukan bukti">
                                        {c.order_dari_lokasi} via lokasi
                                      </span>
                                    )}
                                    {c.lokasi_dipakai_bersama && (
                                      <span style={{ fontSize: 10, background: "#fffbeb", color: "#b45309", padding: "1px 7px", borderRadius: 999 }} title="Lokasi ini dipakai lebih dari satu campaign - order & buyer terhitung di tiap campaign">
                                        lokasi dipakai bersama
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: c.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: c.status === "ACTIVE" ? "#166534" : "#6b7280" }}>
                                {c.status || "-"}
                              </span>
                            </td>
                            <SelMetrik utama={fmtRp(c.spend)} />
                            <SelMetrik utama={fmtRp(c.spend_ppn)} />
                            <SelMetrik utama={fmt(c.impressions)} bawah={fmtRpOpsional(c.cpm)} />
                            <SelMetrik utama={fmt(c.leads)} bawah={fmtRpOpsional(c.cpl)} />
                            <SelMetrik utama={fmt(c.contact)} />
                            <SelMetrik utama={fmt(c.purchase)} bawah={fmtRpOpsional(c.cost_per_purchase)} />
                            <SelMetrik utama={fmt(c.order)} bawah={fmtRpOpsional(c.cpo)} />
                            <SelMetrik utama={fmt(c.buyer)} bawah={fmtRpOpsional(c.cpb)} />
                            <SelMetrik utama={fmtPersen(c.rasio_lead_to_purchase)} />
                            <SelMetrik utama={fmtPersen(c.rasio_order_to_buyer)} />
                            <td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                              <div style={{ fontWeight: 600 }}>{fmtRp(c.revenue)}</div>
                              {/* ROAS jadi baris bawah, tapi tetap tebal supaya warnanya
                                  terbaca di ukuran 11px - ini angka yang dipakai menilai. */}
                              <div style={{ fontSize: 11, fontWeight: 700, color: warnaRoas(c.roas), marginTop: 2 }}>{fmtRoas(c.roas)}</div>
                            </td>
                          </tr>
                          {terbuka && <BarisDetailCampaign campaign={c} jumlahKolom={13} />}
                        </Fragment>
                      );
                    })}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
