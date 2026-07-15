"use client";

import { useState, useEffect } from "react";
import useOrders from "@/hooks/sales/useOrders";
import { api } from "@/lib/api";
import { getProvinces, getCities, getDistricts } from "@/utils/shippingService";
import "@/styles/sales/orders.css";
import "@/styles/sales/pesanan.css";

export default function AddOrders({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    nama: "",
    wa: "",
    email: "",
    alamat_customer: "", // This will now typically handle the full string for display/legacy
    detail_alamat: "", // New field for street/detail
    provinsi: "",
    kabupaten: "",
    kecamatan: "",
    kode_pos: "",
    alamat: "", // Alamat pengiriman (untuk order)
    customer: "",
    produk: "",
    bundling: "", // Diubah dari bundling_id
    harga: "",
    ongkir: "",
    total_harga: "",
    sumber: "",
    notif: true,
    status_pembayaran: null, // null/0 untuk Full, 4 untuk Bertahap
  });

  const [selectedProduct, setSelectedProduct] = useState(null); // To store full product object for bundling check

  const [showCustomerForm, setShowCustomerForm] = useState(false); // Default hidden

  // Region State
  const [regionData, setRegionData] = useState({
    provinces: [],
    cities: [],
    districts: []
  });

  const [selectedRegionIds, setSelectedRegionIds] = useState({
    provinceId: "",
    cityId: "",
    districtId: ""
  });

  const [loadingRegion, setLoadingRegion] = useState({
    provinces: false,
    cities: false,
    districts: false
  });
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [customerResults, setCustomerResults] = useState([]);
  const [productResults, setProductResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [message, setMessage] = useState("");
  const { createOrder } = useOrders();

  // Debounce untuk search customer
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");

  // === Search Customer pakai api() dengan search parameter ===
  const handleSearchCustomer = async (keyword) => {
    if (!keyword || !keyword.trim()) {
      setCustomerResults([]);
      setLoadingSearch(false);
      return;
    }

    setLoadingSearch(true);
    try {
      // Gunakan API dengan parameter search dan per_page untuk hasil maksimal
      const searchKeyword = keyword.trim();
      const params = new URLSearchParams({
        search: searchKeyword,
        page: "1",
        per_page: "100", // Ambil lebih banyak hasil untuk search
      });

      const res = await api(`/sales/customer?${params.toString()}`, { method: "GET", disableToast: true });

      if (res?.success && Array.isArray(res.data)) {
        setCustomerResults(res.data);
      } else {
        setCustomerResults([]);
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      setCustomerResults([]);
    } finally {
      setLoadingSearch(false);
    }
  };

  // === Search Produk pakai api() ===
  const handleSearchProduct = async (keyword) => {
    setProductSearch(keyword);
    if (!keyword.trim()) return setProductResults([]);

    const res = await api("/sales/produk", { method: "GET", disableToast: true });
    if (res?.success && Array.isArray(res.data)) {
      const filtered = res.data.filter((prod) =>
        // Filter hanya produk AKTIF (status === "1" atau status === 1)
        (prod.status === "1" || prod.status === 1) &&
        prod.nama?.toLowerCase().split(" ").some((w) => w.startsWith(keyword.toLowerCase()))
      );
      setProductResults(filtered);
    } else {
      setProductResults([]);
    }
  };

  // Debounce customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 400); // Debounce 400ms

    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Handle search customer dengan debounce
  useEffect(() => {
    if (debouncedCustomerSearch.trim().length >= 2) {
      handleSearchCustomer(debouncedCustomerSearch);
    } else {
      setCustomerResults([]);
      setLoadingSearch(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCustomerSearch]);

  // Load provinces on mount
  useEffect(() => {
    const fetchProvinces = async () => {
      setLoadingRegion(prev => ({ ...prev, provinces: true }));
      try {
        const data = await getProvinces();
        setRegionData(prev => ({ ...prev, provinces: data }));
      } catch (err) {
        console.error("Error loading provinces:", err);
      } finally {
        setLoadingRegion(prev => ({ ...prev, provinces: false }));
      }
    };
    fetchProvinces();
  }, []);

  // Load cities when province selected
  useEffect(() => {
    if (selectedRegionIds.provinceId) {
      const fetchCities = async () => {
        setLoadingRegion(prev => ({ ...prev, cities: true }));
        try {
          const data = await getCities(selectedRegionIds.provinceId);
          setRegionData(prev => ({ ...prev, cities: data }));
        } catch (err) {
          console.error("Error loading cities:", err);
        } finally {
          setLoadingRegion(prev => ({ ...prev, cities: false }));
        }
      };
      fetchCities();
      // Reset child selections
      setRegionData(prev => ({ ...prev, cities: [], districts: [] }));
    } else {
      setRegionData(prev => ({ ...prev, cities: [], districts: [] }));
    }
  }, [selectedRegionIds.provinceId]);

  // Load districts when city selected
  useEffect(() => {
    if (selectedRegionIds.cityId) {
      const fetchDistricts = async () => {
        setLoadingRegion(prev => ({ ...prev, districts: true }));
        try {
          const data = await getDistricts(selectedRegionIds.cityId);
          setRegionData(prev => ({ ...prev, districts: data }));
        } catch (err) {
          console.error("Error loading districts:", err);
        } finally {
          setLoadingRegion(prev => ({ ...prev, districts: false }));
        }
      };
      fetchDistricts();
      // Reset child selections
      setRegionData(prev => ({ ...prev, districts: [] }));
    } else {
      setRegionData(prev => ({ ...prev, districts: [] }));
    }
  }, [selectedRegionIds.cityId]);

  // Handle Region Change
  const handleRegionChange = (field, value) => {
    if (field === "provinsi") {
      const province = regionData.provinces.find(p => String(p.id) === String(value));
      setSelectedRegionIds(prev => ({ ...prev, provinceId: value, cityId: "", districtId: "" }));
      setFormData(prev => ({
        ...prev,
        provinsi: province?.name || "",
        kabupaten: "",
        kecamatan: "",
        kode_pos: ""
      }));
    } else if (field === "kabupaten") {
      const city = regionData.cities.find(c => String(c.id) === String(value));
      setSelectedRegionIds(prev => ({ ...prev, cityId: value, districtId: "" }));
      setFormData(prev => ({
        ...prev,
        kabupaten: city?.name || "",
        kecamatan: "",
        kode_pos: ""
      }));
    } else if (field === "kecamatan") {
      const district = regionData.districts.find(d => String(d.id) === String(value) || String(d.district_id) === String(value));
      setSelectedRegionIds(prev => ({ ...prev, districtId: value }));
      setFormData(prev => ({
        ...prev,
        kecamatan: district?.name || "",
        kode_pos: district?.postal_code || prev.kode_pos || ""
      }));
    }
  };

  useEffect(() => {
    if (productSearch.trim().length >= 2) handleSearchProduct(productSearch);
  }, [productSearch]);

  // === 🧍 Pilih Customer ===
  const handleSelectCustomer = (cust) => {
    setFormData((prev) => ({
      ...prev,
      customer: cust.id,
      nama: cust.nama || "",
      wa: cust.wa || "",
      email: cust.email || "",
      alamat_customer: cust.alamat || "",
      // If customer has structured data, you might want to map it back, but existing API likely returns flat 'alamat'
      // We'll trust the flat address if that's what we have
      alamat: cust.alamat || "",
      // Reset form regional fields to empty as we are using existing customer data
      provinsi: "",
      kabupaten: "",
      kecamatan: "",
      kode_pos: "",
      detail_alamat: ""
    }));
    // Reset search
    setCustomerSearch("");
    setCustomerResults([]);
    setShowCustomerForm(false);
  };

  const resetCustomerSelection = () => {
    setFormData((prev) => ({
      ...prev,
      customer: "",
      nama: "",
      wa: "",
      email: "",
      alamat_customer: "",
      alamat: "",
      provinsi: "",
      kabupaten: "",
      kecamatan: "",
      kode_pos: "",
      detail_alamat: ""
    }));
    setCustomerSearch("");
    setCustomerResults([]);
    // Do not auto show form, let user decide or search again
    setShowCustomerForm(false);
    setSelectedRegionIds({ provinceId: "", cityId: "", districtId: "" });
  };

  // === Format currency helper ===
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "";
    const numValue = typeof value === "string" ? value.replace(/,/g, "") : value;
    const num = Number(numValue);
    if (isNaN(num)) return "";
    return num.toLocaleString("id-ID");
  };

  // === Parse currency to number ===
  const parseCurrency = (value) => {
    if (!value && value !== 0) return 0;
    if (value === "" || value === null || value === undefined) return 0;
    // Remove all non-numeric characters (commas, spaces, etc)
    const numValue = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    if (!numValue || numValue === "") return 0;
    const num = Number(numValue);
    return isNaN(num) ? 0 : num;
  };

  // === Pilih Produk ===
  const handleSelectProduct = async (prod) => {
    setLoading(true);
    try {
      // Fetch full product details to ensure we have bundling_rel and other details
      const res = await api(`/sales/produk/${prod.id}`, { method: "GET", disableToast: true });
      const fullProd = res?.success ? (Array.isArray(res.data) ? res.data[0] : res.data) : prod;

      const currentProd = fullProd || prod;
      const hargaValue = Number(currentProd.harga) || 0;
      const ongkirValue = parseCurrency(formData.ongkir || "");

      setSelectedProduct(currentProd);

      setFormData((prev) => ({
        ...prev,
        produk: currentProd.id,
        bundling: "", // Reset bundling when product changes
        harga: hargaValue ? formatCurrency(hargaValue) : "",
        total_harga: (hargaValue + ongkirValue) > 0 ? formatCurrency(hargaValue + ongkirValue) : "",
      }));
      setProductSearch(currentProd.nama);
      setProductResults([]);
    } catch (err) {
      console.error("Error fetching product details:", err);
      // Fallback to basic product data if fetch fails
      const hargaValue = Number(prod.harga) || 0;
      const ongkirValue = parseCurrency(formData.ongkir || "");
      setSelectedProduct(prod);
      setFormData((prev) => ({
        ...prev,
        produk: prod.id,
        bundling: "",
        harga: hargaValue ? formatCurrency(hargaValue) : "",
        total_harga: (hargaValue + ongkirValue) > 0 ? formatCurrency(hargaValue + ongkirValue) : "",
      }));
      setProductSearch(prod.nama);
      setProductResults([]);
    } finally {
      setLoading(false);
    }
  };

  // === Handle Change ===
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "harga" || name === "ongkir") {
      // Remove all non-numeric characters (including commas)
      const numericValue = value.replace(/\D/g, "");

      // Format with thousand separator if has value
      const formattedValue = numericValue ? formatCurrency(numericValue) : "";

      // Calculate total - parse both values correctly
      // For the field being edited, use the numericValue directly (already cleaned)
      // For the other field, parse from formData (which may have commas)
      let hargaNum = 0;
      let ongkirNum = 0;

      if (name === "harga") {
        hargaNum = numericValue ? Number(numericValue) : 0;
        // Parse ongkir from formData (remove commas and convert to number)
        ongkirNum = parseCurrency(formData.ongkir || "");
      } else {
        // Parse harga from formData (remove commas and convert to number)
        hargaNum = parseCurrency(formData.harga || "");
        ongkirNum = numericValue ? Number(numericValue) : 0;
      }

      const total = hargaNum + ongkirNum;

      setFormData({
        ...formData,
        [name]: formattedValue,
        total_harga: total > 0 ? formatCurrency(total) : "",
      });
    } else if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value || "" });
    }
  };

  // === 💾 Submit ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Construct full address if manual form is used
    let finalAlamat = formData.alamat_customer;

    // Jika menambah customer baru (showCustomerForm is true) dan field regional terisi
    if (showCustomerForm && formData.provinsi) {
      // Construct standard address string: Details, Kecamatan, Kabupaten, Provinsi PostCode
      const parts = [
        formData.detail_alamat,
        formData.kecamatan,
        formData.kabupaten,
        formData.provinsi,
        formData.kode_pos
      ].filter(Boolean);
      finalAlamat = parts.join(", ");
    }

    // Validasi alamat (required untuk order)
    if (!finalAlamat?.trim()) {
      setMessage("Alamat wajib diisi (lengkapi form wilayah atau pilih customer).");
      setLoading(false);
      return;
    }

    // Extract bundling ID correctly if selected
    let bundleId = "";
    if (formData.bundling) {
      // Find the ID from selectedProduct's bundling list
      let bundlingList = [];
      if (Array.isArray(selectedProduct?.bundling_rel)) bundlingList = selectedProduct.bundling_rel;
      else if (selectedProduct?.bundling) {
        if (typeof selectedProduct.bundling === 'string') {
          try { bundlingList = JSON.parse(selectedProduct.bundling); } catch (e) { }
        } else if (Array.isArray(selectedProduct.bundling)) bundlingList = selectedProduct.bundling;
      }

      bundleId = formData.bundling;
    }

    const payload = {
      nama: formData.nama,
      wa: formData.wa,
      email: formData.email,
      alamat: finalAlamat || null,
      provinsi: formData.provinsi || null,
      kabupaten: formData.kabupaten || null,
      kecamatan: formData.kecamatan || null,
      kode_pos: formData.kode_pos || null,
      produk: parseInt(formData.produk, 10),
      harga: String(parseCurrency(formData.harga) || "0"),
      ongkir: String(parseCurrency(formData.ongkir) || "0"),
      total_harga: String(parseCurrency(formData.total_harga) || "0"),
      metode_bayar: "va",
      sumber: formData.sumber || "manual",
      custom_value: [],
      bundling: bundleId ? String(bundleId) : "",
      status_pembayaran: formData.status_pembayaran === 4 ? 4 : (formData.status_pembayaran === null ? null : 0),
    };

    console.log("[ADD_ORDERS] Payload sebelum kirim:", JSON.stringify(payload, null, 2));

    const res = await createOrder(payload);

    if (res?.success) {
      // Sukses tanpa warning
      setMessage(res?.message || "Order berhasil dibuat!");
      onAdd?.(res.data);
      onClose?.();
    } else if (res?.warning && res?.data) {
      // Sukses dengan warning (tetap lanjut, tapi beri tahu)
      console.warn("Order warning:", res.warning);
      setMessage("Order berhasil dibuat!");
      onAdd?.(res.data);
      onClose?.();
    } else {
      setMessage(res?.message || "Gagal membuat order.");
    }

    setLoading(false);
  };

  const customerId = formData.customer;
  const hasSelectedCustomer = Boolean(customerId);
  const isSearchActive = customerSearch.trim().length >= 2;
  // Hanya tampilkan "tidak ditemukan" jika search aktif, tidak ada hasil, DAN belum ada customer terpilih
  const noCustomerFound = isSearchActive && customerResults.length === 0 && !hasSelectedCustomer;

  // Show search input if no customer selected AND we are NOT showing the form
  const showSearchInput = !hasSelectedCustomer && !showCustomerForm;

  // Show the form only if explicitly requested or we are editing
  const displayCustomerForm = showCustomerForm;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card"
        style={{
          width: "min(920px, 95vw)",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Tambah Order</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        <div
          className="modal-body orders-modal-scroll"
          style={{ paddingBottom: "1.75rem", overflowY: "auto", flex: 1 }}
        >
          <form onSubmit={handleSubmit} className="orders-form-grid">
            <div className="orders-columns">
              <section className="orders-section orders-section--customer">
                <div className="orders-panel-header">
                  <div>
                    <h4>Data Customer</h4>
                    <p>Temukan customer atau tambah data baru.</p>
                  </div>
                  {hasSelectedCustomer && !showCustomerForm && (
                    // Tombol Ganti Customer hanya muncul jika sudah ada yang dipilih daN tidak sedang edit form
                    // Tapi sebenarnya Reset lebih cocok jika user ingin membatalkan pilihan total
                    // di sini kita ikuti logic "Change Customer" = Reset
                    <button
                      type="button"
                      className="orders-link-btn"
                      onClick={resetCustomerSelection}
                    >
                      Ganti Customer
                    </button>
                  )}
                </div>

                {showSearchInput && (
                  <label className="orders-field">
                    Cari Customer (Nama / WA / Email)
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          // Jika user mengetik manual, berarti dia mungkin mau cari user lain atau buat baru
                          // Tapi di sini kita biarkan logic default
                        }}
                        placeholder="Ketik minimal 2 huruf untuk mencari..."
                        disabled={loadingSearch}
                      />
                      {loadingSearch && (
                        <div style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "#6b7280",
                          fontSize: "14px"
                        }}>
                          <i className="pi pi-spin pi-spinner"></i>
                        </div>
                      )}
                    </div>
                    <small style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px", display: "block" }}>
                      {customerSearch.trim().length > 0 && customerSearch.trim().length < 2 && "Ketik minimal 2 huruf untuk mencari"}
                      {customerSearch.trim().length >= 2 && !loadingSearch && customerResults.length > 0 && `Ditemukan ${customerResults.length} customer`}
                      {customerSearch.trim().length >= 2 && !loadingSearch && customerResults.length === 0 && "Tidak ada hasil"}
                    </small>
                  </label>
                )}

                {showSearchInput && customerResults.length > 0 && (
                  <div className="orders-suggestion">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="orders-suggestion-item"
                        onClick={() => handleSelectCustomer(c)}
                      >
                        <div style={{ flex: 1 }}>
                          <strong>{c.nama || "-"}</strong>
                          {c.nama_panggilan && c.nama_panggilan !== c.nama && (
                            <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                              ({c.nama_panggilan})
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
                          {c.wa && <span style={{ fontSize: "13px" }}>{c.wa}</span>}
                          {c.email && <span style={{ fontSize: "12px", color: "#6b7280" }}>{c.email}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {noCustomerFound && showSearchInput && (
                  <div className="orders-empty-state" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <i className="pi pi-info-circle" style={{ marginRight: "6px" }}></i>
                      <span>Customer tidak ditemukan.</span>
                    </div>
                    <button
                      type="button"
                      className="orders-btn orders-btn--secondary"
                      onClick={() => setShowCustomerForm(true)}
                      style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                    >
                      + Tambah Data Customer Baru
                    </button>
                  </div>
                )}

                {/* Customer Selected Card */}
                {hasSelectedCustomer && !showCustomerForm && (
                  <div className="customer-selected-card">
                    <div className="customer-selected-header" style={{ display: 'block' }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span className="customer-selected-label" style={{ margin: 0 }}>Customer Terpilih</span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="orders-link-btn"
                            onClick={() => {
                              setShowCustomerForm(true);
                              // Pre-fill region logic could be complex if we don't have IDs, so we keep simple for now or clear regions
                            }}
                            style={{ fontSize: '0.9rem' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="orders-link-btn"
                            onClick={resetCustomerSelection}
                            style={{ fontSize: '0.9rem', color: '#6b7280' }}
                          >
                            Ganti
                          </button>
                        </div>
                      </div>
                      <strong className="customer-selected-name" style={{ fontSize: '1.1rem' }}>{formData.nama || "-"}</strong>
                    </div>
                    <div className="customer-selected-info">
                      <div className="customer-info-item">
                        <span className="customer-info-label">WA:</span>
                        <span className="customer-info-value">{formData.wa || "-"}</span>
                      </div>
                      <div className="customer-info-item">
                        <span className="customer-info-label">Email:</span>
                        <span className="customer-info-value">{formData.email || "-"}</span>
                      </div>
                      {formData.alamat_customer && (
                        <div className="customer-info-item">
                          <span className="customer-info-label">Alamat:</span>
                          <span className="customer-info-value">{formData.alamat_customer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Customer */}
                {displayCustomerForm && (
                  <div className="customer-form-card">
                    <div className="customer-form-header">
                      <h5>{hasSelectedCustomer ? "Edit Data Customer" : "Data Customer Baru"}</h5>
                      <button
                        type="button"
                        className="orders-link-btn"
                        onClick={() => {
                          setShowCustomerForm(false);
                          if (!hasSelectedCustomer) {
                            // If canceling creation and no customer selected, ensure we go back to search
                            setCustomerSearch("");
                          }
                        }}
                      >
                        Batal
                      </button>
                    </div>

                    <div className="customer-form-fields">
                      <label className="orders-field">
                        Nama *
                        <input
                          type="text"
                          name="nama"
                          value={formData.nama}
                          onChange={handleChange}
                          placeholder="Nama customer"
                          required
                        />
                      </label>

                      <div className="orders-dual-grid">
                        <label className="orders-field">
                          WA (gunakan 62) *
                          <input
                            type="text"
                            name="wa"
                            value={formData.wa}
                            onChange={handleChange}
                            placeholder="6281234567890"
                            required
                          />
                        </label>
                        <label className="orders-field">
                          Email
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="email@example.com"
                          />
                        </label>
                      </div>

                      {/* Region Dropdown Fields */}
                      <label className="orders-field">
                        Provinsi *
                        <select
                          value={selectedRegionIds.provinceId}
                          onChange={(e) => handleRegionChange("provinsi", e.target.value)}
                          disabled={loadingRegion.provinces}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                          required
                        >
                          <option value="">Pilih Provinsi</option>
                          {regionData.provinces.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="orders-field">
                        Kabupaten / Kota *
                        <select
                          value={selectedRegionIds.cityId}
                          onChange={(e) => handleRegionChange("kabupaten", e.target.value)}
                          disabled={!selectedRegionIds.provinceId || loadingRegion.cities}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                          required
                        >
                          <option value="">Pilih Kabupaten</option>
                          {regionData.cities.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="orders-field">
                        Kecamatan *
                        <select
                          value={selectedRegionIds.districtId}
                          onChange={(e) => handleRegionChange("kecamatan", e.target.value)}
                          disabled={!selectedRegionIds.cityId || loadingRegion.districts}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                          required
                        >
                          <option value="">Pilih Kecamatan</option>
                          {regionData.districts.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </label>

                      <label className="orders-field">
                        Kode Pos
                        <input
                          type="text"
                          name="kode_pos"
                          value={formData.kode_pos}
                          onChange={handleChange}
                          placeholder="Kode Pos"
                        />
                      </label>

                      <label className="orders-field">
                        Detail Alamat (Jalan, No. Rumah)
                        <textarea
                          name="detail_alamat"
                          rows={2}
                          value={formData.detail_alamat}
                          onChange={handleChange}
                          placeholder="Jalan, Nomor rumah, RT/RW, Patokan..."
                        />
                      </label>

                      {!hasSelectedCustomer && (
                        <p className="customer-hint">
                          <i className="pi pi-info-circle" style={{ marginRight: "6px" }}></i>
                          Simpan order akan otomatis menambahkan customer baru.
                        </p>
                      )}
                    </div>
                  </div>
                )}


              </section>

              <section className="orders-section orders-section--order">
                <div className="orders-panel-header">
                  <div>
                    <h4>Detail Order</h4>
                    <p>Pilih produk dan lengkapi informasi order.</p>
                  </div>
                </div>

                <label className="orders-field">
                  Cari Produk
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Ketik minimal 2 huruf..."
                  />
                </label>

                {productResults.length > 0 && (
                  <div className="orders-suggestion">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="orders-suggestion-item"
                        onClick={() => handleSelectProduct(p)}
                      >
                        <strong>{p.nama}</strong>
                      </button>
                    ))}
                  </div>
                )}

                {/* Produk (ID) removed from display, but retained in state */}

                {/* Bundling Selection */}
                {(() => {
                  if (!selectedProduct) return null;

                  // Extract bundling list (handling both relation and JSON string)
                  let bundlingList = [];
                  if (Array.isArray(selectedProduct.bundling_rel) && selectedProduct.bundling_rel.length > 0) {
                    bundlingList = selectedProduct.bundling_rel;
                  } else if (selectedProduct.bundling) {
                    if (typeof selectedProduct.bundling === 'string') {
                      try { bundlingList = JSON.parse(selectedProduct.bundling); } catch (e) { bundlingList = []; }
                    } else if (Array.isArray(selectedProduct.bundling)) {
                      bundlingList = selectedProduct.bundling;
                    }
                  }

                  if (bundlingList.length === 0) return null;

                  return (
                    <label className="orders-field">
                      Pilih Bundling (Opsional)
                      <select
                        name="bundling"
                        value={formData.bundling}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
                      >
                        <option value="">-- Tanpa Bundling --</option>
                        {bundlingList.map((b) => (
                          <option key={b.id || b.nama} value={b.id || b.nama}>
                            {b.nama_bundling || b.info_bundling || b.nama || `Bundle #${b.id}`}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })()}

                <div className="orders-dual-grid">
                  <label className="orders-field">
                    Harga Produk
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#6b7280",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}>Rp</span>
                      <input
                        type="text"
                        name="harga"
                        value={formData.harga ?? ""}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ paddingLeft: "40px" }}
                        required
                      />
                    </div>
                  </label>
                  <label className="orders-field">
                    Ongkir
                    <div style={{ position: "relative" }}>
                      <span style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#6b7280",
                        fontSize: "14px",
                        fontWeight: "500",
                      }}>Rp</span>
                      <input
                        type="text"
                        name="ongkir"
                        value={formData.ongkir ?? ""}
                        onChange={handleChange}
                        placeholder="0"
                        style={{ paddingLeft: "40px" }}
                      />
                    </div>
                  </label>
                </div>

                <label className="orders-field">
                  Total Harga
                  <div style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute",
                      left: "12px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "#6b7280",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}>Rp</span>
                    <input
                      type="text"
                      name="total_harga"
                      value={formData.total_harga ?? ""}
                      readOnly
                      placeholder="0"
                      style={{ paddingLeft: "40px", background: "#f9fafb" }}
                    />
                  </div>
                </label>

                <label className="orders-field">
                  Sumber Order
                  <select name="sumber" value={formData.sumber} onChange={handleChange}>
                    <option value="">Pilih sumber</option>
                    <option value="website">Website</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sales">Sales</option>
                    <option value="event">Event</option>
                    <option value="zoom">Zoom</option>
                    <option value="offline">Offline</option>
                  </select>
                </label>

                {/* Form Pembayaran */}
                <div className="orders-field" style={{ marginTop: "16px" }}>
                  <label style={{ display: "block", marginBottom: "8px", fontWeight: 500, color: "#374151" }}>
                    Metode Pembayaran
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <label className="orders-radio-option">
                      <input
                        type="radio"
                        name="status_pembayaran"
                        value="0"
                        checked={formData.status_pembayaran === null || formData.status_pembayaran === 0}
                        onChange={(e) => {
                          setFormData({ ...formData, status_pembayaran: null });
                        }}
                      />
                      <div>
                        <strong>Pembayaran Full</strong>
                        <span style={{ display: "block", fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                          Pembayaran dilakukan sekaligus (Lunas)
                        </span>
                      </div>
                    </label>
                    <label className="orders-radio-option">
                      <input
                        type="radio"
                        name="status_pembayaran"
                        value="4"
                        checked={formData.status_pembayaran === 4}
                        onChange={(e) => {
                          setFormData({ ...formData, status_pembayaran: 4 });
                        }}
                      />
                      <div>
                        <strong>Pembayaran Bertahap</strong>
                        <span style={{ display: "block", fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>
                          Pembayaran dilakukan secara bertahap (Down Payment)
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                <label className="orders-checkbox">
                  <input
                    type="checkbox"
                    name="notif"
                    checked={formData.notif}
                    onChange={handleChange}
                  />
                  Kirim notifikasi WhatsApp ke customer
                </label>
              </section>
            </div>

            {message && <p className="orders-error">{message}</p>}

            <div className="orders-modal-footer">
              <button type="button" className="orders-btn orders-btn--ghost" onClick={onClose} disabled={loading}>
                Batal
              </button>
              <button type="submit" className="orders-btn orders-btn--primary" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan Order"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style jsx>{`
        .orders-columns {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
        }
        .orders-section--customer,
        .orders-section--order {
          border: 1px solid #eef2ff;
          border-radius: 16px;
          padding: 20px;
          background: #fff;
        }
        .orders-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }
        .orders-panel-header h4 {
          margin: 0;
        }
        .orders-panel-header p {
          margin: 4px 0 0;
          color: #6b7280;
          font-size: 13px;
        }
        .orders-link-btn {
          border: none;
          background: transparent;
          color: #c85400;
          font-weight: 600;
          cursor: pointer;
        }
        
        .orders-link-btn:hover {
          color: #c85400;
          opacity: 0.8;
        }
        .orders-empty-state {
          background: #fef3c7;
          border: 1px solid #fde68a;
          color: #92400e;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .customer-form-card {
          margin-top: 12px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .customer-selected-card {
          margin: 16px 0;
          padding: 16px;
          border-radius: 12px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
        }
        .customer-selected-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .customer-selected-label {
          display: block;
          font-size: 12px;
          color: #0284c7;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 4px;
        }
        .customer-selected-name {
          display: block;
          font-size: 16px;
          font-weight: 600;
          color: #0c4a6e;
          margin: 0;
        }
        .customer-selected-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .customer-info-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 14px;
        }
        .customer-info-label {
          font-weight: 600;
          color: #475569;
          min-width: 60px;
        }
        .customer-info-value {
          color: #1e293b;
          flex: 1;
        }
        .customer-form-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e5e7eb;
        }
        .customer-form-header h5 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }
        .customer-form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .customer-hint {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }
        .orders-radio-option {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          background: #fff;
        }
        .orders-radio-option:hover {
          border-color: #c85400;
          background: #fff7ed;
        }
        .orders-radio-option input[type="radio"] {
          margin-top: 2px;
          cursor: pointer;
        }
        .orders-radio-option input[type="radio"]:checked + div strong {
          color: #c85400;
        }
        .orders-radio-option:has(input[type="radio"]:checked) {
          border-color: #c85400;
          background: #fff7ed;
        }
        @media (max-width: 640px) {
          .orders-section--customer,
          .orders-section--order {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
