"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Pencil, Plus, CalendarClock, AlertTriangle, Clock } from "lucide-react";
import { getTaskReport } from "@/lib/task";

/**
 * Palet donut — sudah divalidasi (CVD & kontras) terhadap permukaan putih.
 * Abu untuk "belum mulai" memang netral disengaja: artinya "belum dikerjakan",
 * dan tiap potongan selalu punya label + angka di legend, jadi warna tidak
 * pernah jadi satu-satunya pembeda.
 */
const WARNA_STATUS = {
  selesai: "#008300",
  berjalan: "#2a78d6",
  belum_mulai: "#8a8a85",
};
const LABEL_STATUS = {
  selesai: "Selesai",
  berjalan: "Berjalan",
  belum_mulai: "Belum Mulai",
};

const RENTANG = [7, 14, 30];

export default function ReportView() {
  const [hari, setHari] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getTaskReport(hari));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [hari]);

  useEffect(() => {
    muat();
  }, [muat]);

  if (loading) return <p style={{ color: "#6b7280", fontSize: 14 }}>Memuat laporan...</p>;
  if (!data) return <p style={{ color: "#6b7280", fontSize: 14 }}>Laporan tidak tersedia.</p>;

  const { kartu, status, per_pemilik: perPemilik, aktivitas } = data;

  const kartuList = [
    { key: "selesai", label: "selesai", sub: `dalam ${hari} hari terakhir`, nilai: kartu.selesai, warna: "#008300", bg: "#e3f2e3", Icon: CheckCircle2 },
    { key: "diperbarui", label: "diperbarui", sub: `dalam ${hari} hari terakhir`, nilai: kartu.diperbarui, warna: "#2a78d6", bg: "#e4ecf7", Icon: Pencil },
    { key: "baru", label: "baru", sub: `dalam ${hari} hari terakhir`, nilai: kartu.baru, warna: "#4a3aa7", bg: "#e8e6f5", Icon: Plus },
    { key: "jatuh_tempo", label: "jatuh tempo", sub: `dalam ${hari} hari ke depan`, nilai: kartu.jatuh_tempo, warna: "#d03b3b", bg: "#fbe4e4", Icon: CalendarClock },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>Rentang:</span>
        <div style={{ display: "inline-flex", background: "#eef1f6", borderRadius: 8, padding: 3 }}>
          {RENTANG.map((n) => (
            <button
              key={n}
              onClick={() => setHari(n)}
              style={{
                border: "none", cursor: "pointer", padding: ".32rem .7rem", borderRadius: 6,
                fontSize: 12.5, fontWeight: 600,
                background: hari === n ? "#fff" : "transparent",
                color: hari === n ? "#1e4576" : "#6b7280",
                boxShadow: hari === n ? "0 1px 2px rgba(16,24,40,.08)" : "none",
              }}
            >
              {n} hari
            </button>
          ))}
        </div>
      </div>

      {/* Kartu ringkas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 18 }}>
        {kartuList.map(({ key, label, sub, nilai, warna, bg, Icon }) => (
          <div key={key} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1rem 1.1rem", display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 42, height: 42, borderRadius: "50%", background: bg, color: warna, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 19, fontWeight: 650, color: warna }}>
                {nilai} <span style={{ fontWeight: 600 }}>{label}</span>
              </p>
              <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "#6b7280" }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <StatusOverview status={status} />
        <RecentActivity items={aktivitas} />
      </div>

      <BebanPerOrang rows={perPemilik} />
    </div>
  );
}

function StatusOverview({ status }) {
  const [hover, setHover] = useState(null);

  const potongan = ["selesai", "berjalan", "belum_mulai"]
    .map((k) => ({ key: k, label: LABEL_STATUS[k], nilai: status[k] || 0, warna: WARNA_STATUS[k] }))
    .filter((p) => p.nilai > 0);

  const total = status.total || 0;

  // Donut digambar dari stroke-dasharray: tiap potongan mengambil porsinya
  // dari keliling, dikurangi 2px sebagai jarak antar-isian.
  const r = 70;
  const keliling = 2 * Math.PI * r;
  const jarak = total > 0 && potongan.length > 1 ? 2 : 0;

  let jalan = 0;
  const arc = potongan.map((p) => {
    const panjang = total > 0 ? (p.nilai / total) * keliling : 0;
    const item = { ...p, dash: Math.max(panjang - jarak, 0), offset: -jalan };
    jalan += panjang;
    return item;
  });

  return (
    <section style={{ flex: "1 1 380px", minWidth: 320, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.2rem 1.3rem" }}>
      <h3 style={{ fontSize: 15.5, fontWeight: 650, marginBottom: 4 }}>Komposisi status</h3>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 14 }}>
        Total {total} task yang Anda pegang atau dipegang bawahan langsung.
      </p>

      {total === 0 ? (
        <p style={{ fontSize: 13.5, color: "#6b7280" }}>Belum ada task.</p>
      ) : (
        <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <svg width={180} height={180} viewBox="0 0 180 180" role="img" aria-label="Komposisi status task">
              <g transform="rotate(-90 90 90)">
                {arc.map((p) => (
                  <circle
                    key={p.key}
                    cx={90} cy={90} r={r}
                    fill="none"
                    stroke={p.warna}
                    strokeWidth={hover === p.key ? 26 : 22}
                    strokeDasharray={`${p.dash} ${keliling - p.dash}`}
                    strokeDashoffset={p.offset}
                    onMouseEnter={() => setHover(p.key)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: "pointer", transition: "stroke-width .12s" }}
                  />
                ))}
              </g>
              <text x={90} y={86} textAnchor="middle" style={{ fontSize: 27, fontWeight: 700, fill: "#008300" }}>
                {status.persen_selesai}%
              </text>
              <text x={90} y={106} textAnchor="middle" style={{ fontSize: 12.5, fill: "#6b7280" }}>
                Selesai
              </text>
            </svg>

            {hover && (
              <div style={{ position: "absolute", left: "50%", bottom: -6, transform: "translateX(-50%)", background: "#1f2937", color: "#fff", fontSize: 12, padding: "4px 9px", borderRadius: 6, whiteSpace: "nowrap", pointerEvents: "none" }}>
                {LABEL_STATUS[hover]}: {status[hover]} ({Math.round((status[hover] / total) * 100)}%)
              </div>
            )}
          </div>

          {/* Legend selalu ada — identitas potongan tidak pernah bergantung warna saja. */}
          <div style={{ flex: "1 1 160px", minWidth: 150 }}>
            {potongan.map((p) => (
              <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0", fontSize: 13.5 }}>
                <i style={{ width: 12, height: 12, borderRadius: 3, background: p.warna, flexShrink: 0 }} />
                <span style={{ color: "#374151" }}>{p.label}</span>
                <b style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums", color: "#1f2937" }}>{p.nilai}</b>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 0 0", marginTop: 4, borderTop: "1px solid #e7ecf2", fontSize: 13.5 }}>
              <span style={{ color: "#6b7280", fontWeight: 600 }}>Total</span>
              <b style={{ marginLeft: "auto", fontVariantNumeric: "tabular-nums" }}>{total}</b>
            </div>
          </div>
        </div>
      )}

      {/* Telat & menunggu approval bukan potongan donut — keduanya kondisi yang
          bisa menempel pada task berjalan, jadi kalau dijadikan potongan
          angkanya dobel-hitung. Ditampilkan sebagai penanda terpisah. */}
      {(status.telat > 0 || status.menunggu_approval > 0) && (
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          {status.telat > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#9a3412", background: "#fbe4e4", padding: "5px 11px", borderRadius: 20 }}>
              <AlertTriangle size={14} /> {status.telat} lewat tenggat
            </span>
          )}
          {status.menunggu_approval > 0 && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "#a85a22", background: "#f3e4d5", padding: "5px 11px", borderRadius: 20 }}>
              <Clock size={14} /> {status.menunggu_approval} menunggu approval
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function RecentActivity({ items }) {
  const grup = {};
  (items || []).forEach((r) => {
    const d = new Date(r.created_at);
    const hariIni = new Date();
    const kemarin = new Date();
    kemarin.setDate(kemarin.getDate() - 1);

    let label;
    if (d.toDateString() === hariIni.toDateString()) label = "HARI INI";
    else if (d.toDateString() === kemarin.toDateString()) label = "KEMARIN";
    else label = d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }).toUpperCase();

    (grup[label] = grup[label] || []).push(r);
  });

  return (
    <section style={{ flex: "1 1 380px", minWidth: 320, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.2rem 1.3rem" }}>
      <h3 style={{ fontSize: 15.5, fontWeight: 650, marginBottom: 4 }}>Aktivitas terbaru</h3>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 14 }}>
        Perubahan status, progres, tanggal, dan persetujuan.
      </p>

      {!items || items.length === 0 ? (
        <p style={{ fontSize: 13.5, color: "#6b7280" }}>Belum ada aktivitas.</p>
      ) : (
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {Object.entries(grup).map(([label, rows]) => (
            <div key={label} style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#8695a6", letterSpacing: ".06em", marginBottom: 8 }}>{label}</p>
              {rows.map((r) => (
                <div key={r.id} style={{ display: "flex", gap: 9, marginBottom: 10 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#e4ecf7", color: "#1e4576", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(r.pelaku?.nama || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13 }}>
                      <b style={{ fontWeight: 650 }}>{r.pelaku?.nama || "?"}</b>{" "}
                      <span style={{ color: "#374151" }}>{r.keterangan || r.aksi}</span>
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#8695a6" }}>
                      {r.task?.judul ? `TP-${r.task_id} · ${r.task.judul} · ` : ""}
                      {new Date(r.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function BebanPerOrang({ rows }) {
  if (!rows || rows.length === 0) return null;

  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "1.2rem 1.3rem", marginTop: 18 }}>
      <h3 style={{ fontSize: 15.5, fontWeight: 650, marginBottom: 4 }}>Beban per orang</h3>
      <p style={{ fontSize: 12.5, color: "#6b7280", marginBottom: 14 }}>
        Sebaran task Anda dan bawahan langsung.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Nama</th>
              <th style={{ textAlign: "right" }}>Total</th>
              <th style={{ textAlign: "right" }}>Belum Mulai</th>
              <th style={{ textAlign: "right" }}>Berjalan</th>
              <th style={{ textAlign: "right" }}>Selesai</th>
              <th style={{ textAlign: "right" }}>Telat</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.nama}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{r.total}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.belum_mulai}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.berjalan}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.selesai}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.telat > 0 ? "#9a3412" : "#6b7280", fontWeight: r.telat > 0 ? 650 : 400 }}>
                  {r.telat}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
