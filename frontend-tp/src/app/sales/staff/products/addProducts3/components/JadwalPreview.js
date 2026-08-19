"use client";

import { MapPin, Calendar as CalendarIcon, Clock } from "lucide-react";

const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jum'at", "Sabtu"];
const monthNames = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * Preview kartu jadwal di builder - persis dengan tampilan publik
 * (ProductClient.js case "jadwal"), tapi dari data draft (belum tersimpan)
 * supaya sales bisa lihat hasilnya sebelum Simpan/Publish.
 *
 * SATU kartu untuk seluruh produk - judul, garis, dan lokasi cuma tampil
 * sekali. Jadwal dikelompokkan per tanggal di dalamnya: sesi di hari yang
 * sama numpuk di bawah 1 baris tanggal, tanggal beda cuma nambah baris
 * tanggal+sesi baru (bukan kartu baru).
 */
export default function JadwalPreview({ jadwalList = [], tempat = "", nama = "" }) {
  const sorted = (jadwalList || [])
    .filter((j) => j.status !== "N")
    .slice()
    .sort((a, b) => new Date(a.waktu_mulai) - new Date(b.waktu_mulai));

  if (sorted.length === 0) {
    return (
      <div style={{ padding: "16px", color: "#6b7280", fontStyle: "italic", fontSize: "0.85rem" }}>
        Belum ada jadwal - tambahkan di bagian "Jadwal Produk" pada Informasi Dasar.
      </div>
    );
  }

  const groupedByDate = [];
  sorted.forEach((j) => {
    const d = j.waktu_mulai ? new Date(j.waktu_mulai) : null;
    const dateKey = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "no-date";
    let group = groupedByDate.find((g) => g.dateKey === dateKey);
    if (!group) {
      group = { dateKey, date: d, sessions: [] };
      groupedByDate.push(group);
    }
    group.sessions.push(j);
  });

  return (
    <div
      style={{
        background: "#f8f9fb",
        borderRadius: "12px",
        padding: "24px 28px",
      }}
    >
      <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
        {nama || "Nama Produk"}
      </h3>
      <div style={{ height: "3px", background: "#f5a623", width: "100%", margin: "12px 0 20px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {groupedByDate.map((group) => {
          const d = group.date;
          const dateStr = d
            ? `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`
            : "-";

          return (
            <div key={group.dateKey} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#374151" }}>
                <CalendarIcon size={20} strokeWidth={2} />
                <span>{dateStr}</span>
              </div>
              {group.sessions.map((j, i) => {
                const sd = j.waktu_mulai ? new Date(j.waktu_mulai) : null;
                const timeStr = sd
                  ? `${String(sd.getHours()).padStart(2, "0")}.${String(sd.getMinutes()).padStart(2, "0")}`
                  : "-";
                return (
                  <div key={j.id ?? i} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#374151" }}>
                    <Clock size={20} strokeWidth={2} />
                    <span>{j.nama_jadwal || "Sesi"} : {timeStr} WIB</span>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#374151" }}>
          <MapPin size={20} strokeWidth={2} />
          <span>{tempat || "-"}</span>
        </div>
      </div>
    </div>
  );
}
