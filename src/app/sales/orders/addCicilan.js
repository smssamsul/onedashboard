"use client";

import { useState } from "react";
import "@/styles/sales/pesanan.css";

export default function AddCicilanModal({ order, onClose, onSave }) {
  const [formData, setFormData] = useState({
    // Form data akan diisi nanti
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setErrorMsg("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Fungsi submit akan diisi nanti
  };

  if (!order) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: "600px" }}>
        {/* HEADER */}
        <div className="modal-header">
          <h2>Input Cicilan Pembayaran</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="pi pi-times"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
              <strong>Order ID:</strong> {order.id}
            </p>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
              <strong>Total Harga:</strong> Rp {Number(order.total_harga || 0).toLocaleString()}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Form fields akan ditambahkan nanti */}
            <div className="form-group">
              <label>Form Input Cicilan</label>
              <p style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
                Form input cicilan akan ditambahkan di sini.
              </p>
            </div>

            {errorMsg && (
              <div style={{ 
                padding: "0.75rem", 
                background: "#fee2e2", 
                color: "#991b1b", 
                borderRadius: "6px", 
                marginTop: "1rem",
                fontSize: "0.9rem"
              }}>
                {errorMsg}
              </div>
            )}

            {/* FOOTER */}
            <div className="modal-footer" style={{ marginTop: "1.5rem" }}>
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Batal
              </button>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
