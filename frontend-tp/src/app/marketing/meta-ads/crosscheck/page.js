"use client";

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { AlertTriangle } from "lucide-react";

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

export default function MetaAdsCrosscheckPage() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(true);
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState("");
  const [startDate, setStartDate] = useState(todayMinus(29));
  const [endDate, setEndDate] = useState(todayMinus(0));
  const [eventName, setEventName] = useState("Purchase");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = `start_date=${startDate}&end_date=${endDate}&event_name=${encodeURIComponent(eventName)}`;
      const res = await fetch(`/api/sales/meta-ads/crosscheck?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}`, Accept: "application/json" },
      });
      const json = await res.json();
      setConnected(json.connected !== false);
      setRows(json.data || []);
      setNote(json.meta?.note || "");
    } catch (e) {
      console.error("[META ADS] Gagal memuat crosscheck:", e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, eventName]);

  useEffect(() => {
    load();
  }, [load]);

  const totalOur = rows.reduce((s, r) => s + r.our_count, 0);
  const totalMeta = rows.reduce((s, r) => s + r.meta_count, 0);
  const flaggedDays = rows.filter((r) => r.flagged).length;

  return (
    <Layout title="Meta Ads - Pixel Crosscheck">
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pixel &amp; CAPI Crosscheck</h1>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, width: 120 }} placeholder="Purchase" />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
            <span style={{ fontSize: 13, color: "#6b7280" }}>s/d</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
          </div>
        </div>

        {/* Catatan attribution window - tampil jelas, bukan tersembunyi di tooltip */}
        <div style={{ display: "flex", gap: 10, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <AlertTriangle size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: 13, color: "#1e3a8a", margin: 0, lineHeight: 1.5 }}>
            {note || "Rekonsiliasi ini agregat harian, bukan pencocokan per-event. Selisih wajar terjadi karena attribution window Meta (bisa 7-28 hari) berbeda dari waktu kita mengirim event - jangan langsung diartikan sebagai bug tracking."}
          </p>
        </div>

        {!loading && !connected ? (
          <div style={{ background: "#fff", border: "1px dashed #d1d5db", borderRadius: 12, padding: 48, textAlign: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Belum ada akun Meta Ads yang terhubung</h3>
            <a href="/marketing/meta-ads/accounts" style={{ display: "inline-block", padding: "8px 16px", background: "#111827", color: "#fff", borderRadius: 8, fontSize: 14, textDecoration: "none" }}>
              Buka Setting Akun
            </a>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={tileStyle}><div style={tileLabel}>Total Kita Kirim</div><div style={tileValue}>{fmt(totalOur)}</div></div>
              <div style={tileStyle}><div style={tileLabel}>Total Dilaporkan Meta</div><div style={tileValue}>{fmt(totalMeta)}</div></div>
              <div style={tileStyle}><div style={tileLabel}>Hari dengan Selisih Besar</div><div style={{ ...tileValue, color: flaggedDays > 0 ? "#dc2626" : "#111827" }}>{flaggedDays}</div></div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left", background: "#f9fafb" }}>
                    <th style={{ padding: "10px 14px" }}>Tanggal</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Kita Kirim</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Value Kita</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Dilaporkan Meta</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Value Meta</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>{loading ? "Memuat..." : "Belum ada data untuk rentang ini."}</td></tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.date} style={{ borderBottom: "1px solid #f3f4f6", background: r.flagged ? "#fef2f2" : "transparent" }}>
                        <td style={{ padding: "10px 14px" }}>{r.date}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(r.our_count)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmtRp(r.our_value)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmt(r.meta_count)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>{fmtRp(r.meta_value)}</td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: r.flagged ? "#dc2626" : "#6b7280", fontWeight: r.flagged ? 600 : 400 }}>
                          {r.delta_pct !== null ? `${r.delta_pct > 0 ? "+" : ""}${r.delta_pct}%` : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

const tileStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px" };
const tileLabel = { fontSize: 12, color: "#6b7280", marginBottom: 6 };
const tileValue = { fontSize: 20, fontWeight: 700, color: "#111827" };
