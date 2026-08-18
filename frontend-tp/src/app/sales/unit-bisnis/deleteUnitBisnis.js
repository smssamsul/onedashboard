"use client";

import "@/styles/sales/admin.css";

export default function DeleteUnitBisnisModal({ unitBisnis, onClose, onConfirm }) {
  if (!unitBisnis) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-delete">
        <div className="modal-header">
          <h2>Hapus Unit Bisnis</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p>
            Apakah kamu yakin ingin <strong>menghapus</strong> unit bisnis{" "}
            <strong>{unitBisnis.nama}</strong>?<br />
            Produk yang sudah ditempel ke unit bisnis ini tidak akan ikut terhapus,
            tapi tidak akan muncul lagi di jadwal seminar per unit bisnis ini.
          </p>
        </div>

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
