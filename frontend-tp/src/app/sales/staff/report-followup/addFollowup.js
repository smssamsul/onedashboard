"use client";

import { useState } from "react";
import "@/styles/sales/followup.css";

export default function AddFollowupModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({ kode: "", event: "", text: "" });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.kode || !formData.event || !formData.text) {
      alert("Semua field wajib diisi!");
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Tambah Template Follow Up</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Kode Template</label>
                <input
                  type="text"
                  name="kode"
                  value={formData.kode}
                  onChange={handleChange}
                  placeholder="Contoh: FL1"
                />
              </div>

              <div className="form-group">
                <label>Event</label>
                <input
                  type="text"
                  name="event"
                  value={formData.event}
                  onChange={handleChange}
                  placeholder="Contoh: Pembayaran Sukses"
                />
              </div>

              <div className="form-group full-width">
                <label>Text Pesan</label>
                <textarea
                  rows="3"
                  name="text"
                  value={formData.text}
                  onChange={handleChange}
                  placeholder="Masukkan teks pesan"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn-save">
              Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
