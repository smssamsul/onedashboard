"use client";

import { useState, useEffect } from "react";
import "@/styles/sales/admin.css";

function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function CreateTaskModal({ karyawanList, defaultKaryawanId, onClose, onSave }) {
  const [form, setForm] = useState({
    hr_karyawan_id: defaultKaryawanId || "",
    judul: "",
    deskripsi: "",
    tanggal_mulai: new Date().toISOString().slice(0, 10),
    tenggat: "",
  });
  const [errorTanggal, setErrorTanggal] = useState("");
  const [karyawanSearch, setKaryawanSearch] = useState("");
  const debouncedSearch = useDebouncedValue(karyawanSearch);
  const [saving, setSaving] = useState(false);

  const selectedKaryawan = karyawanList.find((k) => String(k.id) === String(form.hr_karyawan_id));

  const hasilPencarian = debouncedSearch.trim()
    ? karyawanList.filter((k) => k.nama?.toLowerCase().includes(debouncedSearch.trim().toLowerCase())).slice(0, 8)
    : [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hr_karyawan_id || !form.judul.trim()) return;

    if (form.tanggal_mulai && form.tenggat && form.tenggat < form.tanggal_mulai) {
      setErrorTanggal("Target selesai tidak boleh lebih awal dari tanggal mulai.");
      return;
    }
    setErrorTanggal("");

    setSaving(true);
    try {
      await onSave({
        hr_karyawan_id: parseInt(form.hr_karyawan_id, 10),
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim() || undefined,
        tanggal_mulai: form.tanggal_mulai || undefined,
        tenggat: form.tenggat || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ width: 720 }}>
        <div className="modal-header">
          <h2>Buat Task</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group full-width" style={{ position: "relative" }}>
              <label>Untuk siapa task ini? *</label>
              <input
                type="text"
                value={selectedKaryawan ? selectedKaryawan.nama : karyawanSearch}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, hr_karyawan_id: "" }));
                  setKaryawanSearch(e.target.value);
                }}
                placeholder="Ketik nama karyawan..."
                required
              />
              {!selectedKaryawan && hasilPencarian.length > 0 && (
                <div
                  className="customers-search__dropdown"
                  style={{ position: "absolute", zIndex: 10, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, width: "100%", maxHeight: 200, overflowY: "auto" }}
                >
                  {hasilPencarian.map((k) => (
                    <div
                      key={k.id}
                      style={{ padding: "8px 12px", cursor: "pointer" }}
                      onClick={() => {
                        setForm((prev) => ({ ...prev, hr_karyawan_id: k.id }));
                        setKaryawanSearch("");
                      }}
                    >
                      {k.nama}
                    </div>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                Untuk diri sendiri atau siapa pun yang ada di bawah Anda (langsung maupun tidak),
                task langsung aktif. Selain itu, cukup atasan langsung orangnya yang meng-ACC —
                dia bisa meneruskan ke atasannya kalau perlu.
              </p>
            </div>
            <div className="form-group full-width">
              <label>Judul Task *</label>
              <input type="text" name="judul" value={form.judul} onChange={handleChange} required />
            </div>
            <div className="form-group full-width">
              <label>Deskripsi</label>
              <textarea name="deskripsi" value={form.deskripsi} onChange={handleChange} rows={3} />
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div className="form-group" style={{ flex: "1 1 200px" }}>
                <label>Tanggal Mulai</label>
                <input type="date" name="tanggal_mulai" value={form.tanggal_mulai} onChange={handleChange} />
              </div>
              <div className="form-group" style={{ flex: "1 1 200px" }}>
                <label>Target Selesai</label>
                <input
                  type="date"
                  name="tenggat"
                  value={form.tenggat}
                  min={form.tanggal_mulai || undefined}
                  onChange={handleChange}
                />
              </div>
            </div>
            {errorTanggal && (
              <p style={{ fontSize: 12.5, color: "#9a3412", marginTop: -4 }}>{errorTanggal}</p>
            )}
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
              Dua tanggal ini yang dipakai menggambar bar di tab Timeline. Tanpa target selesai,
              task cuma muncul sebagai penanda di tanggal mulai.
            </p>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Menyimpan..." : "Buat Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
