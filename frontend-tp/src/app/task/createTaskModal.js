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
    tenggat: "",
  });
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

    setSaving(true);
    try {
      await onSave({
        hr_karyawan_id: parseInt(form.hr_karyawan_id, 10),
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim() || undefined,
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
                Kalau bukan diri sendiri atau bawahan langsung Anda, task ini akan menunggu persetujuan berjenjang dulu.
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
            <div className="form-group full-width">
              <label>Target Selesai</label>
              <input type="date" name="tenggat" value={form.tenggat} onChange={handleChange} />
            </div>
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
