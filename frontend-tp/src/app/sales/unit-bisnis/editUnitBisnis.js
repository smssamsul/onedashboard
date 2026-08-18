"use client";

import "@/styles/sales/admin.css";

export default function EditUnitBisnisModal({ unitBisnis, onClose, onSave }) {
  if (!unitBisnis) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ nama: e.target.nama.value });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Edit Unit Bisnis</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group full-width">
              <label>Nama Unit Bisnis</label>
              <input type="text" name="nama" defaultValue={unitBisnis.nama} required />
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
