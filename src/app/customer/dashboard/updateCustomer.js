"use client";

import { useState, useEffect, useRef } from "react";

// Update customer menggunakan endpoint /api/customer/customer
async function updateCustomer(payload) {
  const token = localStorage.getItem("customer_token");

  if (!token) {
    throw new Error("Token tidak ditemukan. Silakan login kembali.");
  }

  try {
    const response = await fetch("/api/customer/customer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data?.success !== true) {
      throw new Error(data?.message || "Gagal mengupdate customer");
    }

    return data;
  } catch (error) {
    console.error("❌ [UPDATE_CUSTOMER] Error:", error);
    throw error;
  }
}
import { getCustomerSession } from "@/lib/customerAuth";

const initialFormState = {
  nama_panggilan: "",
  sapaan: "",
  instagram: "",
  profesi: "",
  pendapatan_bln: "",
  industri_pekerjaan: "",
  jenis_kelamin: "l",
  tanggal_lahir: "",
  password: "",
  alamat: "",
};

const SECTION_CONFIG = [
  {
    title: "Informasi Dasar",
    fields: [
      {
        name: "nama_panggilan",
        label: "Nama Panggilan",
        placeholder: "Masukkan nama panggilan",
        required: true,
      },
      {
        name: "sapaan",
        label: "Sapaan",
        type: "select",
        options: [
          { value: "", label: "Pilih Sapaan" },
          { value: "Mas", label: "Mas" },
          { value: "Mba", label: "Mba" },
          { value: "Pak", label: "Pak" },
          { value: "Bu", label: "Bu" },
          { value: "Kak", label: "Kak" },
        ],
        required: true,
      },
      {
        name: "instagram",
        label: "Instagram",
        placeholder: "@username",
        required: true,
      },
    ],
  },
  {
    title: "Profesi & Pekerjaan",
    fields: [
      {
        name: "profesi",
        label: "Profesi",
        placeholder: "Contoh: Programmer, Wiraswasta, dll",
        required: true,
      },
      {
        name: "pendapatan_bln",
        label: "Pendapatan per Bulan",
        type: "select",
        placeholder: "Pilih Range Pendapatan",
        options: [
          { value: "", label: "Pilih Range Pendapatan" },
          { value: "1-10jt", label: "1 - 10 Juta" },
          { value: "10-20jt", label: "10 - 20 Juta" },
          { value: "20-30jt", label: "20 - 30 Juta" },
          { value: "30-40jt", label: "30 - 40 Juta" },
          { value: "40-50jt", label: "40 - 50 Juta" },
          { value: "50-60jt", label: "50 - 60 Juta" },
          { value: "60-70jt", label: "60 - 70 Juta" },
          { value: "70-80jt", label: "70 - 80 Juta" },
          { value: "80-90jt", label: "80 - 90 Juta" },
          { value: "90-100jt", label: "90 - 100 Juta" },
          { value: ">100jt", label: "> 100 Juta" },
        ],
        required: true,
      },
      {
        name: "industri_pekerjaan",
        label: "Industri Pekerjaan",
        placeholder: "Contoh: Teknologi, Properti, dll",
        fullWidth: true,
        required: true,
      },
    ],
  },
  {
    title: "Data Pribadi",
    fields: [
      {
        name: "jenis_kelamin",
        label: "Jenis Kelamin",
        type: "select",
        options: [
          { value: "l", label: "Laki-laki" },
          { value: "p", label: "Perempuan" },
        ],
        required: true,
      },
      {
        name: "tanggal_lahir",
        label: "Tanggal Lahir",
        type: "date",
        required: true,
      },
    ],
  },
  {
    title: "Alamat",
    fields: [
      {
        name: "alamat",
        label: "Alamat Lengkap",
        type: "textarea",
        placeholder: "Masukkan alamat lengkap Anda...",
        required: true,
        fullWidth: true,
        rows: 3,
      },
    ],
  },
  {
    title: "Keamanan",
    isPasswordSection: true,
    fields: [
      {
        name: "password",
        label: "Password Baru",
        type: "password",
        placeholder: "Masukkan password baru (min. 6 karakter)",
        note: "Isi jika ingin mengganti password",
        required: false, // Ditangani secara dinamis
        fullWidth: true,
      },
    ],
  },
];

