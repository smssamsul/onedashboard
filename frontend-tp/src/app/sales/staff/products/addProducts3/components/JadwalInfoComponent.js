"use client";

import ComponentWrapper from "./ComponentWrapper";
import { CalendarClock } from "lucide-react";

export default function JadwalInfoComponent({
  onMoveUp,
  onMoveDown,
  onDelete,
  index,
  isExpanded,
  onToggleExpand,
}) {
  return (
    <ComponentWrapper
      title="Jadwal"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "12px 14px",
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          borderRadius: "8px",
          fontSize: "0.85rem",
          color: "#075985",
        }}
      >
        <CalendarClock size={18} style={{ flexShrink: 0, marginTop: "1px" }} />
        <span>
          Block ini otomatis menampilkan jadwal dari data <strong>Jadwal Produk</strong> dan{" "}
          <strong>Tempat</strong> yang sudah diisi di tab Pengaturan &rarr; Informasi Dasar / Lokasi.
          Tidak ada yang perlu diisi manual di sini.
        </span>
      </div>
    </ComponentWrapper>
  );
}
