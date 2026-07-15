"use client";

import "@/styles/sales/followup.css";

export default function DeleteFollowupModal({ template, onClose, onConfirm }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card modal-delete">
        <div className="modal-header">
          <h2>Hapus Template</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p>
            Apakah Anda yakin ingin menghapus template{" "}
            <strong>{template.kode}</strong>?
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button className="btn-delete-confirm" onClick={onConfirm}>
            Ya
          </button>
        </div>
      </div>
    </div>
  );
}
