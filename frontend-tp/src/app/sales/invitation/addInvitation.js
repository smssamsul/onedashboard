"use client";

import { useState } from "react";
import "@/styles/sales/admin.css";

export default function AddInvitationModal({ produkList, onClose, onSave }) {
  const [form, setForm] = useState({
    nama: "",
    wa: "",
    email: "",
    produk: "",
    catatan: "",
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nama.trim() || !form.wa.trim() || !form.produk) return;

    setSaving(true);
    try {
      await onSave({
        ...form,
        produk: parseInt(form.produk, 10),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Tambah Invitation Manual</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group full-width">
              <label>Nama Peserta *</label>
              <input type="text" name="nama" value={form.nama} onChange={handleChange} required />
            </div>
            <div className="form-group full-width">
              <label>Nomor WhatsApp *</label>
              <input type="text" name="wa" value={form.wa} onChange={handleChange} placeholder="628xxxxxxxxxx" required />
            </div>
            <div className="form-group full-width">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-group full-width">
              <label>Produk *</label>
              <select name="produk" value={form.produk} onChange={handleChange} required>
                <option value="">-- Pilih Produk --</option>
                {produkList.map((p) => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label>Catatan</label>
              <textarea name="catatan" value={form.catatan} onChange={handleChange} rows={3} />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
              Batal
            </button>
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
