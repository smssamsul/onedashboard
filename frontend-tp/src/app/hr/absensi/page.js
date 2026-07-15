"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import config from "@/config/env";
import {
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export default function AbsensiReportPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [karyawanList, setKaryawanList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Filters
  const [filters, setFilters] = useState({
    karyawan: "",
    tanggal: getTodayDate(), // Default to today
    tanggal_mulai: "",
    tanggal_akhir: "",
    bulan: "",
    status_absensi: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

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

        // Divisi 5 = HR
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

  // Load karyawan list
  useEffect(() => {
    if (isAuthorized) {
      loadKaryawanList();
    }
  }, [isAuthorized]);

  // Load absensi data
  useEffect(() => {
    if (isAuthorized) {
      loadData(1);
    }
  }, [filters, isAuthorized]);

  const loadKaryawanList = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("hr/karyawan?all=true&status=1"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setKaryawanList(result.data || []);
      }
    } catch (error) {
      console.error("Error loading karyawan:", error);
    }
  };

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      let url = `hr/absensi?page=${page}&per_page=15`;

      if (filters.karyawan) {
        url += `&karyawan=${filters.karyawan}`;
      }

      if (filters.tanggal_mulai && filters.tanggal_akhir) {
        url += `&tanggal_mulai=${filters.tanggal_mulai}&tanggal_akhir=${filters.tanggal_akhir}`;
      } else if (filters.tanggal) {
        url += `&tanggal=${filters.tanggal}`;
      }

      if (filters.bulan) {
        url += `&bulan=${filters.bulan}`;
      }

      if (filters.status_absensi) {
        url += `&status_absensi=${filters.status_absensi}`;
      }

      const response = await fetch(getApiUrl(url), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data || []);
        if (result.pagination) {
          setPagination(result.pagination);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      
      if (key === 'bulan' && value) {
        newFilters.tanggal = "";
        newFilters.tanggal_mulai = "";
        newFilters.tanggal_akhir = "";
      } else if (key === 'tanggal' && value) {
        newFilters.bulan = "";
        newFilters.tanggal_mulai = "";
        newFilters.tanggal_akhir = "";
      } else if ((key === 'tanggal_mulai' || key === 'tanggal_akhir') && value) {
        newFilters.tanggal = "";
        newFilters.bulan = "";
      }
      
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      karyawan: "",
      tanggal: "",
      tanggal_mulai: "",
      tanggal_akhir: "",
      bulan: "",
      status_absensi: "",
    });
  };

  const handleExport = async (format) => {
    try {
      setExportLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      let url = `hr/absensi/export?format=${format}`;

      if (filters.karyawan) {
        url += `&karyawan=${filters.karyawan}`;
      }

      if (filters.tanggal_mulai && filters.tanggal_akhir) {
        url += `&tanggal_mulai=${filters.tanggal_mulai}&tanggal_akhir=${filters.tanggal_akhir}`;
      } else if (filters.tanggal) {
        url += `&tanggal=${filters.tanggal}`;
      }

      if (filters.bulan) {
        url += `&bulan=${filters.bulan}`;
      }

      if (filters.status_absensi) {
        url += `&status_absensi=${filters.status_absensi}`;
      }

      const response = await fetch(getApiUrl(url), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `absensi_${new Date().toISOString().split("T")[0]}.${format === "xlsx" ? "xlsx" : format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting:", error);
      alert("Gagal mengekspor data");
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === "Hadir") return "status-hadir";
    if (status === "Telat") return "status-telat";
    return "status-default";
  };

  if (!isAuthorized) {
    return (
      <Layout title="Laporan Absensi | HR">
        <div className="absensi-report-page">
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p>Memeriksa akses...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Laporan Absensi | HR">
      <div className="absensi-report-page">
        <div className="page-header">
          <div>
            <h1>Laporan Absensi</h1>
            <p>Manajemen dan monitoring data absensi karyawan</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> Filter
            </button>
            <div className="export-dropdown">
              <button
                className="btn btn-primary"
                disabled={exportLoading}
                onClick={() => handleExport("xlsx")}
              >
                <Download size={16} />
                {exportLoading ? "Exporting..." : "Export Excel"}
              </button>
              <div className="export-menu">
                <button onClick={() => handleExport("csv")}>Export CSV</button>
                <button onClick={() => handleExport("pdf")}>Export PDF</button>
              </div>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="form-group">
                <label>
                  <User size={14} /> Karyawan
                </label>
                <select
                  value={filters.karyawan}
                  onChange={(e) => handleFilterChange("karyawan", e.target.value)}
                >
                  <option value="">Semua Karyawan</option>
                  {karyawanList.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Tanggal
                </label>
                <input
                  type="date"
                  value={filters.tanggal}
                  onChange={(e) => handleFilterChange("tanggal", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={filters.tanggal_mulai}
                  onChange={(e) => handleFilterChange("tanggal_mulai", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={filters.tanggal_akhir}
                  onChange={(e) => handleFilterChange("tanggal_akhir", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Bulan
                </label>
                <input
                  type="month"
                  value={filters.bulan}
                  onChange={(e) => handleFilterChange("bulan", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>
                  <Clock size={14} /> Status Absensi
                </label>
                <select
                  value={filters.status_absensi}
                  onChange={(e) => handleFilterChange("status_absensi", e.target.value)}
                >
                  <option value="">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Telat">Telat</option>
                </select>
              </div>
            </div>

            <div className="filters-actions">
              <button className="btn btn-secondary" onClick={resetFilters}>
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowFilters(false)}
              >
                Terapkan
              </button>
            </div>
          </div>
        )}

        <div className="data-table-container">
          {loading ? (
            <div className="loading-state">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>Tidak ada data absensi</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tanggal</th>
                      <th>Nama Karyawan</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Status</th>
                      <th>Emosi</th>
                      <th>Lokasi</th>
                      <th>Foto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          {(pagination.current_page - 1) * pagination.per_page + index + 1}
                        </td>
                        <td>{formatDate(item.tanggal)}</td>
                        <td>{item.karyawan_rel?.nama || "-"}</td>
                        <td>{item.check_in || "-"}</td>
                        <td>{item.check_out || "-"}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(item.status_absensi)}`}>
                            {item.status_absensi || "-"}
                          </span>
                        </td>
                        <td>
                          {item.emosi ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontSize: "1.25rem" }}>
                                {item.emosi === "joyful" && "🤩"}
                                {item.emosi === "happy" && "😊"}
                                {item.emosi === "relaxed" && "😌"}
                                {item.emosi === "sad" && "😢"}
                                {item.emosi === "angry" && "😠"}
                              </span>
                              <span style={{ fontSize: "0.875rem", textTransform: "capitalize" }}>
                                {item.emosi}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          {(item.lat_check_in && item.long_check_in) || (item.lat_check_out && item.long_check_out) ? (
                            <button
                              className="location-link"
                              onClick={() => {
                                setSelectedLocation({
                                  checkIn: item.lat_check_in && item.long_check_in ? {
                                    lat: item.lat_check_in,
                                    lng: item.long_check_in,
                                    time: item.check_in
                                  } : null,
                                  checkOut: item.lat_check_out && item.long_check_out ? {
                                    lat: item.lat_check_out,
                                    lng: item.long_check_out,
                                    time: item.check_out
                                  } : null,
                                  karyawan: item.karyawan_rel?.nama || "-",
                                  tanggal: item.tanggal
                                });
                                setShowLocationModal(true);
                              }}
                            >
                              <MapPin size={12} />
                              Lihat Lokasi
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            {item.check_in_photo ? (
                              <img
                                src={`${config.backendUrl}/storage/${item.check_in_photo}`}
                                alt="Check In"
                                onClick={() => {
                                  setSelectedLocation({
                                    photo: `${config.backendUrl}/storage/${item.check_in_photo}`,
                                    title: "Foto Check In",
                                    time: item.check_in,
                                  });
                                  setShowLocationModal(true);
                                }}
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>-</span>
                            )}
                            {item.check_out_photo ? (
                              <img
                                src={`${config.backendUrl}/storage/${item.check_out_photo}`}
                                alt="Check Out"
                                onClick={() => {
                                  setSelectedLocation({
                                    photo: `${config.backendUrl}/storage/${item.check_out_photo}`,
                                    title: "Foto Check Out",
                                    time: item.check_out,
                                  });
                                  setShowLocationModal(true);
                                }}
                                style={{
                                  width: "50px",
                                  height: "50px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pagination.last_page > 1 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => loadData(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    <ChevronLeft size={16} /> Sebelumnya
                  </button>
                  <span className="pagination-info">
                    Halaman {pagination.current_page} dari {pagination.last_page} (Total: {pagination.total})
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => loadData(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                  >
                    Selanjutnya <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Location Modal */}
        {showLocationModal && selectedLocation && selectedLocation.checkIn && (
          <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
            <div className="location-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Lokasi Absensi</h3>
                <button onClick={() => setShowLocationModal(false)} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="location-info">
                  <p><strong>Karyawan:</strong> {selectedLocation.karyawan}</p>
                  <p><strong>Tanggal:</strong> {formatDate(selectedLocation.tanggal)}</p>
                </div>
                
                {selectedLocation.checkIn && (
                  <div className="location-section">
                    <h4>Check In - {selectedLocation.checkIn.time}</h4>
                    <div className="map-container">
                      <iframe
                        width="100%"
                        height="300"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps?q=${selectedLocation.checkIn.lat},${selectedLocation.checkIn.lng}&output=embed&z=15`}
                        allowFullScreen={true}
                        title="Check In Location"
                      />
                    </div>
                    <div className="location-coords">
                      <MapPin size={14} />
                      <span>{selectedLocation.checkIn.lat}, {selectedLocation.checkIn.lng}</span>
                      <a
                        href={`https://www.google.com/maps?q=${selectedLocation.checkIn.lat},${selectedLocation.checkIn.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-link"
                      >
                        Buka di Google Maps
                      </a>
                    </div>
                  </div>
                )}

                {selectedLocation.checkOut && (
                  <div className="location-section">
                    <h4>Check Out - {selectedLocation.checkOut.time}</h4>
                    <div className="map-container">
                      <iframe
                        width="100%"
                        height="300"
                        frameBorder="0"
                        style={{ border: 0 }}
                        src={`https://www.google.com/maps?q=${selectedLocation.checkOut.lat},${selectedLocation.checkOut.lng}&output=embed&z=15`}
                        allowFullScreen={true}
                        title="Check Out Location"
                      />
                    </div>
                    <div className="location-coords">
                      <MapPin size={14} />
                      <span>{selectedLocation.checkOut.lat}, {selectedLocation.checkOut.lng}</span>
                      <a
                        href={`https://www.google.com/maps?q=${selectedLocation.checkOut.lat},${selectedLocation.checkOut.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-link"
                      >
                        Buka di Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowLocationModal(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Photo Modal */}
        {showLocationModal && selectedLocation && selectedLocation.photo && (
          <div className="modal-overlay" onClick={() => setShowLocationModal(false)}>
            <div className="location-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
              <div className="modal-header">
                <h3>{selectedLocation.title}</h3>
                <button onClick={() => setShowLocationModal(false)} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                {selectedLocation.time && (
                  <div className="location-info">
                    <p><strong>Waktu:</strong> {selectedLocation.time}</p>
                  </div>
                )}
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <img
                    src={selectedLocation.photo}
                    alt={selectedLocation.title}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "70vh",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowLocationModal(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .absensi-report-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          gap: 1rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.875rem;
          font-weight: 700;
          color: #111827;
        }

        .page-header p {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
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

        .export-dropdown {
          position: relative;
        }

        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.5rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          display: none;
          flex-direction: column;
          min-width: 150px;
          z-index: 10;
        }

        .export-dropdown:hover .export-menu {
          display: flex;
        }

        .export-menu button {
          padding: 0.75rem 1rem;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.875rem;
          color: #374151;
          transition: background 0.2s;
        }

        .export-menu button:hover {
          background: #f9fafb;
        }

        .filters-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .form-group select,
        .form-group input {
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          transition: border-color 0.2s;
        }

        .form-group select:focus,
        .form-group input:focus {
          outline: none;
          border-color: #6366f1;
        }

        .filters-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .data-table-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .loading-state,
        .empty-state {
          padding: 4rem 2rem;
          text-align: center;
          color: #6b7280;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .empty-state svg {
          color: #d1d5db;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
        }

        .data-table thead {
          background: #f9fafb;
        }

        .data-table th {
          padding: 1rem;
          text-align: left;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 1rem;
          font-size: 0.875rem;
          color: #111827;
          border-bottom: 1px solid #f3f4f6;
        }

        .data-table tbody tr:hover {
          background: #f9fafb;
        }

        .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-hadir {
          background: #d1fae5;
          color: #059669;
        }

        .status-telat {
          background: #fef3c7;
          color: #d97706;
        }

        .status-default {
          background: #e5e7eb;
          color: #6b7280;
        }

        .location-link {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.75rem;
          color: #6366f1;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 0;
          transition: color 0.2s;
        }

        .location-link:hover {
          color: #4f46e5;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
        }

        .location-modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .location-modal .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .location-modal .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .modal-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #111827;
        }

        .location-modal .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .location-info {
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .location-info p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: #374151;
        }

        .location-section {
          margin-bottom: 2rem;
        }

        .location-section:last-child {
          margin-bottom: 0;
        }

        .location-section h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .map-container {
          margin-bottom: 0.75rem;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }

        .location-coords {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
          flex-wrap: wrap;
        }

        .map-link {
          color: #6366f1;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .map-link:hover {
          text-decoration: underline;
        }

        .location-modal .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .pagination-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .absensi-report-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
          }

          .filters-grid {
            grid-template-columns: 1fr;
          }

          .table-wrapper {
            overflow-x: scroll;
          }

          .data-table {
            min-width: 800px;
          }
        }
      `}</style>
    </Layout>
  );
}
