"use client";

import { useState } from "react";
import "@/styles/sales/admin.css";

export default function AddKategoriModal({ onClose, onSave }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    const newKategori = { nama: e.target.nama.value };
    onSave(newKategori);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Tambah Kategori</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group full-width">
              <label>Nama Kategori</label>
              <input type="text" name="nama" required />
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
