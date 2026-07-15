"use client";

import { useState, useRef } from "react";
import "@/styles/sales/customer.css";
import { toastSuccess, toastError } from "@/lib/toast";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

export default function AddCustomerModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nama: "",
    nama_panggilan: "",
    sapaan: "",
    email: "",
    wa: "",
    instagram: "",
    profesi: "",
    pendapatan_bln: "",
    industri_pekerjaan: "",
    jenis_kelamin: "l",
    tanggal_lahir: "", // Format: YYYY-MM-DD for input type="date"
    provinsi: "",
    kabupaten: "",
    kecamatan: "",
    kode_pos: "" // Keep in state for consistency, but will be empty string
  });

  const [loading, setLoading] = useState(false);

  // Search Region State
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef(null);

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

    // Reset region fields if search changes manually
    if (formData.kabupaten && value !== `${formData.kecamatan}, ${formData.kabupaten}`) {
      // Optional: logic to clear selected if user types again
    }

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
    });
    setSearchTerm(`${item.kecamatan}, ${item.kota}, ${item.provinsi}`);
    setShowResults(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhone(formData.wa)) {
      toastError("Nomor WA minimal 10 angka!");
      return;
    }

    // Validate Region
    if (!formData.provinsi || !formData.kabupaten || !formData.kecamatan) {
      toastError("Mohon cari dan pilih Kecamatan/Kota dari list!");
      return;
    }

    // Convert YYYY-MM-DD to DD-MM-YYYY for Backend
    let finalTanggalLahir = formData.tanggal_lahir;
    if (finalTanggalLahir && finalTanggalLahir.includes("-")) {
      const [year, month, day] = finalTanggalLahir.split("-");
      if (year.length === 4) {
        finalTanggalLahir = `${day}-${month}-${year}`;
      }
    }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      const payload = {
        ...formData,
        kode_pos: "", // Set empty string as user removed the input
        tanggal_lahir: finalTanggalLahir
      };

      const res = await fetch(`${BASE_URL}/sales/customer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Gagal menambahkan customer");

      toastSuccess(data.message || "Customer berhasil ditambahkan");
      setTimeout(() => {
        onSuccess(data.message || "Customer berhasil ditambahkan");
        onClose();
      }, 1000);
    } catch (err) {
      toastError("Gagal menambahkan customer: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        {/* HEADER */}
        <div className="modal-header">
          <h2>Tambah Customer Baru</h2>
          <button className="modal-close" onClick={onClose}>
            <i className="pi pi-times"></i>
          </button>
        </div>

        {/* BODY */}
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-group">
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

            <div className="form-group">
              <label>Nama</label>
              <input name="nama" value={formData.nama} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Nama Panggilan</label>
              <input
                name="nama_panggilan"
                value={formData.nama_panggilan}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>

            {/* SINGLE REGION SEARCH - THE "SAT SET" FEATURE */}
            <div className="form-group full-width relative">
              <label>Cari Kecamatan / Kota <span style={{ color: "#ef4444" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Ketik nama kecamatan atau kota..."
                  className={isSearching ? "loading-input" : ""}
                  required={!formData.provinsi}
                  autoComplete="off"
                  style={{ paddingRight: "30px", width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px" }}
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
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
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

            {/* Readonly & Manual Fields */}
            <div className="form-group">
              <label>Provinsi</label>
              <input value={formData.provinsi} readOnly style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }} placeholder="Otomatis terisi" />
            </div>

            <div className="form-group">
              <label>Kabupaten/Kota</label>
              <input value={formData.kabupaten} readOnly style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }} placeholder="Otomatis terisi" />
            </div>

            <div className="form-group">
              <label>Kecamatan</label>
              <input value={formData.kecamatan} readOnly style={{ backgroundColor: "#f3f4f6", cursor: "not-allowed" }} placeholder="Otomatis terisi" />
            </div>

            <div className="form-group">
              <label>WA</label>
              <input
                name="wa"
                value={formData.wa}
                onChange={handleChange}
                required
                placeholder="cth: 081234567890"
              />
            </div>

            <div className="form-group">
              <label>Instagram</label>
              <input
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                placeholder="@username"
              />
            </div>

            <div className="form-group">
              <label>Profesi</label>
              <input name="profesi" value={formData.profesi} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Pendapatan per Bulan</label>
              <select name="pendapatan_bln" value={formData.pendapatan_bln} onChange={handleChange}>
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

            <div className="form-group">
              <label>Industri Pekerjaan</label>
              <input
                name="industri_pekerjaan"
                value={formData.industri_pekerjaan}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>Jenis Kelamin</label>
              <select name="jenis_kelamin" value={formData.jenis_kelamin} onChange={handleChange}>
                <option value="l">Laki-laki</option>
                <option value="p">Perempuan</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Tanggal Lahir</label>
              <input
                type="date"
                name="tanggal_lahir"
                value={formData.tanggal_lahir}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }}
              />
            </div>
          </form>
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
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
