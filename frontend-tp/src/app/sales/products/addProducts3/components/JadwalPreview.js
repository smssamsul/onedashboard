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
 * sekali. Dikelompokkan per JAM: tanggal yang beda tapi jamnya sama
 * ditumpuk di bawah 1 grup jam, jamnya sendiri cukup ditulis sekali.
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

  const groupedByTime = [];
  sorted.forEach((j) => {
    const d = j.waktu_mulai ? new Date(j.waktu_mulai) : null;
    const timeMinutes = d ? d.getHours() * 60 + d.getMinutes() : -1;
    const timeStr = d
      ? `${String(d.getHours()).padStart(2, "0")}.${String(d.getMinutes()).padStart(2, "0")}`
      : "-";
    const dateKey = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "no-date";

    let group = groupedByTime.find((g) => g.timeMinutes === timeMinutes);
    if (!group) {
      group = { timeMinutes, timeStr, namaJadwal: j.nama_jadwal || "Sesi", dates: [] };
      groupedByTime.push(group);
    }
    if (!group.dates.find((dd) => dd.dateKey === dateKey)) {
      group.dates.push({ dateKey, date: d });
    }
  });
  groupedByTime.sort((a, b) => a.timeMinutes - b.timeMinutes);

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
        {groupedByTime.map((group) => (
          <div key={group.timeMinutes} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {group.dates.map((dd) => {
                const dateStr = dd.date
                  ? `${dayNames[dd.date.getDay()]} ${dd.date.getDate()} ${monthNames[dd.date.getMonth()]} ${dd.date.getFullYear()}`
                  : "-";
                return (
                  <div key={dd.dateKey} style={{ display: "flex", alignItems: "center", gap: "12px", color: "#374151" }}>
                    <CalendarIcon size={20} strokeWidth={2} />
                    <span>{dateStr}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#374151" }}>
              <Clock size={20} strokeWidth={2} />
              <span>{group.namaJadwal} : {group.timeStr} WIB</span>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#374151" }}>
          <MapPin size={20} strokeWidth={2} />
          <span>{tempat || "-"}</span>
        </div>
      </div>
    </div>
  );
}