export default function UpdateCustomerModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Lengkapi Data Customer",
  requirePassword = true, // Password wajib diisi untuk user dengan password default
  allowClose = true, // Apakah modal bisa ditutup (default true)
}) {
  const [formData, setFormData] = useState(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSubmitting = useRef(false);

  // Fetch customer data from API
  const fetchCustomerDetail = async () => {
    try {
      const token = localStorage.getItem("customer_token");
      if (!token) return;

      const response = await fetch("/api/customer/customer/detail", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });

      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const user = data.data;
        console.log("📥 [UPDATE_CUSTOMER] Fetched detail:", user);

        setFormData((prev) => ({
          ...prev,
          nama_panggilan: user.nama_panggilan || user.nama || prev.nama_panggilan,
          sapaan: user.sapaan || prev.sapaan,
          instagram: user.instagram || prev.instagram,
          profesi: user.profesi || prev.profesi,
          pendapatan_bln: user.pendapatan_bln || prev.pendapatan_bln,
          industri_pekerjaan: user.industri_pekerjaan || prev.industri_pekerjaan,
          jenis_kelamin: user.jenis_kelamin || prev.jenis_kelamin || "l",
          tanggal_lahir: user.tanggal_lahir ? user.tanggal_lahir.slice(0, 10) : prev.tanggal_lahir,
          password: "",
          alamat: user.alamat || prev.alamat,
        }));
      }
    } catch (error) {
      console.error("[UPDATE_CUSTOMER] Failed to fetch customer detail:", error);
    }
  };

  // Initialize data saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      fetchCustomerDetail();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSubmitting.current) return;

    setError("");

    // Validasi: Password wajib diisi jika requirePassword = true
    if (requirePassword && (!formData.password || formData.password.length < 6)) {
      setError("Password baru wajib diisi (minimal 6 karakter)");
      return;
    }

    // Validasi: Nama panggilan wajib
    if (!formData.nama_panggilan?.trim()) {
      setError("Nama panggilan wajib diisi");
      return;
    }

    // Validasi: Alamat wajib diisi
    if (!formData.alamat?.trim()) {
      setError("Alamat lengkap wajib diisi");
      return;
    }

    setLoading(true);
    isSubmitting.current = true;

    try {
      // Prepare payload 
      const payload = {
        ...formData
      };

      // Hapus password kosong agar tidak dikirim ke backend (backend akan menolak password kosong/null)
      if (!payload.password || payload.password.trim() === "") {
        delete payload.password;
      }

      console.log("📤 [UPDATE_CUSTOMER] Sending payload:", payload);
      const result = await updateCustomer(payload);
      console.log("📥 [UPDATE_CUSTOMER] API Response:", result);

      if (typeof onSuccess === "function") {
        // Kirim data dari API response, atau fallback ke formData jika API tidak return data lengkap
        const successData = {
          ...formData,           // Data dari form sebagai fallback
          ...result?.data,       // Override dengan data dari API jika ada
          password: undefined,   // Jangan simpan password
        };
        console.log("✅ [UPDATE_CUSTOMER] Success data to save:", successData);
        onSuccess(successData);
      }
      if (typeof onClose === "function") {
        onClose();
      }
      setFormData(initialFormState);
    } catch (error) {
      setError(error.message || "Gagal menyimpan data. Silakan coba lagi.");
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  if (!isOpen) return null;

  // Handler untuk klik overlay - hanya tutup jika allowClose = true
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && allowClose && typeof onClose === "function") {
      onClose();
    }
  };

  return (
    <div
      className="customer-modal-overlay"
      onClick={handleOverlayClick}
      style={{ cursor: allowClose ? "pointer" : "default" }}
    >
      <div className="customer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="customer-modal__header">
          <h2>{title}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {loading && (
              <span style={{ color: "#6b7280", fontSize: "14px" }}>Menyimpan...</span>
            )}
            {allowClose && (
              <button
                type="button"
                onClick={onClose}
                className="customer-modal__close-btn"
                aria-label="Tutup"
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Info banner */}
        <div className="password-notice">
          <div>
            <strong>{requirePassword ? "Keamanan Akun" : "Lengkapi Data Anda"}</strong>
            <p>
              {requirePassword
                ? "Untuk keamanan akun Anda, silakan buat password baru sebelum melanjutkan."
                : "Silakan lengkapi data profil Anda untuk pengalaman yang lebih baik."}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span> {error}
          </div>
        )}

        <form className="customer-modal__body" onSubmit={handleSubmit}>
          {SECTION_CONFIG.map((section) => {
            // Skip password section jika tidak requirePassword dan section adalah password section
            // Tapi tetap tampilkan dengan note bahwa opsional

            return (
              <div className="form-section" key={section.title}>
                <div className="section-header">
                  <h3 className="section-title">
                    {section.title}
                    {section.isPasswordSection && !requirePassword && (
                      <span style={{ fontSize: "12px", color: "#6b7280", fontWeight: "normal", marginLeft: "8px" }}>
                        (Opsional)
                      </span>
                    )}
                  </h3>
                </div>

                <div className="customer-grid">
                  {section.fields.map((field) => {
                    if (field.type === "textarea") {
                      const value = formData[field.name] ?? "";
                      const isRequired = field.required;
                      const fieldClass = [
                        "form-field",
                        field.fullWidth ? "customer-grid__full" : "",
                      ].filter(Boolean).join(" ");

                      return (
                        <label className={fieldClass} key={field.name}>
                          <span className="field-label">
                            {field.label}
                            {isRequired ? <span className="required"> *</span> : null}
                          </span>
                          <textarea
                            name={field.name}
                            value={value}
                            onChange={handleChange}
                            placeholder={field.placeholder}
                            required={isRequired}
                            rows={field.rows || 3}
                          />
                        </label>
                      );
                    }

                    // Handle regular fields
                    const value = formData[field.name] ?? "";

                    // Override required untuk password field berdasarkan requirePassword prop
                    const isRequired = field.name === "password"
                      ? requirePassword
                      : field.required;

                    const baseProps = {
                      name: field.name,
                      value,
                      onChange: handleChange,
                      placeholder: field.placeholder,
                      required: isRequired,
                    };

                    if (field.type === "textarea") {
                      baseProps.rows = field.rows || 3;
                    }

                    const fieldClass = [
                      "form-field",
                      field.fullWidth ? "customer-grid__full" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <label className={fieldClass} key={field.name}>
                        <span className="field-label">
                          {field.label}
                          {isRequired ? (
                            <span className="required"> *</span>
                          ) : null}
                        </span>

                        {field.type === "select" ? (
                          <select {...baseProps}>
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : field.type === "textarea" ? (
                          <textarea {...baseProps} />
                        ) : (
                          <input type={field.type || "text"} {...baseProps} />
                        )}

                        {field.note && (
                          <p className="field-hint">
                            {field.name === "password" && !requirePassword
                              ? "Kosongkan jika tidak ingin mengganti password"
                              : field.note}
                          </p>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="customer-modal__footer">
            {/* Modal tidak bisa ditutup sebelum submit, jadi tidak ada tombol Batal */}
            <button
              type="submit"
              className="customer-btn customer-btn--primary"
              disabled={loading}
              style={{ width: "100%" }}
            >
              {loading ? "Menyimpan..." : "Simpan Data"}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .customer-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 16, 18, 0.65);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          padding: 1rem;
          overflow-y: auto;
        }

        .customer-modal {
          width: min(720px, 100%);
          max-height: 90vh;
          background: #ffffff;
          border-radius: 24px;
          box-shadow: 0 25px 80px rgba(8, 12, 30, 0.3);
          display: flex;
          flex-direction: column;
          animation: fadeIn 0.3s ease;
          overflow: hidden;
        }

        .customer-modal__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #e5e7eb;
          background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        }

        .customer-modal__header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #111827;
          letter-spacing: -0.02em;
        }

        .customer-modal__close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s ease;
          padding: 0;
        }

        .customer-modal__close-btn:hover:not(:disabled) {
          background: #f3f4f6;
          color: #111827;
        }

        .customer-modal__close-btn:active:not(:disabled) {
          background: #e5e7eb;
        }

        .customer-modal__close-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .customer-modal__body {
          padding: 2rem;
          overflow-y: auto;
          flex: 1;
        }

        .form-section {
          margin-bottom: 2rem;
        }

        .form-section:last-of-type {
          margin-bottom: 0;
        }

        .section-header {
          margin-bottom: 1.25rem;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .customer-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.25rem 1.5rem;
        }

        .customer-grid__full {
          grid-column: 1 / -1;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .required {
          color: #ef4444;
          font-weight: 700;
        }

        input,
        select,
        textarea {
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          font-size: 0.9375rem;
          transition: all 0.2s ease;
          background: #ffffff;
          color: #111827;
          font-family: inherit;
        }

        input:hover,
        select:hover,
        textarea:hover {
          border-color: #d1d5db;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: none;
          border-color: #f1a124;
          background: #fffef9;
          box-shadow: 0 0 0 3px rgba(241, 161, 36, 0.1);
        }

        input::placeholder,
        textarea::placeholder {
          color: #9ca3af;
        }

        select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          padding-right: 2.5rem;
        }

        textarea {
          resize: vertical;
          min-height: 80px;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
          font-style: italic;
        }

        .customer-modal__footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 1.5rem 2rem;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .customer-btn {
          border: none;
          border-radius: 12px;
          padding: 0.875rem 2rem;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }

        .customer-btn--primary {
          background: linear-gradient(135deg, #f1a124 0%, #e8911a 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(241, 161, 36, 0.4);
        }

        .customer-btn--primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(241, 161, 36, 0.5);
        }

        .customer-btn--primary:active:not(:disabled) {
          transform: translateY(0);
        }

        .customer-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .password-notice {
          padding: 16px 24px;
          background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
          border-bottom: 1px solid #fcd34d;
        }

        .password-notice strong {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 4px;
        }

        .password-notice p {
          font-size: 13px;
          color: #a16207;
          margin: 0;
          line-height: 1.4;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #fef2f2;
          border-bottom: 1px solid #fecaca;
          font-size: 14px;
          color: #dc2626;
          font-weight: 500;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .customer-modal-overlay {
            padding: 0;
            align-items: flex-end;
          }

          .customer-modal {
            width: 100%;
            height: 95vh;
            max-height: 95vh;
            border-radius: 20px 20px 0 0;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          .customer-modal__header,
          .customer-modal__body,
          .customer-modal__footer {
            padding: 1.25rem 1rem;
          }

          .customer-modal__header h2 {
            font-size: 1.25rem;
          }

          .customer-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .customer-grid__full {
            grid-column: 1;
          }

          .customer-btn {
            width: 100%;
            padding: 0.75rem 1rem;
          }

          .customer-modal__footer {
            flex-direction: column-reverse;
          }
        }
      `}</style>
    </div>
  );
}

