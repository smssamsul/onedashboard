"use client";

import { useState } from "react";
import "@/styles/sales/admin.css";

// Whitelist domain email yang valid
const VALID_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "yahoo.co.id",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "protonmail.com",
  "mail.com",
  "aol.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "live.com",
  "msn.com",
  "company.com",
  "onedashboard.id",
];

export default function EditUserModal({ user, onClose, onSave }) {
  // === FORMAT TANGGAL UTIL ===
  const toInputFormat = (val) => {
    if (!val) return "";
    if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
      const [day, month, year] = val.split("-");
      return `${year}-${month}-${day}`; // buat input type=date
    }
    const d = new Date(val);
    if (isNaN(d)) return "";
    return d.toISOString().split("T")[0];
  };

  const toBackendFormat = (val) => {
    if (!val) return "";
    const d = new Date(val);
    if (isNaN(d)) return val;
    const day = String(d.getDate()).padStart(2, "0");
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = d.getFullYear();
    return `${day}-${m}-${y}`; // buat dikirim ke backend
  };

  // === STATE ===
  const [formData, setFormData] = useState({
    nama: user?.nama || "",
    email: user?.email || "",
    tanggal_lahir: toInputFormat(user?.tanggal_lahir),
    tanggal_join: toInputFormat(user?.tanggal_join),
    alamat: user?.alamat || "",
    divisi: user?.divisi?.toString() || "",
    level: user?.level?.toString() || "",
    no_telp: user?.no_telp || "",
  });

  const [emailError, setEmailError] = useState("");
  const [emailChanged, setEmailChanged] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);

  // === VALIDASI EMAIL ===
  const validateEmail = (email) => {
    if (!email) {
      setEmailError("");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Format email tidak valid");
      return false;
    }

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) {
      setEmailError("Domain email tidak ditemukan");
      return false;
    }

    const isValidDomain = VALID_EMAIL_DOMAINS.some(
      (validDomain) => domain === validDomain || domain.endsWith(`.${validDomain}`)
    );

    if (!isValidDomain) {
      const suggestedDomain = findClosestDomain(domain);
      setEmailError(
        `Domain "${domain}" tidak valid. ${suggestedDomain ? `Mungkin maksudnya "${suggestedDomain}"?` : "Gunakan domain yang valid seperti @gmail.com, @yahoo.com, dll."}`
      );
      return false;
    }

    setEmailError("");
    return true;
  };

  // === FIND CLOSEST DOMAIN ===
  const findClosestDomain = (inputDomain) => {
    const typoMap = {
      "gmai.com": "gmail.com",
      "gmal.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gmaill.com": "gmail.com",
      "yahooo.com": "yahoo.com",
      "yaho.com": "yahoo.com",
      "hotmai.com": "hotmail.com",
      "hotmial.com": "hotmail.com",
      "outlok.com": "outlook.com",
    };

    if (typoMap[inputDomain]) {
      return typoMap[inputDomain];
    }

    let closest = null;
    let minDistance = Infinity;

    VALID_EMAIL_DOMAINS.forEach((validDomain) => {
      const distance = levenshteinDistance(inputDomain, validDomain);
      if (distance < minDistance && distance <= 2) {
        minDistance = distance;
        closest = validDomain;
      }
    });

    return closest;
  };

  // === LEVENSHTEIN DISTANCE ===
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  };

  // === TOAST NOTIFICATION ===
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

  // === HANDLE INPUT ===
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Real-time email validation
    if (name === "email") {
      validateEmail(value);
      
      // Check if email changed from original
      const originalEmail = user?.email?.toLowerCase().trim();
      const newEmail = value.toLowerCase().trim();
      const hasChanged = originalEmail && newEmail && originalEmail !== newEmail;
      setEmailChanged(hasChanged);
      
      if (hasChanged) {
        setShowEmailWarning(true);
      } else {
        setShowEmailWarning(false);
      }
    }
  };

  // === SUBMIT ===
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

    // Validasi email format dan domain
    if (!validateEmail(formData.email.trim())) {
      showToast(emailError || "Email tidak valid!", "error");
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

    if (!formData.no_telp || formData.no_telp.trim().length < 10) {
      showToast("Nomor telepon minimal 10 digit!", "error");
      return;
    }

    // WARNING: Jika email berubah, konfirmasi dulu
    const originalEmail = user?.email?.toLowerCase().trim();
    const newEmail = formData.email.toLowerCase().trim();
    if (originalEmail && newEmail && originalEmail !== newEmail) {
      const confirmed = window.confirm(
        `PERINGATAN: Email akan diubah dari "${user.email}" ke "${formData.email}".\n\n` +
        `IMPORTANT: Pastikan backend juga mengupdate email di tabel authentication/login.\n\n` +
        `Jika tidak, user tidak bisa login dengan email baru dan harus tetap pakai email lama.\n\n` +
        `Lanjutkan perubahan email?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    // Build payload sesuai requirement API PUT /api/admin/users/{id}
    // Format: semua field required, tanggal format dd-mm-yyyy, divisi & level integer
    const payload = {
      nama: formData.nama.trim(),
      email: formData.email.trim(),
      tanggal_lahir: toBackendFormat(formData.tanggal_lahir), // Format: dd-mm-yyyy
      tanggal_join: toBackendFormat(formData.tanggal_join), // Format: dd-mm-yyyy
      alamat: formData.alamat.trim(),
      divisi: String(formData.divisi), // String sesuai backend
      level: String(formData.level), // String sesuai backend
      no_telp: formData.no_telp.trim(),
    };

    console.log("Payload update user:", payload);

    try {
      await onSave(payload);
      showToast("Perubahan berhasil disimpan!");
      onClose();
    } catch (err) {
      console.error("Error update user:", err);
      showToast(err.message || "Gagal menyimpan perubahan", "error");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Edit User</h2>
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
                  onBlur={() => validateEmail(formData.email)}
                  placeholder="contoh@gmail.com"
                  className={emailError ? "input-error" : emailChanged ? "input-warning" : ""}
                  style={{
                    borderColor: emailError 
                      ? "#ef4444" 
                      : emailChanged 
                      ? "#f59e0b" 
                      : "",
                    borderWidth: (emailError || emailChanged) ? "2px" : "1px",
                  }}
                />
                {emailError && (
                  <p
                    style={{
                      color: "#ef4444",
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                      marginBottom: 0,
                    }}
                  >
                    {emailError}
                  </p>
                )}
                {!emailError && formData.email && !emailChanged && (
                  <p
                    style={{
                      color: "#10b981",
                      fontSize: "0.875rem",
                      marginTop: "0.25rem",
                      marginBottom: 0,
                    }}
                  >
                    ✓ Email valid
                  </p>
                )}
                {showEmailWarning && emailChanged && !emailError && (
                  <div
                    style={{
                      backgroundColor: "#fef3c7",
                      border: "1px solid #f59e0b",
                      borderRadius: "6px",
                      padding: "0.75rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <p
                      style={{
                        color: "#92400e",
                        fontSize: "0.875rem",
                        margin: 0,
                        fontWeight: "500",
                        marginBottom: "0.25rem",
                      }}
                    >
                      Email akan diubah dari "{user?.email}" ke "{formData.email}"
                    </p>
                    <p
                      style={{
                        color: "#78350f",
                        fontSize: "0.75rem",
                        margin: 0,
                        lineHeight: "1.4",
                      }}
                    >
                      <strong>PENTING:</strong> Pastikan backend mengupdate email di tabel authentication/login juga. 
                      Jika tidak, user tidak bisa login dengan email baru dan harus tetap pakai email lama.
                    </p>
                  </div>
                )}
                <p
                  style={{
                    color: "#6b7280",
                    fontSize: "0.75rem",
                    marginTop: "0.5rem",
                    marginBottom: 0,
                  }}
                >
                  Domain yang valid: @gmail.com, @yahoo.com, @hotmail.com, @outlook.com, dll.
                </p>
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
                  rows="2"
                  value={formData.alamat}
                  onChange={handleChange}
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
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
