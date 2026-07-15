"use client";

import { useState, useEffect } from "react";
import "@/styles/sales/customer.css";
import { toastSuccess, toastError } from "@/lib/toast";
import { getProvinces, getCities, getDistricts } from "@/utils/shippingService";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

// Helper untuk format tanggal lahir dengan pemisah
const formatTanggalLahirForInput = (tanggal) => {
  if (!tanggal) return "";
  // Jika sudah ada pemisah, biarkan seperti itu
  if (tanggal.includes("-") || tanggal.includes("/")) {
    return tanggal;
  }
  // Jika tidak ada pemisah, format menjadi dd-mm-yyyy
  const digits = tanggal.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 8)}`;
  }
  return tanggal;
};

export default function EditCustomerModal({ customer, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    nama: customer.nama || "",
    nama_panggilan: customer.nama_panggilan || "",
    sapaan: customer.sapaan || "",
    email: customer.email || "",
    instagram: customer.instagram?.replace(/^@/, "") || "",
    profesi: customer.profesi || "",
    pendapatan_bln: customer.pendapatan_bln || "",
    industri_pekerjaan: customer.industri_pekerjaan || "",
    jenis_kelamin: customer.jenis_kelamin || "l",
    tanggal_lahir: formatTanggalLahirForInput(customer.tanggal_lahir || ""),
  });

  // State untuk form wilayah (cascading dropdown)
  // Initialize dari customer data jika ada, atau kosong jika tidak
  const [regionForm, setRegionForm] = useState({
    provinsi: customer.provinsi || "",
    kabupaten: customer.kabupaten || "",
    kecamatan: customer.kecamatan || "",
    kode_pos: customer.kode_pos || ""
  });

  // State untuk cascading dropdown (internal - untuk fetch)
  const [regionData, setRegionData] = useState({
    provinces: [],
    cities: [],
    districts: []
  });

  // State untuk selected IDs (internal - hanya untuk fetch, tidak disimpan)
  // Initialize dengan mencari ID dari nama yang ada di customer
  const [selectedRegionIds, setSelectedRegionIds] = useState({
    provinceId: "",
    cityId: "",
    districtId: ""
  });

  // Loading states
  const [loadingRegion, setLoadingRegion] = useState({
    provinces: false,
    cities: false,
    districts: false
  });

  const [loading, setLoading] = useState(false);

  // 🔹 Validasi WA minimal 10 digit
  const validatePhone = (phone) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length >= 10;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // format tanggal lahir otomatis dd-mm-yyyy dengan pemisah
    if (name === "tanggal_lahir") {
      let digits = value.replace(/\D/g, ""); // hanya angka
      let formatted = "";

      if (digits.length > 0) {
        formatted = digits.slice(0, 2); // hari
        if (digits.length > 2) {
          formatted += "-" + digits.slice(2, 4); // bulan
        }
        if (digits.length > 4) {
          formatted += "-" + digits.slice(4, 8); // tahun (maks 4 digit)
        }
      }

      setFormData((prev) => ({
        ...prev,
        [name]: formatted,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: name === "instagram" ? value.replace(/^@/, "") : value,
    }));
  };

  // ==========================================================
  // LOGIC FORM WILAYAH (CASCADING DROPDOWN)
  // ==========================================================

  // Load provinces
  const loadProvinces = async () => {
    setLoadingRegion(prev => ({ ...prev, provinces: true }));
    try {
      const data = await getProvinces();
      setRegionData(prev => ({ ...prev, provinces: data }));
    } catch (err) {
      console.error("Load provinces error:", err);
    } finally {
      setLoadingRegion(prev => ({ ...prev, provinces: false }));
    }
  };

  // Load cities
  const loadCities = async (provinceId) => {
    if (!provinceId) return;

    setLoadingRegion(prev => ({ ...prev, cities: true }));
    try {
      const data = await getCities(provinceId);
      setRegionData(prev => ({ ...prev, cities: data }));
    } catch (err) {
      console.error("Load cities error:", err);
    } finally {
      setLoadingRegion(prev => ({ ...prev, cities: false }));
    }
  };

  // Load districts
  const loadDistricts = async (cityId) => {
    if (!cityId) return;

    setLoadingRegion(prev => ({ ...prev, districts: true }));
    try {
      const data = await getDistricts(cityId);
      setRegionData(prev => ({ ...prev, districts: data }));
    } catch (err) {
      console.error("Load districts error:", err);
    } finally {
      setLoadingRegion(prev => ({ ...prev, districts: false }));
    }
  };

  // Handler untuk update region form (HANYA NAMA)
  const handleRegionChange = (field, value) => {
    if (field === "provinsi") {
      // Konversi value ke string untuk matching yang lebih robust
      const provinceId = String(value || "");
      // Cari province dengan konversi tipe data (handle string/number)
      const province = regionData.provinces.find(p =>
        String(p.id) === provinceId || p.id === value || p.id === Number(value)
      );
      setSelectedRegionIds(prev => ({ ...prev, provinceId: value || "", cityId: "", districtId: "" }));
      setRegionForm(prev => ({
        ...prev,
        provinsi: province?.name || "",
        kabupaten: "",
        kecamatan: "",
        kode_pos: ""
      }));
    } else if (field === "kabupaten") {
      // Konversi value ke string untuk matching yang lebih robust
      const cityId = String(value || "");
      // Cari city dengan konversi tipe data (handle string/number)
      const city = regionData.cities.find(c =>
        String(c.id) === cityId || c.id === value || c.id === Number(value)
      );
      setSelectedRegionIds(prev => ({ ...prev, cityId: value || "", districtId: "" }));
      setRegionForm(prev => ({
        ...prev,
        kabupaten: city?.name || "",
        kecamatan: "",
        kode_pos: ""
      }));
    } else if (field === "kecamatan") {
      // Konversi value ke string untuk matching yang lebih robust
      const districtId = String(value || "");
      // Cari district dengan konversi tipe data (handle string/number dan id/district_id)
      const district = regionData.districts.find(d =>
        String(d.id) === districtId ||
        String(d.district_id) === districtId ||
        d.id === value ||
        d.district_id === value ||
        d.id === Number(value) ||
        d.district_id === Number(value)
      );
      setSelectedRegionIds(prev => ({ ...prev, districtId: value || "" }));
      setRegionForm(prev => ({
        ...prev,
        kecamatan: district?.name || "",
        // Ambil kode pos dari district jika ada, jika tidak pertahankan yang sudah ada atau kosongkan
        kode_pos: district?.postal_code || prev.kode_pos || ""
      }));
    } else if (field === "kode_pos") {
      setRegionForm(prev => ({ ...prev, kode_pos: value }));
    }
  };

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize province ID dari customer data setelah provinces loaded
  useEffect(() => {
    if (regionData.provinces.length > 0 && regionForm.provinsi && !selectedRegionIds.provinceId) {
      // Cari province dengan case-insensitive dan trim untuk menghindari masalah whitespace
      const province = regionData.provinces.find(p =>
        p.name?.trim().toLowerCase() === regionForm.provinsi?.trim().toLowerCase()
      );
      if (province) {
        setSelectedRegionIds(prev => ({ ...prev, provinceId: province.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionData.provinces.length, regionForm.provinsi]);

  // Load cities when province selected
  useEffect(() => {
    if (selectedRegionIds.provinceId) {
      loadCities(selectedRegionIds.provinceId);
      // Reset child selections jika provinsi berubah
      if (selectedRegionIds.cityId) {
        setSelectedRegionIds(prev => ({ ...prev, cityId: "", districtId: "" }));
        setRegionForm(prev => ({ ...prev, kabupaten: "", kecamatan: "", kode_pos: "" }));
      }
    } else {
      setRegionData(prev => ({ ...prev, cities: [], districts: [] }));
      setSelectedRegionIds(prev => ({ ...prev, cityId: "", districtId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionIds.provinceId]);

  // Initialize city ID dari customer data setelah cities loaded
  useEffect(() => {
    if (regionData.cities.length > 0 && regionForm.kabupaten && !selectedRegionIds.cityId) {
      // Cari city dengan case-insensitive dan trim untuk menghindari masalah whitespace
      const city = regionData.cities.find(c =>
        c.name?.trim().toLowerCase() === regionForm.kabupaten?.trim().toLowerCase()
      );
      if (city) {
        setSelectedRegionIds(prev => ({ ...prev, cityId: city.id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionData.cities.length, regionForm.kabupaten]);

  // Load districts when city selected
  useEffect(() => {
    if (selectedRegionIds.cityId) {
      loadDistricts(selectedRegionIds.cityId);
      // Reset child selections jika city berubah
      if (selectedRegionIds.districtId) {
        setSelectedRegionIds(prev => ({ ...prev, districtId: "" }));
        setRegionForm(prev => ({ ...prev, kecamatan: "", kode_pos: "" }));
      }
    } else {
      setRegionData(prev => ({ ...prev, districts: [] }));
      setSelectedRegionIds(prev => ({ ...prev, districtId: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegionIds.cityId]);

  // Initialize district ID dari customer data setelah districts loaded
  useEffect(() => {
    if (regionData.districts.length > 0 && regionForm.kecamatan && !selectedRegionIds.districtId) {
      const district = regionData.districts.find(d => d.name === regionForm.kecamatan);
      if (district) {
        setSelectedRegionIds(prev => ({ ...prev, districtId: district.id || district.district_id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionData.districts.length, regionForm.kecamatan]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validatePhone(formData.wa)) {
      toastError("Nomor WA harus minimal 10 angka!");
      return;
    }

    // Validasi selectedRegionIds terlebih dahulu (ini yang langsung dari dropdown)
    if (!selectedRegionIds.provinceId) {
      toastError("Pilih Provinsi terlebih dahulu!");
      return;
    }
    if (!selectedRegionIds.cityId) {
      toastError("Pilih Kabupaten/Kota terlebih dahulu!");
      return;
    }
    if (!selectedRegionIds.districtId) {
      toastError("Pilih Kecamatan terlebih dahulu!");
      return;
    }

    // Ambil nama dari regionData berdasarkan selectedRegionIds (selalu ambil dari regionData untuk memastikan)
    let provinsi = regionForm.provinsi?.trim() || "";
    let kabupaten = regionForm.kabupaten?.trim() || "";
    let kecamatan = regionForm.kecamatan?.trim() || "";
    let kode_pos = regionForm.kode_pos?.trim() || "";

    // SELALU ambil dari regionData berdasarkan selectedRegionIds untuk memastikan data terbaru
    if (selectedRegionIds.provinceId) {
      const provinceId = String(selectedRegionIds.provinceId);
      const province = regionData.provinces.find(p =>
        String(p.id) === provinceId || p.id === selectedRegionIds.provinceId || p.id === Number(selectedRegionIds.provinceId)
      );
      if (province?.name) {
        provinsi = province.name.trim();
      }
    }

    if (selectedRegionIds.cityId) {
      const cityId = String(selectedRegionIds.cityId);
      const city = regionData.cities.find(c =>
        String(c.id) === cityId || c.id === selectedRegionIds.cityId || c.id === Number(selectedRegionIds.cityId)
      );
      if (city?.name) {
        kabupaten = city.name.trim();
      }
    }

    if (selectedRegionIds.districtId) {
      const districtId = String(selectedRegionIds.districtId);
      const district = regionData.districts.find(d =>
        String(d.id) === districtId ||
        String(d.district_id) === districtId ||
        d.id === selectedRegionIds.districtId ||
        d.district_id === selectedRegionIds.districtId ||
        d.id === Number(selectedRegionIds.districtId) ||
        d.district_id === Number(selectedRegionIds.districtId)
      );
      if (district?.name) {
        kecamatan = district.name.trim();
      }
      // Ambil kode pos juga jika belum terisi
      if (!kode_pos && district?.postal_code) {
        kode_pos = String(district.postal_code).trim();
      }
    }

    // Validasi final - pastikan semua nama terisi
    if (!provinsi) {
      toastError("Provinsi tidak ditemukan. Silakan pilih ulang Provinsi!");
      return;
    }
    if (!kabupaten) {
      toastError("Kabupaten/Kota tidak ditemukan. Silakan pilih ulang Kabupaten/Kota!");
      return;
    }
    if (!kecamatan) {
      toastError("Kecamatan tidak ditemukan. Silakan pilih ulang Kecamatan!");
      return;
    }
    if (!kode_pos) {
      toastError("Kode Pos wajib diisi! Pilih Kecamatan untuk auto-fill atau isi manual.");
      return;
    }

    // Validasi kode pos harus angka
    if (!/^\d+$/.test(kode_pos)) {
      toastError("Kode Pos harus berupa angka!");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("token");

    try {
      // Prepare payload dengan format alamat baru - pastikan semua string
      const payload = {
        ...formData,
        provinsi: provinsi,
        kabupaten: kabupaten,
        kecamatan: kecamatan,
        kode_pos: kode_pos,
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
      if (!res.ok || !data.success) throw new Error(data.message);

      toastSuccess("Berhasil memperbarui data customer");
      setTimeout(() => {
        onSuccess(data.message || "Data customer berhasil diperbarui");
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
                  value={
                    formData.instagram
                      ? formData.instagram.startsWith("@")
                        ? formData.instagram
                        : `@${formData.instagram}`
                      : ""
                  }
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
                <input
                  name="tanggal_lahir"
                  value={formData.tanggal_lahir}
                  onChange={handleChange}
                  placeholder="dd-mm-yyyy"
                  maxLength="10"
                  type="text"
                />
              </div>

              {/* Form Wilayah - Cascading Dropdown */}
              <div className="form-group form-group--full form-group--secondary">
                <label>Provinsi <span style={{ color: "#ef4444" }}>*</span></label>
                <select
                  name="provinsi"
                  value={selectedRegionIds.provinceId}
                  onChange={(e) => handleRegionChange("provinsi", e.target.value)}
                  disabled={loadingRegion.provinces}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: loadingRegion.provinces ? 'not-allowed' : 'pointer',
                    backgroundColor: loadingRegion.provinces ? '#f9fafb' : 'white'
                  }}
                >
                  <option value="">Pilih Provinsi</option>
                  {regionData.provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
                {loadingRegion.provinces && (
                  <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Memuat provinsi...
                  </small>
                )}
              </div>

              <div className="form-group form-group--full form-group--secondary">
                <label>Kabupaten/Kota <span style={{ color: "#ef4444" }}>*</span></label>
                <select
                  name="kabupaten"
                  value={selectedRegionIds.cityId}
                  onChange={(e) => handleRegionChange("kabupaten", e.target.value)}
                  disabled={!selectedRegionIds.provinceId || loadingRegion.cities}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: (!selectedRegionIds.provinceId || loadingRegion.cities) ? 'not-allowed' : 'pointer',
                    backgroundColor: (!selectedRegionIds.provinceId || loadingRegion.cities) ? '#f9fafb' : 'white'
                  }}
                >
                  <option value="">Pilih Kabupaten/Kota</option>
                  {regionData.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
                {loadingRegion.cities && (
                  <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Memuat kabupaten/kota...
                  </small>
                )}
              </div>

              <div className="form-group form-group--full form-group--secondary">
                <label>Kecamatan <span style={{ color: "#ef4444" }}>*</span></label>
                <select
                  name="kecamatan"
                  value={selectedRegionIds.districtId}
                  onChange={(e) => handleRegionChange("kecamatan", e.target.value)}
                  disabled={!selectedRegionIds.cityId || loadingRegion.districts}
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: (!selectedRegionIds.cityId || loadingRegion.districts) ? 'not-allowed' : 'pointer',
                    backgroundColor: (!selectedRegionIds.cityId || loadingRegion.districts) ? '#f9fafb' : 'white'
                  }}
                >
                  <option value="">Pilih Kecamatan</option>
                  {regionData.districts.map((district) => (
                    <option key={district.id || district.district_id} value={district.id || district.district_id}>
                      {district.name}
                    </option>
                  ))}
                </select>
                {loadingRegion.districts && (
                  <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Memuat kecamatan...
                  </small>
                )}
              </div>

              <div className="form-group form-group--full form-group--secondary">
                <label>Kode Pos <span style={{ color: "#ef4444" }}>*</span></label>
                <input
                  type="text"
                  name="kode_pos"
                  value={regionForm.kode_pos}
                  onChange={(e) => handleRegionChange("kode_pos", e.target.value)}
                  disabled={!selectedRegionIds.districtId}
                  required
                  placeholder="Contoh: 12120"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: !selectedRegionIds.districtId ? 'not-allowed' : 'text',
                    backgroundColor: !selectedRegionIds.districtId ? '#f9fafb' : 'white'
                  }}
                />
                {!selectedRegionIds.districtId && (
                  <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                    Pilih kecamatan terlebih dahulu
                  </small>
                )}
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
