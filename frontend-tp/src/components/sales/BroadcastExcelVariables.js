"use client";

/** Lokasi file template kontak (disajikan dari folder public). */
export const BROADCAST_EXCEL_TEMPLATE_URL = "/templates/TemplateContact.xlsx";

/** Label ramah untuk kolom baku template; kolom lain (var1, var2, ...) tampil apa adanya. */
const LABEL_KOLOM = {
  phone: "No WA",
  greeting: "Sapaan",
  nickname: "Nama Panggilan",
  fullname: "Nama Lengkap",
  datebirt: "Tgl Lahir",
  email: "Email",
  religion: "Agama",
  profession: "Profesi",
  gender: "Gender",
};

/**
 * Tombol variabel dari kolom Excel yang sudah di-upload. Klik = sisipkan
 * {{namaKolom}} ke pesan. Nilai dari kontak pertama ditampilkan sebagai
 * contoh supaya jelas var1/var2 isinya apa (lokasi, waktu, dll).
 */
export default function BroadcastExcelVariables({ columns = [], contohKontak = null, onInsert }) {
  if (!columns.length) return null;

  const contoh = contohKontak?.fields || {};

  return (
    <div style={{ marginTop: "0.75rem", padding: "0.75rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "0.375rem" }}>
      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e", marginBottom: "0.5rem" }}>
        Variabel dari Excel — klik untuk sisipkan ke pesan
      </div>
      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
        {columns.map((kolom) => {
          const label = LABEL_KOLOM[kolom.toLowerCase()];
          const nilai = contoh[kolom];
          return (
            <button
              key={kolom}
              type="button"
              onClick={() => onInsert(`{{${kolom}}}`)}
              title={nilai ? `Contoh (kontak pertama): ${nilai}` : "Kontak pertama tidak mengisi kolom ini"}
              style={{ background: "#fff", border: "1px solid #fcd34d", padding: "0.25rem 0.5rem", fontSize: "0.75rem", borderRadius: "4px", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ fontFamily: "monospace", color: "#b45309" }}>{`{{${kolom}}}`}</span>
              {label && <span style={{ color: "#64748b" }}> {label}</span>}
              {nilai && (
                <span style={{ color: "#94a3b8", display: "block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nilai}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
