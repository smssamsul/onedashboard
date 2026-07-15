"use client";

import { useState } from "react";
import "@/styles/sales/admin.css";

export default function AddUserModal({ onClose, onSave }) {
  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    tanggal_lahir: "",
    tanggal_join: "",
    alamat: "",
    divisi: "",
    level: "",
    no_telp: "",
  });

  // === FUNGSI TOAST NOTIFIKASI ===
  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type} toast-show`;
    
    // Icon mapping
    const icons = {
      success: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>`,
      error: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>`,
      warning: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>`,
      info: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>`,
    };
    
    const closeIcon = `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>`;
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">${closeIcon}</button>
      <div class="toast-progress"></div>
    `;
    
    // Add close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove("toast-show");
      setTimeout(() => toast.remove(), 300);
    });
    
    // Position toast
    toast.style.position = "fixed";
    toast.style.top = "1.5rem";
    toast.style.right = "1.5rem";
    toast.style.zIndex = "10000";
    
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.remove("toast-show");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // === HANDLE FORM INPUT ===
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // === FORMAT TANGGAL (dd-mm-yyyy) ===
  const normalizeTanggal = (val) => {
    if (!val) return "";
    const d = new Date(val);
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${day}-${m}-${y}`;
  };

  // === HANDLE SUBMIT ===
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validasi field wajib sesuai dokumentasi
    if (!formData.nama || !formData.nama.trim()) {
      showToast("Nama wajib diisi!", "warning");
      return;
    }

    if (!formData.email || !formData.email.trim()) {
      showToast("Email wajib diisi!", "warning");
      return;
    }

    if (!formData.tanggal_lahir) {
      showToast("Tanggal lahir wajib diisi!", "warning");
      return;
    }

    if (!formData.tanggal_join) {
      showToast("Tanggal join wajib diisi!", "warning");
      return;
    }

    if (!formData.alamat || !formData.alamat.trim()) {
      showToast("Alamat wajib diisi!", "warning");
      return;
    }

    if (!formData.divisi) {
      showToast("Divisi wajib dipilih!", "warning");
      return;
    }

    if (!formData.level) {
      showToast("Level wajib dipilih!", "warning");
      return;
    }

    // Validasi no telp minimal 10 digit
    if (!formData.no_telp || formData.no_telp.trim().length < 10) {
      showToast("Nomor telepon minimal 10 digit!", "error");
      return;
    }

    const payload = {
      nama: formData.nama.trim(),
      email: formData.email.trim(),
      tanggal_lahir: normalizeTanggal(formData.tanggal_lahir),
      tanggal_join: normalizeTanggal(formData.tanggal_join),
      alamat: formData.alamat.trim(),
      divisi: String(formData.divisi), // String sesuai backend
      level: String(formData.level), // String sesuai backend
      no_telp: formData.no_telp.trim(),
    };

    console.log("Payload dikirim ke API:", payload);

    try {
      await onSave(payload);
      showToast("User baru berhasil dibuat!");
      onClose();
    } catch (err) {
      console.error("Error submit:", err);
      showToast(err.message || "Terjadi kesalahan saat menyimpan data", "error");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Tambah User Baru</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Nama</label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleChange}
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="contoh@email.com"
                />
              </div>

              <div className="form-group">
                <label>No. Telepon</label>
                <input
                  type="text"
                  name="no_telp"
                  value={formData.no_telp}
                  onChange={handleChange}
                  placeholder="08123456789"
                />
              </div>

              <div className="form-group">
                <label>Tanggal Lahir</label>
                <input
                  type="date"
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>Tanggal Join</label>
                <input
                  type="date"
                  name="tanggal_join"
                  value={formData.tanggal_join}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group full-width">
                <label>Alamat</label>
                <textarea
                  name="alamat"
                  value={formData.alamat}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Alamat lengkap..."
                />
              </div>

              <div className="form-group">
                <label>Divisi</label>
                <select name="divisi" value={formData.divisi} onChange={handleChange}>
                  <option value="">Pilih Divisi</option>
                  <option value="1">Admin Super</option>
                  <option value="2">Owner</option>
                  <option value="3">Sales</option>
                  <option value="4">Finance</option>
                  <option value="5">HR</option>
                  <option value="11">Trainer</option>
                </select>
              </div>

              <div className="form-group">
                <label>Level</label>
                <select name="level" value={formData.level} onChange={handleChange}>
                  <option value="">Pilih Level</option>
                  <option value="1">Leader</option>
                  <option value="2">Staff</option>
                </select>
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
