"use client";

import { Fragment, useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, ChevronRight, ChevronDown, Sparkles } from "lucide-react";
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

/** Warna & label urgensi temuan Analisa AI - sama seperti skema warnaRoas(). */
function warnaUrgensi(urgensi) {
  if (urgensi === "kritis") return "#dc2626";
  if (urgensi === "perhatian") return "#ca8a04";
  if (urgensi === "baik") return "#16a34a";
  return "#9ca3af";
}

function labelUrgensi(urgensi) {
  if (urgensi === "kritis") return "Kritis";
  if (urgensi === "perhatian") return "Perhatian";
  if (urgensi === "baik") return "Baik";
  return urgensi || "-";
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

/** Baris detail: breakdown "Performa Konten" untuk satu produk (muncul waktu baris Produk di-expand). */
/**
 * Baris breakdown konten, dirender LANGSUNG sebagai <tr> tambahan di tabel
 * "Performa per Produk" yang sama (bukan tabel terpisah di dalam baris
 * produk) - waktu baris produk di-klik/expand, baris-baris ini muncul
 * persis di bawahnya pakai kolom yang sama (SelMetrik), cuma kegeser ke
 * posisi Messaging karena field konten memang tidak dipecah channel.
 */
function BarisKontenProduk({ produk }) {
  const konten = produk.konten || [];

  if (konten.length === 0) {
    return (
      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
        <td colSpan={13} style={{ padding: "10px 12px 10px 40px", fontSize: 12, color: "#9ca3af" }}>
          Belum ada data iklan/order untuk produk ini di rentang tanggal ini.
        </td>
      </tr>
    );
  }

  return (
    <>
      {konten.map((k, i) => (
        <tr
          key={k.versi ?? `tanpa-kode-${i}`}
          style={{ background: "#f9fafb", borderBottom: i === konten.length - 1 ? "1px solid #e5e7eb" : "1px solid #f3f4f6" }}
        >
          <td style={{ padding: "6px 12px 6px 40px", minWidth: 200 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {k.thumbnail ? (
                // thumbnail = path relatif di storage backend (lihat
                // MetaAdsService::simpanThumbnailLokal()), bukan URL Meta
                // langsung - URL Meta bertanda tangan dan kedaluwarsa dalam
                // hitungan minggu. Lewat proxy /api/image yang sudah dipakai
                // di tempat lain supaya tidak kena masalah domain/CORS.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/image?path=${encodeURIComponent(k.thumbnail)}`}
                  alt=""
                  width={32}
                  height={32}
                  style={{ borderRadius: 6, objectFit: "cover", flexShrink: 0, border: "1px solid #e5e7eb" }}
                />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: 6, background: "#e5e7eb", flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#374151" }}>{k.label}</div>
                <div style={{ fontSize: 10, color: "#9ca3af" }}>
                  {k.jumlah_iklan} iklan{k.contoh_nama_iklan?.length ? ` · ${k.contoh_nama_iklan.join(", ")}` : ""}
                </div>
              </div>
            </div>
          </td>
          <SelMetrik utama={fmtRp(k.spend)} />
          <SelMetrik utama={fmt(k.hasil)} bawah={fmtRpOpsional(k.cost_per_hasil)} />
          <SelMetrik utama={fmt(k.order)} />
          <SelMetrik utama={fmt(k.buyer)} />
          <SelMetrik utama={fmtRp(k.omzet)} />
          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: warnaRoas(k.roas) }}>
            {fmtRoas(k.roas)}
          </td>
          <td style={{ padding: "8px 12px" }} />
          <td style={{ padding: "8px 12px" }} />
          <td style={{ padding: "8px 12px" }} />
          <td style={{ padding: "8px 12px" }} />
          <td style={{ padding: "8px 12px" }} />
          <td style={{ padding: "8px 12px" }} />
        </tr>
      ))}
    </>
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
  const [produkPerforma, setProdukPerforma] = useState([]);
  const [startDate, setStartDate] = useState(todayMinus(29));
  const [endDate, setEndDate] = useState(todayMinus(0));
  const [tampilkanNonAktif, setTampilkanNonAktif] = useState(false);
  const [barisProdukTerbuka, setBarisProdukTerbuka] = useState({});
  const [ppnPersen, setPpnPersen] = useState(11);
  const [error, setError] = useState("");
  const [analisaLoading, setAnalisaLoading] = useState(false);
  const [analisaData, setAnalisaData] = useState(null);
  const [analisaCached, setAnalisaCached] = useState(false);
  const [analisaError, setAnalisaError] = useState("");

  const toggleBarisProduk = useCallback((id) => {
    setBarisProdukTerbuka((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = `start_date=${startDate}&end_date=${endDate}&status=${tampilkanNonAktif ? "all" : "active"}`;

      const [overviewRes, campaignsRes, produkRes] = await Promise.all([
        fetch(`/api/sales/meta-ads/performance/overview?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        }),
        fetch(`/api/sales/meta-ads/performance/campaigns?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        }),
        fetch(`/api/sales/meta-ads/performance/produk?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        }),
      ]);

      const overviewJson = await overviewRes.json();
      const campaignsJson = await campaignsRes.json();
      const produkJson = await produkRes.json();

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
      setProdukPerforma(produkJson.data || []);
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
   * KPI tiles di bagian atas overview. "Result" belum punya satu angka
   * tunggal di data kita (beda dengan Ads Manager) - jadi tetap dipecah jadi
   * tiga hasil nyata yang sudah dilacak terpisah (Leads, Contact, Purchase),
   * masing-masing dengan cost-per-nya sendiri sebagai baris kecil di bawah,
   * lalu Biaya, Biaya+PPN, CPC, CPM, Link Klik, CTR, Impresi.
   *
   * CPC/CPM/CTR dihitung ulang dari total spend/impressions/clicks - BUKAN
   * dirata-rata per hari - dengan alasan yang sama seperti totalTabel di bawah.
   */
  const kpiTiles = useMemo(() => {
    const bagi = (a, b) => (b > 0 ? a / b : null);
    const bulat2 = (n) => (n === null ? null : Math.round(n * 100) / 100);

    const spend = Number(totals?.spend || 0);
    const spendPpn = spend * (1 + ppnPersen / 100);
    const impressions = Number(totals?.impressions || 0);
    const clicks = Number(totals?.clicks || 0);
    const linkClicks = Number(totals?.link_clicks || 0);
    const leads = Number(totals?.leads || 0);
    const contact = Number(totals?.contact || 0);
    const purchase = Number(totals?.conversions || 0);
    const ctr = impressions > 0 ? bulat2((clicks / impressions) * 100) : null;

    return [
      { label: "Leads", value: fmt(leads), sub: leads > 0 ? `${fmtRpOpsional(bagi(spendPpn, leads))} / leads` : null, color: "#2563eb" },
      { label: "Contact", value: fmt(contact), sub: contact > 0 ? `${fmtRpOpsional(bagi(spendPpn, contact))} / contact` : null, color: "#0d9488" },
      { label: "Purchase", value: fmt(purchase), sub: purchase > 0 ? `${fmtRpOpsional(bagi(spendPpn, purchase))} / purchase` : null, color: "#16a34a" },
      { label: "Biaya", value: fmtRp(spend), color: "#111827" },
      { label: `Biaya + PPN ${ppnPersen}%`, value: fmtRp(Math.round(spendPpn)), color: "#111827" },
      { label: "CPC", value: fmtRpOpsional(bagi(spendPpn, clicks)), color: "#b45309" },
      { label: "CPM", value: fmtRpOpsional(bagi(spendPpn * 1000, impressions)), color: "#b45309" },
      { label: "Link Klik", value: fmt(linkClicks), color: "#7c3aed" },
      { label: "CTR", value: fmtPersen(ctr), color: "#7c3aed" },
      { label: "Impresi", value: fmt(impressions), color: "#7c3aed" },
    ];
  }, [totals, ppnPersen]);

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
      rasio_lead_to_order: bulat2(leads > 0 ? (order / leads) * 100 : null),
      rasio_order_to_buyer: bulat2(order > 0 ? (buyer / order) * 100 : null),
      roas: bagi(revenue, spendPpn),
    };
  }, [campaigns]);

  /**
   * Total tabel "Performa per Produk", dihitung ulang per channel dari angka
   * total (bukan rata-rata per baris) - alasan sama seperti totalTabel di atas.
   */
  const totalProduk = useMemo(() => {
    if (!produkPerforma.length) return null;

    const bagi = (a, b) => (b > 0 ? a / b : null);

    const jumlahChannel = (channel) => {
      const jml = (kunci) => produkPerforma.reduce((t, p) => t + Number(p[channel]?.[kunci] || 0), 0);
      const spendPpn = jml("spend_ppn");
      const hasil = jml("hasil");
      const order = jml("order");
      const buyer = jml("buyer");
      const omzet = jml("omzet");

      return {
        spend: jml("spend"),
        spend_ppn: spendPpn,
        hasil,
        cost_per_hasil: bagi(spendPpn, hasil),
        order,
        cpo: bagi(spendPpn, order),
        buyer,
        omzet,
        roas: bagi(omzet, spendPpn),
      };
    };

    return {
      jumlahProduk: produkPerforma.length,
      jumlahIklan: produkPerforma.reduce((t, p) => t + Number(p.jumlah_iklan || 0), 0),
      messaging: jumlahChannel("messaging"),
      landing_page: jumlahChannel("landing_page"),
    };
  }, [produkPerforma]);

  /**
   * Sync jalan di background (queue) di backend - request POST ini cuma
   * men-trigger, lalu kita polling status-nya. Meta API bisa lambat, jadi
   * kalau ditunggu synchronous di 1 request bisa keburu timeout di proxy
   * sebelum sempat selesai.
   */
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

      if (res.status === 409) {
        toast.loading(json.message || "Sync sebelumnya masih berjalan...", { id: t });
      } else if (!res.ok || !json.success) {
        toast.error(json.message || "Sync gagal.", { id: t });
        setSyncing(false);
        return;
      }

      // Polling status tiap 3 detik, maksimal ~5 menit.
      const maxAttempts = 100;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusRes = await fetch(`/api/sales/meta-ads/performance/sync/status`, {
          headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        });
        const statusJson = await statusRes.json();

        if (statusJson.status === "success") {
          toast.success(statusJson.message || "Sync selesai.", { id: t });
          await load();
          break;
        } else if (statusJson.status === "failed") {
          toast.error(statusJson.message || "Sync gagal.", { id: t });
          break;
        } else if (attempt === maxAttempts - 1) {
          toast.error("Sync belum selesai setelah beberapa menit, cek lagi nanti.", { id: t });
        }
        // status "pending"/"running" - lanjut polling
      }
    } catch (e) {
      console.error("[META ADS] Gagal sync:", e);
      toast.error("Gagal menghubungi server untuk sync.", { id: t });
    } finally {
      setSyncing(false);
    }
  }, [syncing, load]);

  /**
   * Tombol manual, bukan otomatis saat halaman dibuka - lihat
   * docs/rencana-analisa-ai-meta-ads.md soal alasan biaya. Backend meng-cache
   * hasil 1 jam per kombinasi filter, jadi klik ulang dengan filter sama biasanya instan.
   */
  const handleAnalisa = useCallback(async () => {
    if (analisaLoading) return;
    setAnalisaLoading(true);
    setAnalisaError("");
    try {
      const res = await fetch(`/api/sales/meta-ads/performance/analisa`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          status: tampilkanNonAktif ? "all" : "active",
        }),
      });
      const json = await res.json();

      if (json.success) {
        setAnalisaData(json.data);
        setAnalisaCached(!!json.cached);
      } else {
        setAnalisaData(null);
        setAnalisaError(json.message || "Analisa AI gagal, coba lagi.");
      }
    } catch (e) {
      console.error("[META ADS] Gagal analisa AI:", e);
      setAnalisaData(null);
      setAnalisaError("Gagal menghubungi server untuk analisa AI.");
    } finally {
      setAnalisaLoading(false);
    }
  }, [analisaLoading, startDate, endDate, tampilkanNonAktif]);

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
            {kpiTiles.map((tile) => (
              <div key={tile.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{tile.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: tile.color }}>{loading ? "..." : tile.value}</div>
                {!loading && tile.sub && (
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{tile.sub}</div>
                )}
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

          {/* Produk table: performa dipecah per channel (Messaging vs Landing Page). Klik baris untuk lihat breakdown per Konten. */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20, marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>
                Performa per Produk {tampilkanNonAktif ? "(semua status)" : "(hanya campaign aktif)"}
              </h3>
            </div>
            <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 14px" }}>
              <b>Messaging (Chat WA)</b>: campaign yang namanya mengandung &quot;CTWA&quot; (biaya, hasil dari Contact), digabung order
              dengan sumber <b>sales_quick_order</b> (order, bayar, omzet) — biasanya order lanjutan chat WhatsApp.
              <b> Landing Page</b>: campaign lainnya (biaya, hasil dari Leads), digabung order dengan sumber <b>website</b> — customer
              checkout sendiri di halaman produk. Order dari sumber non-iklan tidak dihitung. Klik baris produk untuk lihat
              breakdown per <b>Konten</b>. ROAS memakai biaya termasuk PPN {ppnPersen}%.
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "#374151" }}>
                    <th rowSpan={2} style={{ padding: "8px 12px", borderBottom: "1px solid #e5e7eb", verticalAlign: "bottom" }}>Produk</th>
                    <th colSpan={6} style={{ padding: "6px 12px", textAlign: "center", background: "#eef2ff", color: "#3730a3", borderBottom: "1px solid #e0e7ff", borderLeft: "1px solid #e5e7eb" }}>
                      Messaging (Chat WA)
                    </th>
                    <th colSpan={6} style={{ padding: "6px 12px", textAlign: "center", background: "#ecfdf5", color: "#065f46", borderBottom: "1px solid #d1fae5", borderLeft: "1px solid #e5e7eb" }}>
                      Landing Page
                    </th>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "right", color: "#6b7280", fontSize: 11 }}>
                    <th style={{ padding: "6px 12px", borderLeft: "1px solid #e5e7eb" }}>Biaya</th>
                    <th style={{ padding: "6px 12px" }}>Hasil</th>
                    <th style={{ padding: "6px 12px" }}>Order</th>
                    <th style={{ padding: "6px 12px" }}>Bayar</th>
                    <th style={{ padding: "6px 12px" }}>Omzet</th>
                    <th style={{ padding: "6px 12px" }}>ROAS</th>
                    <th style={{ padding: "6px 12px", borderLeft: "1px solid #e5e7eb" }}>Biaya</th>
                    <th style={{ padding: "6px 12px" }}>Hasil</th>
                    <th style={{ padding: "6px 12px" }}>Order</th>
                    <th style={{ padding: "6px 12px" }}>Bayar</th>
                    <th style={{ padding: "6px 12px" }}>Omzet</th>
                    <th style={{ padding: "6px 12px" }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {produkPerforma.length === 0 ? (
                    <tr>
                      <td colSpan={13} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                        {loading ? "Memuat..." : "Belum ada data performa produk untuk rentang tanggal ini."}
                      </td>
                    </tr>
                  ) : (
                    <>
                      {totalProduk && (
                        <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb", fontWeight: 600 }}>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ fontWeight: 700 }}>TOTAL</div>
                            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 2 }}>
                              {totalProduk.jumlahProduk} produk &middot; {totalProduk.jumlahIklan} iklan
                            </div>
                          </td>
                          <SelMetrik utama={fmtRp(totalProduk.messaging.spend)} />
                          <SelMetrik utama={fmt(totalProduk.messaging.hasil)} bawah={fmtRpOpsional(totalProduk.messaging.cost_per_hasil)} />
                          <SelMetrik utama={fmt(totalProduk.messaging.order)} />
                          <SelMetrik utama={fmt(totalProduk.messaging.buyer)} />
                          <SelMetrik utama={fmtRp(totalProduk.messaging.omzet)} />
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: warnaRoas(totalProduk.messaging.roas) }}>
                            {fmtRoas(totalProduk.messaging.roas)}
                          </td>
                          <SelMetrik utama={fmtRp(totalProduk.landing_page.spend)} />
                          <SelMetrik utama={fmt(totalProduk.landing_page.hasil)} bawah={fmtRpOpsional(totalProduk.landing_page.cost_per_hasil)} />
                          <SelMetrik utama={fmt(totalProduk.landing_page.order)} />
                          <SelMetrik utama={fmt(totalProduk.landing_page.buyer)} />
                          <SelMetrik utama={fmtRp(totalProduk.landing_page.omzet)} />
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: warnaRoas(totalProduk.landing_page.roas) }}>
                            {fmtRoas(totalProduk.landing_page.roas)}
                          </td>
                        </tr>
                      )}
                      {produkPerforma.map((p) => {
                        const terbuka = !!barisProdukTerbuka[p.produk_id];
                        return (
                          <Fragment key={p.produk_id}>
                            <tr
                              onClick={() => toggleBarisProduk(p.produk_id)}
                              style={{ borderBottom: terbuka ? "none" : "1px solid #f3f4f6", cursor: "pointer" }}
                            >
                              <td style={{ padding: "8px 12px", minWidth: 200 }}>
                                <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                  {terbuka ? <ChevronDown size={15} style={{ marginTop: 2, flexShrink: 0, color: "#6b7280" }} /> : <ChevronRight size={15} style={{ marginTop: 2, flexShrink: 0, color: "#9ca3af" }} />}
                                  <div>
                                    <div style={{ fontWeight: 500 }}>{p.produk_nama}</div>
                                    {p.jumlah_iklan > 0 && (
                                      <span style={{ fontSize: 10, color: "#6b7280" }}>{p.jumlah_iklan} iklan</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <SelMetrik utama={fmtRp(p.messaging.spend)} />
                              <SelMetrik utama={fmt(p.messaging.hasil)} bawah={fmtRpOpsional(p.messaging.cost_per_hasil)} />
                              <SelMetrik utama={fmt(p.messaging.order)} />
                              <SelMetrik utama={fmt(p.messaging.buyer)} />
                              <SelMetrik utama={fmtRp(p.messaging.omzet)} />
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: warnaRoas(p.messaging.roas) }}>
                                {fmtRoas(p.messaging.roas)}
                              </td>
                              <SelMetrik utama={fmtRp(p.landing_page.spend)} />
                              <SelMetrik utama={fmt(p.landing_page.hasil)} bawah={fmtRpOpsional(p.landing_page.cost_per_hasil)} />
                              <SelMetrik utama={fmt(p.landing_page.order)} />
                              <SelMetrik utama={fmt(p.landing_page.buyer)} />
                              <SelMetrik utama={fmtRp(p.landing_page.omzet)} />
                              <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: warnaRoas(p.landing_page.roas) }}>
                                {fmtRoas(p.landing_page.roas)}
                              </td>
                            </tr>
                            {terbuka && <BarisKontenProduk produk={p} />}
                          </Fragment>
                        );
                      })}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            {/* Analisa AI - tombol manual, lihat handleAnalisa() untuk alasan */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: (analisaData || analisaError) ? 14 : 0 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Analisa AI</h3>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
                    Ringkasan &amp; rekomendasi dari Claude berdasarkan data tabel di atas.
                  </p>
                </div>
                <button
                  onClick={handleAnalisa}
                  disabled={analisaLoading || campaigns.length === 0}
                  title="Kirim ringkasan angka campaign ke AI untuk dianalisa"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                    borderRadius: 6, border: "1px solid #4338ca", background: analisaLoading ? "#eef2ff" : "#4338ca",
                    color: analisaLoading ? "#4338ca" : "#fff", fontSize: 13, fontWeight: 600,
                    cursor: (analisaLoading || campaigns.length === 0) ? "not-allowed" : "pointer",
                    opacity: campaigns.length === 0 ? 0.5 : 1,
                  }}
                >
                  <Sparkles size={15} style={analisaLoading ? { animation: "metaSpin 1s linear infinite" } : undefined} />
                  {analisaLoading ? "Menganalisa..." : "Analisa dengan AI"}
                </button>
              </div>

              {analisaError && (
                <div style={{ color: "#dc2626", fontSize: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>
                  {analisaError}
                </div>
              )}

              {analisaData && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>Ringkasan</span>
                      {analisaCached && (
                        <span style={{ fontSize: 10, color: "#6b7280", background: "#f3f4f6", padding: "1px 8px", borderRadius: 999 }} title="Hasil dari cache 1 jam, bukan panggilan AI baru">
                          hasil tersimpan
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>{analisaData.ringkasan}</p>
                  </div>

                  {(analisaData.temuan || []).length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Temuan per Campaign</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                        {analisaData.temuan.map((t, i) => (
                          <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderLeft: `4px solid ${warnaUrgensi(t.urgensi)}`, borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{t.campaign}</span>
                              <span style={{ fontSize: 10, fontWeight: 700, color: warnaUrgensi(t.urgensi), whiteSpace: "nowrap" }}>{labelUrgensi(t.urgensi)}</span>
                            </div>
                            <p style={{ fontSize: 12, color: "#4b5563", margin: 0, lineHeight: 1.5 }}>{t.catatan}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(analisaData.rekomendasi || []).length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Rekomendasi</div>
                      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#374151", lineHeight: 1.8 }}>
                        {analisaData.rekomendasi.map((r, i) => <li key={i}>{r}</li>)}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
