"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getTaskTimeline } from "@/lib/task";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const SIDE_W = 288;

// Lebar kolom per hari untuk tiap level zoom, sekalian menentukan
// berapa hari yang muat ditampilkan sekaligus.
const ZOOM = {
  minggu: { w: 36, days: 35, label: "Minggu" },
  bulan: { w: 20, days: 60, label: "Bulan" },
  kuartal: { w: 10, days: 120, label: "Kuartal" },
};

/**
 * Ubah nilai tanggal dari API jadi Date lokal tengah malam.
 * Kolom date ("YYYY-MM-DD") dibaca apa adanya — kalau dilewatkan Date()
 * string polos dianggap UTC dan bisa mundur sehari. Kolom datetime (ISO,
 * mengandung "T") justru harus dikonversi ke waktu lokal dulu baru diambil
 * tanggalnya, karena tengah malam WIB tersimpan sebagai sore hari sebelumnya.
 */
function parseTanggal(s) {
  if (!s) return null;
  const teks = String(s);

  if (teks.includes("T")) {
    const dt = new Date(teks);
    return isNaN(dt) ? null : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  const [y, m, d] = teks.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function toYmd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function selisihHari(a, b) {
  return Math.round((b - a) / 86400000);
}
function samaHari(a, b) {
  return a.toDateString() === b.toDateString();
}
function formatTanggal(d) {
  return `${d.getDate()} ${BULAN[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
function awalHari(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Status yang dipakai untuk warna bar. "telat" dan "menunggu" bukan nilai
 * kolom status — keduanya kondisi turunan yang lebih mendesak untuk dilihat,
 * jadi menimpa warna status aslinya.
 */
function statusBar(task, hariIni) {
  if (task.status_persetujuan === "menunggu") return "menunggu";
  if (task.status === "selesai") return "selesai";
  const tenggat = parseTanggal(task.tenggat);
  if (tenggat && tenggat < hariIni) return "telat";
  return task.status === "berjalan" ? "berjalan" : "belum";
}

const WARNA = {
  belum: "#8a8a85",
  berjalan: "#2a78d6",
  selesai: "#008300",
  telat: "#d03b3b",
  menunggu: "repeating-linear-gradient(45deg,#b08968,#b08968 6px,#c19a78 6px,#c19a78 12px)",
};
const LABEL_STATUS = {
  belum: "Belum Mulai",
  berjalan: "Berjalan",
  selesai: "Selesai",
  telat: "Lewat Tenggat",
  menunggu: "Menunggu Approval",
};

export default function TimelineView() {
  const hariIni = useMemo(() => awalHari(new Date()), []);
  const [zoom, setZoom] = useState("minggu");
  const [mulai, setMulai] = useState(() => addDays(awalHari(new Date()), -7));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [terpilih, setTerpilih] = useState(null);
  const [grupTutup, setGrupTutup] = useState({});
  const scrollRef = useRef(null);

  const { w: dayW, days } = ZOOM[zoom];
  const gridW = days * dayW;

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTaskTimeline(toYmd(mulai), toYmd(addDays(mulai, days - 1)));
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [mulai, days]);

  useEffect(() => {
    muat();
  }, [muat]);

  // Kelompokkan per pemilik supaya satu orang = satu blok baris.
  const grup = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      const nama = t.pemilik?.nama || "Tanpa pemilik";
      if (!map.has(nama)) map.set(nama, []);
      map.get(nama).push(t);
    });
    return Array.from(map.entries());
  }, [tasks]);

  const geserKe = (tglMulai) => setMulai(tglMulai);
  const offsetHariIni = selisihHari(mulai, hariIni);

  const hariList = useMemo(
    () => Array.from({ length: days }, (_, k) => addDays(mulai, k)),
    [mulai, days]
  );

  // Header bulan: gabung hari-hari yang bulannya sama jadi satu sel.
  const blokBulan = useMemo(() => {
    const out = [];
    let i = 0;
    while (i < days) {
      const d = hariList[i];
      let span = 0;
      while (i + span < days && hariList[i + span].getMonth() === d.getMonth()) span++;
      out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: `${BULAN[d.getMonth()]} ${d.getFullYear()}`, span });
      i += span;
    }
    return out;
  }, [hariList, days]);

  const latarLajur = (
    <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 0 }}>
      {hariList.map((d, k) => (
        <i
          key={k}
          style={{
            width: dayW,
            height: "100%",
            display: "block",
            borderRight: "1px solid #f2f4f8",
            background: d.getDay() === 0 || d.getDay() === 6 ? "#fafbfd" : "transparent",
          }}
        />
      ))}
    </div>
  );

  const renderBar = (t) => {
    const s = parseTanggal(t.tanggal_mulai) || parseTanggal(t.created_at);
    if (!s) return null;

    // Tanpa tenggat rentangnya tidak diketahui — tandai satu titik saja,
    // jangan mengarang panjang bar.
    if (!t.tenggat) {
      const off = selisihHari(mulai, s);
      if (off < 0 || off >= days) return null;
      return (
        <div
          onClick={() => setTerpilih(t)}
          title={`${t.judul} — target selesai belum diisi`}
          style={{
            position: "absolute", top: 13, left: off * dayW + dayW / 2 - 8,
            width: 16, height: 16, background: "#7c3aed",
            transform: "rotate(45deg)", borderRadius: 3, cursor: "pointer", zIndex: 1,
          }}
        />
      );
    }

    const akhir = parseTanggal(t.tanggal_selesai) || parseTanggal(t.tenggat);
    let a = selisihHari(mulai, s);
    let b = selisihHari(mulai, akhir);
    if (b < 0 || a > days - 1) return null;
    a = Math.max(a, 0);
    b = Math.min(b, days - 1);

    const st = statusBar(t, hariIni);
    const progres = t.persentase_penyelesaian ?? 0;

    return (
      <div
        onClick={() => setTerpilih(t)}
        title={`${t.judul} — ${LABEL_STATUS[st]}, ${progres}%`}
        style={{
          position: "absolute", top: 9, height: 26,
          left: a * dayW + 2, width: (b - a + 1) * dayW - 4,
          background: WARNA[st], borderRadius: 6,
          display: "flex", alignItems: "center", gap: 6,
          padding: "0 8px", overflow: "hidden", whiteSpace: "nowrap",
          fontSize: 11.5, fontWeight: 600, color: "#fff",
          cursor: "pointer", zIndex: 1,
        }}
      >
        <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progres}%`, background: "rgba(255,255,255,.26)", zIndex: 0 }} />
        <span style={{ position: "relative", zIndex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{t.judul}</span>
        <span style={{ position: "relative", zIndex: 1, marginLeft: "auto", opacity: 0.85, fontSize: 10.5, flexShrink: 0 }}>{progres}%</span>
      </div>
    );
  };

  return (
    <div style={{ position: "relative" }}>
      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 0 12px", flexWrap: "wrap" }}>
        <button className="customers-button" onClick={() => geserKe(addDays(mulai, -7))} title="Mundur 7 hari">
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: "#374151", minWidth: 190, textAlign: "center" }}>
          {formatTanggal(mulai)} – {formatTanggal(addDays(mulai, days - 1))}
        </span>
        <button className="customers-button" onClick={() => geserKe(addDays(mulai, 7))} title="Maju 7 hari">
          <ChevronRight size={16} />
        </button>
        <button className="customers-button" onClick={() => geserKe(addDays(hariIni, -7))}>Hari ini</button>

        <div style={{ display: "inline-flex", background: "#eef1f6", borderRadius: 8, padding: 3, marginLeft: 4 }}>
          {Object.entries(ZOOM).map(([key, z]) => (
            <button
              key={key}
              onClick={() => setZoom(key)}
              style={{
                border: "none", cursor: "pointer", padding: ".32rem .7rem", borderRadius: 6,
                fontSize: 12.5, fontWeight: 600,
                background: zoom === key ? "#fff" : "transparent",
                color: zoom === key ? "#1e4576" : "#6b7280",
                boxShadow: zoom === key ? "0 1px 2px rgba(16,24,40,.08)" : "none",
              }}
            >
              {z.label}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 14, marginLeft: "auto", flexWrap: "wrap" }}>
          {["belum", "berjalan", "selesai", "telat", "menunggu"].map((k) => (
            <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280" }}>
              <i style={{ width: 11, height: 11, borderRadius: 3, background: WARNA[k], display: "inline-block" }} />
              {LABEL_STATUS[k]}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280", fontSize: 14, padding: "1rem 0" }}>Memuat timeline...</p>
      ) : tasks.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: 14, padding: "1rem 0" }}>
          Tidak ada task pada rentang tanggal ini.
        </p>
      ) : (
        <div ref={scrollRef} style={{ overflowX: "auto", overflowY: "hidden", border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ minWidth: "max-content", position: "relative" }}>
            {/* header tanggal */}
            <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 4, background: "#fafbfd", borderBottom: "1px solid #e5e7eb" }}>
              <div style={{ width: SIDE_W, minWidth: SIDE_W, position: "sticky", left: 0, zIndex: 5, background: "#fafbfd", borderRight: "1px solid #e5e7eb" }}>
                <div style={{ padding: "0 14px", height: 66, display: "flex", alignItems: "center", fontSize: 12, fontWeight: 700, color: "#6b7280", letterSpacing: ".05em", textTransform: "uppercase" }}>
                  Task
                </div>
              </div>
              <div style={{ width: gridW }}>
                <div style={{ display: "flex", height: 26 }}>
                  {blokBulan.map((b) => (
                    <div key={b.key} style={{ width: b.span * dayW, fontSize: 11.5, fontWeight: 700, color: "#6b7280", letterSpacing: ".04em", textTransform: "uppercase", paddingLeft: 8, display: "flex", alignItems: "center", borderRight: "1px solid #e5e7eb", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {b.span * dayW > 70 ? b.label : ""}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", height: 40 }}>
                  {hariList.map((d, k) => {
                    const wk = d.getDay() === 0 || d.getDay() === 6;
                    const td = samaHari(d, hariIni);
                    return (
                      <div key={k} style={{ width: dayW, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, borderRight: "1px solid #eef1f5", fontSize: 11, color: "#8695a6", background: wk ? "#f4f6f9" : "transparent" }}>
                        {dayW >= 20 && <span>{HARI[d.getDay()]}</span>}
                        <b style={td
                          ? { fontSize: 12.5, fontWeight: 650, color: "#fff", background: "#d03b3b", width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }
                          : { fontSize: 12.5, fontWeight: 650, color: "#374151" }}>
                          {d.getDate()}
                        </b>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* baris grup + task */}
            {grup.map(([nama, list]) => {
              const inisial = nama.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              const selesai = list.filter((t) => t.status === "selesai").length;
              const tutup = grupTutup[nama];
              return (
                <div key={nama}>
                  <div style={{ display: "flex" }}>
                    <div style={{ width: SIDE_W, minWidth: SIDE_W, position: "sticky", left: 0, zIndex: 3, background: "#fff", borderRight: "1px solid #e5e7eb" }}>
                      <div
                        onClick={() => setGrupTutup((p) => ({ ...p, [nama]: !p[nama] }))}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 38, background: "#f7f9fc", borderBottom: "1px solid #e9edf3", cursor: "pointer", userSelect: "none" }}
                      >
                        <span style={{ fontSize: 10, color: "#8695a6", transform: tutup ? "rotate(-90deg)" : "none", transition: "transform .15s" }}>▼</span>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#2b5fa8", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {inisial}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 650 }}>{nama}</span>
                        <span style={{ fontSize: 11.5, color: "#8695a6", marginLeft: "auto" }}>{selesai}/{list.length}</span>
                      </div>
                    </div>
                    <div style={{ width: gridW }}>
                      <div style={{ height: 38, background: "#f7f9fc", borderBottom: "1px solid #e9edf3" }} />
                    </div>
                  </div>

                  {!tutup && list.map((t) => (
                    <div key={t.id} style={{ display: "flex" }}>
                      <div style={{ width: SIDE_W, minWidth: SIDE_W, position: "sticky", left: 0, zIndex: 3, background: "#fff", borderRight: "1px solid #e5e7eb" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 26px", height: 44, borderBottom: "1px solid #f0f3f7" }}>
                          <span style={{ fontSize: 11, color: "#9aa7b6", fontFamily: "ui-monospace, monospace", flexShrink: 0 }}>TP-{t.id}</span>
                          <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.judul}</span>
                        </div>
                      </div>
                      <div style={{ width: gridW }}>
                        <div style={{ height: 44, borderBottom: "1px solid #f0f3f7", position: "relative" }}>
                          {latarLajur}
                          {renderBar(t)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {/* garis hari ini */}
            {offsetHariIni >= 0 && offsetHariIni < days && (
              <div style={{ position: "absolute", top: 0, bottom: 0, left: SIDE_W + offsetHariIni * dayW + dayW / 2, width: 2, background: "#d03b3b", opacity: 0.55, zIndex: 2, pointerEvents: "none" }} />
            )}
          </div>
        </div>
      )}

      {terpilih && <DetailPanel task={terpilih} hariIni={hariIni} onClose={() => setTerpilih(null)} />}
    </div>
  );
}

function DetailPanel({ task, hariIni, onClose }) {
  const st = statusBar(task, hariIni);
  const tenggat = parseTanggal(task.tenggat);
  const tglMulai = parseTanggal(task.tanggal_mulai) || parseTanggal(task.created_at);

  let sisa = "—";
  if (task.status === "selesai") {
    const sel = parseTanggal(task.tanggal_selesai);
    sisa = sel ? `Selesai ${formatTanggal(sel)}` : "Selesai";
  } else if (tenggat) {
    const n = selisihHari(hariIni, tenggat);
    sisa = n < 0 ? `Telat ${Math.abs(n)} hari` : n === 0 ? "Jatuh tempo hari ini" : `${n} hari lagi`;
  }

  const baris = [
    ["Status", LABEL_STATUS[st]],
    ["Progres", `${task.persentase_penyelesaian ?? 0}% selesai`],
    ["Pemilik", task.pemilik?.nama || "-"],
    ["Dibuat oleh", task.pembuat?.nama || "-"],
    ["Mulai", tglMulai ? formatTanggal(tglMulai) : "—"],
    ["Target selesai", tenggat ? formatTanggal(tenggat) : "— belum diisi —"],
    ["Sisa waktu", sisa],
  ];

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 360, background: "#fff", borderLeft: "1px solid #e5e7eb", boxShadow: "-8px 0 24px rgba(16,24,40,.08)", zIndex: 50, padding: "1.3rem", overflowY: "auto" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, border: "none", background: "none", cursor: "pointer", color: "#9aa7b6" }}>
        <X size={20} />
      </button>
      <h4 style={{ fontSize: 16, marginBottom: 4, paddingRight: 28 }}>{task.judul}</h4>
      <p style={{ fontSize: 12.5, color: "#8695a6" }}>TP-{task.id}</p>
      {task.deskripsi && <p style={{ fontSize: 13, color: "#374151", marginTop: 10 }}>{task.deskripsi}</p>}

      <dl style={{ marginTop: 16, display: "grid", gridTemplateColumns: "110px 1fr", gap: "9px 12px", fontSize: 13 }}>
        {baris.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt style={{ color: "#8695a6" }}>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
