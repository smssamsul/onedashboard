"use client";

import { useState } from "react";
import "@/styles/sales/admin.css";

export default function DeleteKategoriModal({ kategori, onClose, onConfirm }) {
  if (!kategori) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-delete">
        {/* HEADER */}
        <div className="modal-header">
          <h2>Hapus Kategori</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <p>
            Apakah kamu yakin ingin <strong>menghapus secara permanen</strong> kategori{" "}
            <strong>{kategori.nama}</strong>?<br />
            Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
