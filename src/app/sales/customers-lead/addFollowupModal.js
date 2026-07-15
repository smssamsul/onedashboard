import React, { useState } from 'react';
import { toastSuccess, toastError } from "@/lib/toast";

export default function AddFollowupModal({ customer, onClose, onSaveSuccess }) {
  const [followupForm, setFollowupForm] = useState({ via: 'WhatsApp', respon: 'Follow Up Lagi', keterangan: '' });
  const [submittingFollowup, setSubmittingFollowup] = useState(false);

  const submitFollowup = async (e) => {
    e.preventDefault();
    if (!customer?.id || !followupForm.via || !followupForm.respon) return;
    setSubmittingFollowup(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`/api/sales/customer/${customer.id}/followups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(followupForm),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.success) {
        toastSuccess('Follow up berhasil dicatat');
        if (onSaveSuccess) onSaveSuccess();
        onClose();
      } else {
        toastError(data?.message || 'Gagal menyimpan follow up');
      }
    } catch (err) {
       toastError('Terjadi kesalahan saat menyimpan data');
    } finally {
       setSubmittingFollowup(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', inset: 0 }}>
      <div className="modal-card" style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Catat Follow Up</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>
        
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
          Mencatat follow up untuk lead: <strong style={{ color: '#0f172a' }}>{customer?.nama || customer?.nama_lengkap}</strong>
        </p>

        <form onSubmit={submitFollowup} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Via / Channel</label>
            <select 
              value={followupForm.via}
              onChange={(e) => setFollowupForm({...followupForm, via: e.target.value})}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="Telepon">Telepon</option>
              <option value="Email">Email</option>
              <option value="Tatap Muka">Tatap Muka</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Respon</label>
            <select 
              value={followupForm.respon}
              onChange={(e) => setFollowupForm({...followupForm, respon: e.target.value})}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none" }}
            >
              <option value="Tertarik">Tertarik</option>
              <option value="Follow Up Lagi">Follow Up Lagi</option>
              <option value="Pikir-pikir">Pikir-pikir</option>
              <option value="Tidak Tertarik">Tidak Tertarik</option>
              <option value="Salah Sambung">Salah Sambung</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#475569", marginBottom: "0.5rem" }}>Keterangan / Catatan</label>
            <textarea 
              value={followupForm.keterangan}
              onChange={(e) => setFollowupForm({...followupForm, keterangan: e.target.value})}
              placeholder="Masukkan catatan follow up..."
              rows={4}
              style={{ width: "100%", padding: "0.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "vertical", outline: "none" }}
            ></textarea>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{ padding: "0.5rem 1.25rem", background: "#f1f5f9", color: "#475569", borderRadius: "8px", border: "none", fontWeight: 600, cursor: "pointer" }}
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={submittingFollowup}
              style={{ padding: "0.5rem 1.25rem", background: submittingFollowup ? "#94a3b8" : "#2563eb", color: "white", borderRadius: "8px", border: "none", fontWeight: 600, cursor: submittingFollowup ? "not-allowed" : "pointer" }}
            >
              {submittingFollowup ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
