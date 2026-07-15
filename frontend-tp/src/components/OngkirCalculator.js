"use client";

import { useState, useEffect, useRef } from "react";
import { getProvinces, getCities, getDistricts, calculateDomesticCost } from "@/utils/shippingService";
import "@/styles/ongkir.css";

const ORIGIN_DISTRICT_ID = 6204; // Kelapa Dua, Kabupaten Tangerang
const DEFAULT_WEIGHT = 1000;

export default function OngkirCalculator({ 
  originId, 
  onSelectOngkir,
  onAddressChange,
  defaultCourier = "jne",
  mode = "dropdown",
  compact = false,
  /** Kode pos tujuan (angka) — memperkuat akurasi rates Biteship jika diisi */
  destinationPostalCode = "",
}) {
  // State untuk cascading dropdown
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCourier, setSelectedCourier] = useState(defaultCourier || "jne");
  // Weight di-hardcode, tidak perlu state
  
  const [loadingProvinces, setLoadingProvinces] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingCost, setLoadingCost] = useState(false);
  
  const [costResults, setCostResults] = useState([]);
  const [error, setError] = useState("");

  // Courier options - 12 opsi sesuai ketentuan
  const couriers = [
    { value: "jne", label: "JNE" },
    { value: "sicepat", label: "SiCepat" },
    { value: "jnt", label: "JNT" },
    { value: "ninja", label: "Ninja Express" },
    { value: "anteraja", label: "AnterAja" },
    { value: "tiki", label: "TIKI" },
    { value: "pos", label: "POS Indonesia" },
    { value: "lion", label: "Lion Parcel" },
    { value: "wahana", label: "Wahana" },
    { value: "ide", label: "IDE" },
    { value: "sap", label: "SAP Express" },
    { value: "ncs", label: "NCS" },
  ];

  // Load provinces on mount
  useEffect(() => {
    loadProvinces();
  }, []);

  // Load cities when province selected
  useEffect(() => {
    if (selectedProvince) {
      loadCities(selectedProvince);
      // Reset city and district
      setSelectedCity("");
      setSelectedDistrict("");
      setCities([]);
      setDistricts([]);
    } else {
      setCities([]);
      setDistricts([]);
      setSelectedCity("");
      setSelectedDistrict("");
    }
  }, [selectedProvince]);

  // Load districts when city selected
  useEffect(() => {
    if (selectedCity) {
      loadDistricts(selectedCity);
      // Reset district
      setSelectedDistrict("");
      setDistricts([]);
    } else {
      setDistricts([]);
      setSelectedDistrict("");
    }
  }, [selectedCity]);

  // Auto calculate when district or courier changes
  // Weight selalu menggunakan DEFAULT_WEIGHT (hardcode)
  useEffect(() => {
    if (selectedDistrict && selectedCourier) {
      calculateCost(selectedDistrict, selectedCourier, DEFAULT_WEIGHT);
    } else {
      setCostResults([]);
    }
  }, [selectedDistrict, selectedCourier, destinationPostalCode, selectedProvince, selectedCity, provinces, cities, districts]);

  // Call onAddressChange callback when address changes
  // This ensures data from Raja Ongkir (province, city, district) is sent to backend
  useEffect(() => {
    if (onAddressChange) {
      // Get selected names for address
      const provinceName = provinces.find(p => p.id === selectedProvince)?.name || '';
      const cityName = cities.find(c => c.id === selectedCity)?.name || '';
      const districtName = districts.find(d => d.id === selectedDistrict || d.district_id === selectedDistrict)?.name || '';
      
      // Call callback with address data in format expected by landing page
      // Format: { kota, kecamatan, kelurahan, kode_pos }
      onAddressChange({
        provinsi: provinceName,
        kota: cityName,
        kecamatan: districtName,
        kelurahan: cityName, // Use city name as kelurahan/kabupaten
        kode_pos: "" // Kode pos akan diisi manual atau dari field terpisah
      });
    }
  }, [selectedProvince, selectedCity, selectedDistrict, provinces, cities, districts, onAddressChange]);

  const loadProvinces = async () => {
    setLoadingProvinces(true);
    setError("");
    try {
      const data = await getProvinces();
      setProvinces(data);
    } catch (err) {
      console.error("Load provinces error:", err);
      setError("Gagal memuat daftar provinsi");
    } finally {
      setLoadingProvinces(false);
    }
  };

  const loadCities = async (provinceId) => {
    setLoadingCities(true);
    setError("");
    try {
      const data = await getCities(provinceId);
      setCities(data);
    } catch (err) {
      console.error("Load cities error:", err);
      setError("Gagal memuat daftar kota");
    } finally {
      setLoadingCities(false);
    }
  };

  const loadDistricts = async (cityId) => {
    setLoadingDistricts(true);
    setError("");
    try {
      const data = await getDistricts(cityId);
      setDistricts(data);
    } catch (err) {
      console.error("Load districts error:", err);
      setError("Gagal memuat daftar kecamatan");
    } finally {
      setLoadingDistricts(false);
    }
  };

  const calculateCost = async (districtId, courier, weightInGrams) => {
    if (!districtId || !courier || !weightInGrams || weightInGrams <= 0) {
      return;
    }

    setLoadingCost(true);
    setError("");
    setCostResults([]);

    try {
      const provinceName = provinces.find((p) => p.id === selectedProvince)?.name || "";
      const cityName = cities.find((c) => c.id === selectedCity)?.name || "";
      const districtName =
        districts.find((d) => d.id === selectedDistrict || d.district_id === selectedDistrict)?.name || "";
      const destination_search = [districtName, cityName, provinceName].filter(Boolean).join(", ");

      const postalDigits = destinationPostalCode ? String(destinationPostalCode).replace(/\D/g, "") : "";

      const results = await calculateDomesticCost({
        origin: ORIGIN_DISTRICT_ID,
        destination: parseInt(districtId, 10),
        weight: parseInt(weightInGrams, 10),
        courier: courier.toLowerCase(),
        province_id: null,
        destination_search: destination_search || undefined,
        destination_postal_code: postalDigits.length >= 3 ? Number(postalDigits) : undefined,
      });

      setCostResults(results);
      
      if (results.length === 0) {
        setError("Tidak ada data ongkir untuk rute ini");
      } else {
        // Call callback jika ada onSelectOngkir
        if (onSelectOngkir && results.length > 0) {
          // Ambil harga terendah dan info courier/service
          const sortedResults = [...results].sort((a, b) => (a.cost || 0) - (b.cost || 0));
          const cheapest = sortedResults[0];
          const lowestCost = cheapest.cost || 0;
          
          // Kirim info lengkap: { cost, courier, service }
          onSelectOngkir({
            cost: lowestCost,
            courier: cheapest.courier || courier.toUpperCase(),
            service: cheapest.service || '',
            courier_company: cheapest.courier_company,
            courier_type: cheapest.courier_type,
          });
        }
      }
    } catch (err) {
      setError("Gagal menghitung ongkir");
      console.error("Calculate cost error:", err);
    } finally {
      setLoadingCost(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0
    }).format(price);
  };

  // Get selected names for display
  const selectedProvinceName = provinces.find(p => p.id === selectedProvince)?.name || '';
  const selectedCityName = cities.find(c => c.id === selectedCity)?.name || '';
  const selectedDistrictName = districts.find(d => d.id === selectedDistrict || d.district_id === selectedDistrict)?.name || '';

  return (
    <>
      {/* Cascading Dropdown Form - Always Compact */}
      <div style={{ 
        background: "transparent", 
        border: "none", 
        borderRadius: "0", 
        padding: "0",
        marginTop: "16px"
      }}>
        {/* Province Dropdown */}
        <div className="compact-field">
          <label className="compact-label">
            Provinsi <span className="required">*</span>
          </label>
          <select
            className="compact-input"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            disabled={loadingProvinces || loadingCost}
            style={{ 
              appearance: 'auto', 
              cursor: (loadingProvinces || loadingCost) ? 'not-allowed' : 'pointer',
              backgroundColor: (loadingProvinces || loadingCost) ? '#f9fafb' : 'white'
            }}
          >
            <option value="">Pilih Provinsi</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
          {loadingProvinces && (
            <p className="text-sm text-blue-600 mt-1">Memuat provinsi...</p>
          )}
        </div>

        {/* City Dropdown */}
        <div className="compact-field" style={{ marginTop: "16px" }}>
          <label className="compact-label">
            Kota/Kabupaten <span className="required">*</span>
          </label>
          <select
            className="compact-input"
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            disabled={!selectedProvince || loadingCities || loadingCost}
            style={{ 
              appearance: 'auto', 
              cursor: (!selectedProvince || loadingCities || loadingCost) ? 'not-allowed' : 'pointer',
              backgroundColor: (!selectedProvince || loadingCities || loadingCost) ? '#f9fafb' : 'white'
            }}
          >
            <option value="">Pilih Kota/Kabupaten</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          {loadingCities && (
            <p className="text-sm text-blue-600 mt-1">Memuat kota...</p>
          )}
        </div>

        {/* District Dropdown */}
        <div className="compact-field" style={{ marginTop: "16px" }}>
          <label className="compact-label">
            Kecamatan <span className="required">*</span>
          </label>
          <select
            className="compact-input"
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            disabled={!selectedCity || loadingDistricts || loadingCost}
            style={{ 
              appearance: 'auto', 
              cursor: (!selectedCity || loadingDistricts || loadingCost) ? 'not-allowed' : 'pointer',
              backgroundColor: (!selectedCity || loadingDistricts || loadingCost) ? '#f9fafb' : 'white'
            }}
          >
            <option value="">Pilih Kecamatan</option>
            {districts.map((district) => (
              <option key={district.id || district.district_id} value={district.id || district.district_id}>
                {district.name}
              </option>
            ))}
          </select>
          {loadingDistricts && (
            <p className="text-sm text-blue-600 mt-1">Memuat kecamatan...</p>
          )}
        </div>

        {/* Courier Dropdown */}
        <div className="compact-field" style={{ marginTop: "16px" }}>
          <label className="compact-label">
            Kurir <span className="required">*</span>
          </label>
          <select
            className="compact-input"
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
            disabled={loadingCost || !selectedDistrict}
            style={{ 
              appearance: 'auto', 
              cursor: (loadingCost || !selectedDistrict) ? 'not-allowed' : 'pointer',
              backgroundColor: (loadingCost || !selectedDistrict) ? '#f9fafb' : 'white'
            }}
          >
            {couriers.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: "12px 16px",
          background: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: "8px",
          marginTop: "16px"
        }}>
          <p style={{ fontSize: "14px", color: "#991b1b", margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Loading Cost */}
      {loadingCost && (
        <div style={{
          padding: "12px",
          textAlign: "center",
          marginTop: "16px"
        }}>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>Menghitung ongkir...</p>
        </div>
      )}
    </>
  );
}
