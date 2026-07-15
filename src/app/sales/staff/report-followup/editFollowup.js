"use client";

import { useState, useEffect } from "react";
import "@/styles/sales/followup.css";

export default function EditFollowupModal({ template, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nama: template.nama || "",
    event: template.event || "",
    text: template.text || "",
  });

  // 🧩 Fix: Update form setiap kali `template` berubah
  useEffect(() => {
    if (template) {
      setFormData({
        nama: template.nama || template.kode || "",
        event: template.event || "",
        text: template.text || "",
      });
    }
  }, [template]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nama || !formData.event || !formData.text) {
      alert("Semua field wajib diisi!");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Edit Template Follow Up</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Nama Template</label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Event (integer)</label>
                <input
                  type="number"
                  name="event"
                  value={formData.event}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Text Pesan</label>
                <textarea
                  rows="3"
                  name="text"
                  value={formData.text}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-save">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
