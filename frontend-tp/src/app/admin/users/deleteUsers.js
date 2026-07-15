"use client";

import "@/styles/sales/admin.css";

export default function DeleteUserModal({ user, onClose, onConfirm }) {
  if (!user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-delete">
        <div className="modal-header">
          <h2>Hapus User</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p>
            Apakah Anda yakin ingin menghapus user{" "}
            <strong>{user.nama}</strong>?
          </p>
          <p className="text-muted">
            Tindakan ini akan menghapus data user dari daftar pengguna aktif.
          </p>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn-delete" onClick={onConfirm}>
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}
