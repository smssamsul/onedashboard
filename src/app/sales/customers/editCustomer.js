"use client";

import { useState, useRef, useEffect } from "react";
import "@/styles/sales/customer.css";
import { toastSuccess, toastError } from "@/lib/toast";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

// Helper untuk format tanggal lahir dengan pemisah untuk input date
const formatTanggalLahirForInput = (tanggal) => {
  if (!tanggal) return "";
  // Jika formatnya sudah YYYY-MM-DD (dari API/DB biasanya begini jika tipe DATE)
  if (/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return tanggal;
  }
  // Jika formatnya DD-MM-YYYY (custom format frontend)
  if (/^\d{2}-\d{2}-\d{4}$/.test(tanggal)) {
    const [day, month, year] = tanggal.split("-");
    return `${year}-${month}-${day}`;
  }
  return tanggal;
};

export default function EditCustomerModal({ customer, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nama: customer.nama || "",
    nama_panggilan: customer.nama_panggilan || "",
    sapaan: customer.sapaan || "",
    email: customer.email || "",
    wa: customer.wa || "",
    wa2: customer.wa2 || "",
    instagram: customer.instagram?.replace(/^@/, "") || "",
    profesi: customer.profesi || "",
    pendapatan_bln: customer.pendapatan_bln || "",
    industri_pekerjaan: customer.industri_pekerjaan || "",
    jenis_kelamin: customer.jenis_kelamin || "l",
    tanggal_lahir: formatTanggalLahirForInput(customer.tanggal_lahir || ""),
    provinsi: customer.provinsi || "",
    kabupaten: customer.kabupaten || "",
    kecamatan: customer.kecamatan || "",
    kode_pos: customer.kode_pos || ""
  });

  const [loading, setLoading] = useState(false);

  // Search Region State
  // Initialize search term with existing address if available
  const initialSearchTerm = customer.kecamatan
    ? `${customer.kecamatan}, ${customer.kabupaten}, ${customer.provinsi}`
    : "";

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);

  // Validasi WA minimal 10 digit
  const validatePhone = (phone) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 10;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Instagram auto-format
    if (name === "instagram") {
      let val = value;
      if (val && !val.startsWith("@")) val = "@" + val.replace(/^@+/, "");
      setFormData({ ...formData, instagram: val });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  // Region Search Handler
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Reset region fields if search changes manually specific logic could typically clear 
    // the region data here, but for edit mode, we might want to keep old data until new selection?
    // Let's behave like addCustomer: typing clears specific "valid" state implicitly unless re-selected.
    // But to keep it simple: we just update search term. Selection overwrites formData.

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/region/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.data);
          setShowResults(true);
        }
      } catch (err) {
        // Silent error
      } finally {
        setIsSearching(false);
      }
    }, 300); // Fast debounce
  };

  const handleSelectRegion = (item) => {
    setFormData({
      ...formData,
      provinsi: item.provinsi,
      kabupaten: item.kota,
      kecamatan: item.kecamatan,
      // Kode pos set empty as per requirement to remove it, or use item data if needed in backend
      kode_pos: ""
    });
    setSearchTerm(`${item.kecamatan}, ${item.kota}, ${item.provinsi}`);
    setShowResults(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhone(formData.wa)) {
      toastError("Nomor WA harus minimal 10 angka!");
      return;
    }

    // Validate Region
    if (!formData.provinsi || !formData.kabupaten || !formData.kecamatan) {
      toastError("Mohon cari dan pilih Kecamatan/Kota dari list!");
      return;
    }

    // Convert YYYY-MM-DD to DD-MM-YYYY for Backend (if changed)
    let finalTanggalLahir = formData.tanggal_lahir;
    if (finalTanggalLahir && finalTanggalLahir.includes("-")) {
      const parts = finalTanggalLahir.split("-");
      // Check if format is YYYY-MM-DD
      if (parts[0].length === 4) {
        const [year, month, day] = parts;
        finalTanggalLahir = `${day}-${month}-${year}`;
      }
    }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      // Prepare payload
      const payload = {
        ...formData,
        kode_pos: "", // Enforce empty string
        tanggal_lahir: finalTanggalLahir
      };

      const res = await fetch(`${BASE_URL}/sales/customer/${customer.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Gagal memperbarui data");

      toastSuccess("Berhasil memperbarui data customer");
      setTimeout(() => {
        onSuccess(data.message || "Data customer berhasil diperbarui", data.data);
        onClose();
      }, 1000);
    } catch (err) {
      toastError("Gagal memperbarui data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* HEADER */}
        <div className="modal-header">
          <h2>Edit Data Customer</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="pi pi-times"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body modal-body--form">
          <form onSubmit={handleSubmit} className="customer-edit-form">
            {/* Primary Fields - Contact Information */}
            <div className="form-section">
              <div className="form-group form-group--primary">
                <label>Sapaan</label>
                <select name="sapaan" value={formData.sapaan} onChange={handleChange}>
                  <option value="">Pilih Sapaan</option>
                  <option value="Mas">Mas</option>
                  <option value="Mba">Mba</option>
                  <option value="Pak">Pak</option>
                  <option value="Bu">Bu</option>
                  <option value="Kak">Kak</option>
                </select>
              </div>

              <div className="form-group form-group--primary">
                <label>Nama</label>
                <input name="nama" value={formData.nama} onChange={handleChange} required />
              </div>

              <div className="form-group form-group--primary">
                <label>Email</label>
                <input name="email" value={formData.email} onChange={handleChange} required />
              </div>

              <div className="form-group form-group--primary">
                <label>WA</label>
                <input
                  name="wa"
                  value={formData.wa}
                  onChange={handleChange}
                  required
                  placeholder="cth: 081234567890"
                />
              </div>

              <div className="form-group form-group--primary">
                <label>WA 2 (Opsional)</label>
                <input
                  name="wa2"
                  value={formData.wa2}
                  onChange={handleChange}
                  placeholder="cth: 081234567890"
                />
              </div>
            </div>

            {/* Secondary Fields - Personal Details */}
            <div className="form-section">
              <div className="form-group form-group--secondary">
                <label>Nama Panggilan</label>
                <input
                  name="nama_panggilan"
                  value={formData.nama_panggilan}
                  onChange={handleChange}
                  placeholder="cth: Budi"
                />
              </div>

              <div className="form-group form-group--secondary">
                <label>Instagram</label>
                <input
                  name="instagram"
                  value={formData.instagram}
                  onChange={handleChange}
                  placeholder="@username"
                />
              </div>

              <div className="form-group form-group--secondary">
                <label>Profesi</label>
                <input name="profesi" value={formData.profesi} onChange={handleChange} />
              </div>

              <div className="form-group form-group--secondary">
                <label>Pendapatan per Bulan</label>
                <select
                  name="pendapatan_bln"
                  value={formData.pendapatan_bln}
                  onChange={handleChange}
                >
                  <option value="">Pilih Range Pendapatan</option>
                  <option value="1-10jt">1 - 10 Juta</option>
                  <option value="10-20jt">10 - 20 Juta</option>
                  <option value="20-30jt">20 - 30 Juta</option>
                  <option value="30-40jt">30 - 40 Juta</option>
                  <option value="40-50jt">40 - 50 Juta</option>
                  <option value="50-60jt">50 - 60 Juta</option>
                  <option value="60-70jt">60 - 70 Juta</option>
                  <option value="70-80jt">70 - 80 Juta</option>
                  <option value="80-90jt">80 - 90 Juta</option>
                  <option value="90-100jt">90 - 100 Juta</option>
                  <option value=">100jt">&gt; 100 Juta</option>
                </select>
              </div>

              <div className="form-group form-group--secondary">
                <label>Industri Pekerjaan</label>
                <input
                  name="industri_pekerjaan"
                  value={formData.industri_pekerjaan}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group form-group--secondary">
                <label>Jenis Kelamin</label>
                <select
                  name="jenis_kelamin"
                  value={formData.jenis_kelamin}
                  onChange={handleChange}
                >
                  <option value="l">Laki-laki</option>
                  <option value="p">Perempuan</option>
                </select>
              </div>
            </div>

            {/* Full Width Fields */}
            <div className="form-section">
              <div className="form-group form-group--full form-group--secondary">
                <label>Tanggal Lahir</label>
                {/* Gunakan type="date" native agar konsisten dengan addCustomer */}
                <input
                  type="date"
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir}
                  onChange={handleChange}
                  placeholder="dd-mm-yyyy"
                />
              </div>

              {/* SINGLE REGION SEARCH - Smart Search (Sat Set) */}
              <div className="form-group form-group--full form-group--secondary" style={{ position: 'relative' }}>
                <label>Cari Kecamatan / Kota <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Ketik nama kecamatan atau kota..."
                    className={isSearching ? "loading-input" : ""}
                    autoComplete="off"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      paddingRight: "30px"
                    }}
                  />
                  {isSearching && (
                    <div style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)" }}>
                      <i className="pi pi-spin pi-spinner" style={{ color: "#9ca3af" }}></i>
                    </div>
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="search-results-dropdown" style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    width: "100%",
                    zIndex: 1000,
                    background: "white",
                    maxHeight: "200px",
                    overflowY: "auto",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0 0 6px 6px"
                  }}>
                    {searchResults.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectRegion(item)}
                        style={{ padding: "10px 15px", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                        onMouseEnter={(e) => e.target.style.background = "#f9fafb"}
                        onMouseLeave={(e) => e.target.style.background = "white"}
                      >
                        <div style={{ fontWeight: "600", fontSize: "14px", color: "#1f2937" }}>{item.kecamatan}</div>
                        <div style={{ fontSize: "12px", color: "#6b7280" }}>{item.kota}, {item.provinsi}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Readonly Fields for Verification */}
              <div className="form-group form-group--secondary">
                <label>Provinsi</label>
                <input
                  value={formData.provinsi}
                  readOnly
                  style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", border: "1px solid #e5e7eb" }}
                />
              </div>

              <div className="form-group form-group--secondary">
                <label>Kabupaten/Kota</label>
                <input
                  value={formData.kabupaten}
                  readOnly
                  style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", border: "1px solid #e5e7eb" }}
                />
              </div>

              <div className="form-group form-group--secondary">
                <label>Kecamatan</label>
                <input
                  value={formData.kecamatan}
                  readOnly
                  style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed", border: "1px solid #e5e7eb" }}
                />
              </div>

            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div className="modal-footer modal-footer--form">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn-save" onClick={handleSubmit} disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>

      </div>
    </div>
  );
}
