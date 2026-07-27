"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
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

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 12px", fontSize: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, margin: "2px 0" }}>
          {entry.name}: <strong>{entry.name === "Biaya" ? fmtRp(entry.value) : fmt(entry.value)}</strong>
        </p>
      ))}
    </div>
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
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = `start_date=${startDate}&end_date=${endDate}`;

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
    } catch (e) {
      console.error("[META ADS] Gagal memuat data:", e);
      setError("Gagal memuat data performa Meta Ads.");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

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
                  <XAxis dataKey="date" fontSize={12} />
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
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Performa per Campaign</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px" }}>Campaign</th>
                    <th style={{ padding: "8px 12px" }}>Status</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Biaya</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Impresi</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Leads</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Contact</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Purchase</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>
                        {loading ? "Memuat..." : "Belum ada campaign tersimpan."}
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px" }}>{c.name || c.campaign_id}</td>
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: c.status === "ACTIVE" ? "#dcfce7" : "#f3f4f6", color: c.status === "ACTIVE" ? "#166534" : "#6b7280" }}>
                            {c.status || "-"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmtRp(c.spend)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(c.impressions)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(c.leads)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(c.contact)}</td>
                        <td style={{ padding: "8px 12px", textAlign: "right" }}>{fmt(c.conversions)}</td>
                      </tr>
                    ))
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
