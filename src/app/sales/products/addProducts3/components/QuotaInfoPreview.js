"use client";

export default function QuotaInfoPreview({ data = {} }) {
  const totalKuota = data.totalKuota ?? 60;
  const sisaKuota = data.sisaKuota ?? 47;
  const headline = data.headline ?? "Sisa kuota terbatas!";
  const subtext =
    data.subtext ??
    "Jangan tunda lagi, amankan kursi Anda sebelum kuota habis.";
  const highlightText = data.highlightText ?? "Daftar sekarang sebelum kehabisan.";

  const terpakai = Math.max(0, totalKuota - sisaKuota);
  const total = totalKuota > 0 ? totalKuota : 1;
  const percent = Math.min(100, Math.max(0, Math.round((terpakai / total) * 100)));

  return (
    <div
      className="quota-info-card"
      style={{
        padding: "16px",
        borderRadius: "12px",
        background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
        border: "1px solid #fef3c7",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        color: "#1f2937",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#b45309" }}>Kuota Peserta</div>
          <div style={{ fontSize: "20px", fontWeight: 700, marginTop: "4px" }}>
            Sisa {sisaKuota} / {totalKuota}
          </div>
        </div>
        <div
          style={{
            background: "#fef3c7",
            color: "#b45309",
            padding: "6px 10px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: 700,
            border: "1px solid #fcd34d",
          }}
        >
          {percent}% terisi
        </div>
      </div>

      <div style={{ marginTop: "12px" }}>
        <div
          style={{
            height: "10px",
            borderRadius: "999px",
            background: "#f3f4f6",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              background: "linear-gradient(90deg, #f59e0b, #ef4444)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      <div style={{ marginTop: "12px", fontSize: "14px", fontWeight: 600 }}>{headline}</div>
      <div style={{ marginTop: "6px", fontSize: "13px", color: "#4b5563" }}>{subtext}</div>
      <div style={{ marginTop: "10px", fontSize: "13px", fontWeight: 700, color: "#b45309" }}>
        {highlightText}
      </div>
    </div>
  );
}


