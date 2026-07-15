"use client";

import "@/styles/sales/followup.css";

export default function ViewFollowup({ template, onClose }) {
  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Detail Template Follow Up</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Kode Template</label>
              <input type="text" value={template.kode || ""} readOnly />
            </div>

            <div className="form-group">
              <label>Event</label>
              <input type="text" value={template.event || ""} readOnly />
            </div>

            <div className="form-group full-width">
              <label>Text Pesan</label>
              <textarea rows="3" value={template.text || ""} readOnly />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
