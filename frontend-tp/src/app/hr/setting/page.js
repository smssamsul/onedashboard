"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { MapPin, Save, RotateCcw, Navigation, X } from "lucide-react";
import { toast } from "react-hot-toast";

export default function HrSettingPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    lat_absen: "",
    long_long: "",
    radius: "",
  });

  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Check HR access
  useEffect(() => {
    const checkAccess = () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(userData);
        const userDivisi = user?.divisi;

        if (userDivisi !== 5 && userDivisi !== "5" && userDivisi !== "hr") {
          alert("Akses ditolak. Hanya HR yang dapat mengakses halaman ini.");
          router.push("/hr/dashboard");
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error("Error checking access:", error);
        router.push("/login");
      }
    };

    checkAccess();
  }, [router]);

  // Load setting dari backend (tidak tergantung peta)
  useEffect(() => {
    if (!isAuthorized) return;
    loadSetting();
  }, [isAuthorized]);

  // Initialize map - sama seperti backend
  useEffect(() => {
    if (!isAuthorized) return;

    const initMap = () => {
      // Sama seperti backend - langsung init tanpa loading complex
      if (!mapRef.current) return;
      if (typeof window === "undefined" || !window.L) {
        // Retry after a bit if Leaflet not loaded yet
        setTimeout(initMap, 200);
        return;
      }

      // Check if map already exists
      if (mapInstanceRef.current) {
        return;
      }

      // Default location (Jakarta) - sama seperti backend
      const defaultLocation = [-6.2088, 106.8456];

      try {
        // Initialize map - sama seperti backend
        const map = window.L.map(mapRef.current).setView(defaultLocation, 15);

        // Add OpenStreetMap tile layer - sama seperti backend
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add click listener - sama seperti backend
        map.on("click", function (e) {
          placeMarker([e.latlng.lat, e.latlng.lng]);
        });

        mapInstanceRef.current = map;

        // Load existing setting after map is ready
        if (formData.lat_absen && formData.long_long) {
          setTimeout(() => {
            const location = [
              parseFloat(formData.lat_absen),
              parseFloat(formData.long_long)
            ];
            placeMarker(location);
          }, 300);
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        if (mapRef.current) {
          mapRef.current.innerHTML =
            '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #666;">Error loading map.</div>';
        }
      }
    };

    // Start initialization
    const timer = setTimeout(initMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isAuthorized, formData.lat_absen, formData.long_long]);

  const placeMarker = (location) => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;

    // location is [lat, lng] array for Leaflet - sama seperti backend
    if (markerRef.current) {
      markerRef.current.setLatLng(location);
    } else {
      // Create custom icon - sama seperti backend
      const customIcon = window.L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      markerRef.current = window.L.marker(location, {
        draggable: true,
        icon: customIcon,
      }).addTo(map);

      // Add drag listener - sama seperti backend
      markerRef.current.on("dragend", function (e) {
        const pos = markerRef.current.getLatLng();
        updateCoordinates([pos.lat, pos.lng]);
      });
    }

    updateCoordinates(location);
    map.setView(location, map.getZoom());
    updateRadiusCircle();
  };

  const updateCoordinates = (location) => {
    if (Array.isArray(location) && location.length === 2) {
      setFormData((prev) => ({
        ...prev,
        lat_absen: location[0].toFixed(6),
        long_long: location[1].toFixed(6),
      }));
    } else if (location && typeof location.lat === "number") {
      setFormData((prev) => ({
        ...prev,
        lat_absen: location.lat.toFixed(6),
        long_long: location.lng.toFixed(6),
      }));
    }
    updateRadiusCircle();
  };

  const updateRadiusCircle = () => {
    if (!mapInstanceRef.current || !window.L) return;

    const lat = parseFloat(formData.lat_absen);
    const lng = parseFloat(formData.long_long);
    const radius = parseFloat(formData.radius) || 100;

    if (lat && lng) {
      if (radiusCircleRef.current) {
        mapInstanceRef.current.removeLayer(radiusCircleRef.current);
      }

      // Sama seperti backend
      radiusCircleRef.current = window.L.circle([lat, lng], {
        color: "#FF0000",
        fillColor: "#FF0000",
        fillOpacity: 0.35,
        radius: radius,
      }).addTo(mapInstanceRef.current);
    }
  };

  // Update radius circle when radius changes
  useEffect(() => {
    if (markerRef.current && formData.lat_absen && formData.long_long) {
      updateRadiusCircle();
    }
  }, [formData.radius]);

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = [position.coords.latitude, position.coords.longitude];
          placeMarker(location);
          toast.success("Lokasi saat ini berhasil diambil");
        },
        (error) => {
          toast.error("Tidak dapat mengambil lokasi saat ini. Pastikan izin lokasi sudah diberikan.");
          console.error("Error getting location:", error);
        }
      );
    } else {
      toast.error("Browser tidak mendukung geolocation");
    }
  };

  const clearMarker = () => {
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (radiusCircleRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }
    setFormData((prev) => ({
      ...prev,
      lat_absen: "",
      long_long: "",
    }));
  };

  const loadSetting = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(getApiUrl("hr/setting"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = await response.json();

      if (result.success && result.data) {
        const setting = result.data;
        setFormData({
          nama: setting.nama || "",
          lat_absen: setting.lat_absen || "",
          long_long: setting.long_long || "",
          radius: setting.radius || "",
        });

        // Place marker if coordinates exist
        if (setting.lat_absen && setting.long_long) {
          try {
            const location = [parseFloat(setting.lat_absen), parseFloat(setting.long_long)];
            placeMarker(location);
            if (setting.radius) {
              setTimeout(() => updateRadiusCircle(), 100);
            }
          } catch (error) {
            console.error("Error placing marker:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error loading setting:", error);
      toast.error("Gagal memuat setting");
    } finally {
      setLoading(false);
    }
  };

  const saveSetting = async () => {
    const { nama, lat_absen, long_long, radius } = formData;

    if (!nama || !lat_absen || !long_long || !radius) {
      toast.error("Harap lengkapi semua field yang wajib diisi");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      const response = await fetch(getApiUrl("hr/setting"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nama: nama,
          lat_absen: lat_absen,
          long_long: long_long,
          radius: radius,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Setting berhasil disimpan");
      } else {
        toast.error(result.message || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error saving setting:", error);
      toast.error("Terjadi kesalahan saat menyimpan setting");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    if (confirm("Apakah Anda yakin ingin mereset form?")) {
      setFormData({
        nama: "",
        lat_absen: "",
        long_long: "",
        radius: "",
      });
      clearMarker();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([-6.2088, 106.8456], 15);
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!isAuthorized) {
    return (
      <Layout title="Setting | HR">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout title="Setting | HR">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memuat data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Setting Lokasi Absensi | HR">
      {/* Load Leaflet CSS and JS - sama seperti backend */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <Script
        src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
        strategy="lazyOnload"
        onLoad={() => {
          // Map will be initialized in useEffect after Leaflet loads
          console.log("Leaflet loaded");
        }}
      />
      
      <div className="hr-setting-page">
        <div className="setting-card">
          <h3 style={{ margin: "0 0 1.5rem 0" }}>Setting Lokasi Kantor</h3>

          <div className="info-box">
            <p>
              <strong>Petunjuk:</strong>
            </p>
            <p>1. Klik pada peta untuk memilih lokasi kantor</p>
            <p>2. Atau gunakan tombol "Gunakan Lokasi Saya" untuk mendapatkan lokasi saat ini</p>
            <p>3. Atur radius (dalam meter) untuk batas absensi</p>
            <p>4. Klik "Simpan" untuk menyimpan pengaturan</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSetting();
            }}
          >
            <div className="form-group">
              <label>Nama Lokasi *</label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => handleInputChange("nama", e.target.value)}
                placeholder="Contoh: Kantor Pusat"
                required
              />
            </div>

            <div className="form-group">
              <label>Pilih Lokasi di Peta</label>
              <div className="map-container">
                <div ref={mapRef} id="map" style={{ width: "100%", height: "100%" }}></div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={useCurrentLocation}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Navigation size={16} />
                  Gunakan Lokasi Saya
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearMarker}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <X size={16} />
                  Hapus Marker
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="text"
                  value={formData.lat_absen}
                  onChange={(e) => handleInputChange("lat_absen", e.target.value)}
                  placeholder="Contoh: -6.2088"
                  required
                  readOnly
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="text"
                  value={formData.long_long}
                  onChange={(e) => handleInputChange("long_long", e.target.value)}
                  placeholder="Contoh: 106.8456"
                  required
                  readOnly
                />
              </div>
            </div>

            <div className="form-group">
              <label>Radius (meter) *</label>
              <input
                type="number"
                value={formData.radius}
                onChange={(e) => handleInputChange("radius", e.target.value)}
                placeholder="Contoh: 100"
                min="1"
                required
              />
              <small style={{ display: "block", marginTop: "0.25rem", color: "#666", fontSize: "0.75rem" }}>
                Radius dalam meter untuk batas melakukan absensi dari lokasi kantor
              </small>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "2rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Save size={16} />
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .hr-setting-page {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .setting-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

        .form-group input {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .form-group input[readonly] {
          background-color: #f9fafb;
          cursor: not-allowed;
        }

        .map-container {
          width: 100%;
          height: 400px;
          border-radius: 6px;
          border: 1px solid #d1d5db;
          margin-bottom: 1rem;
          position: relative;
          overflow: hidden;
        }

        .map-container #map {
          width: 100%;
          height: 100%;
          border-radius: 6px;
        }

        :global(.leaflet-container) {
          height: 100%;
          width: 100%;
        }

        :global(.leaflet-popup-content-wrapper) {
          border-radius: 6px;
        }

        .info-box {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          margin-bottom: 1rem;
        }

        .info-box p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .info-box strong {
          color: #374151;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4338ca;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        /* Leaflet popup styling */
        :global(.leaflet-popup-content-wrapper) {
          border-radius: 6px;
        }
      `}</style>
    </Layout>
  );
}
