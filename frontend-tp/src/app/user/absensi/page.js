"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import config from "@/config/env";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export default function UserAbsensiPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const [filters, setFilters] = useState({
    tanggal: "",
    tanggal_mulai: "",
    tanggal_akhir: "",
    bulan: "",
    status_absensi: "",
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      tanggal: "",
      tanggal_mulai: "",
      tanggal_akhir: "",
      bulan: "",
      status_absensi: "",
    });
  };

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      let url = `user/absensi?page=${page}&per_page=15`;

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
        } else {
          // fallback kalau API mengembalikan all=true tanpa pagination
          setPagination((prev) => ({
            ...prev,
            current_page: 1,
            last_page: 1,
            total: (result.data || []).length,
          }));
        }
      }
    } catch (error) {
      console.error("Error loading absensi:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [filters]);

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

  return (
    <Layout title="Absensi Saya">
      <div className="user-absensi-page">
        <div className="page-header">
          <div>
            <h1>Absensi Saya</h1>
            <p>Laporan absensi pribadi berdasarkan data HR</p>
          </div>
        </div>

        <div className="filters-panel">
          <div className="filters-grid">
            <div className="form-group">
              <label>
                <Calendar size={14} /> Tanggal
              </label>
              <input
                type="date"
                value={filters.tanggal}
                onChange={(e) =>
                  handleFilterChange("tanggal", e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>
                <Calendar size={14} /> Tanggal Mulai
              </label>
              <input
                type="date"
                value={filters.tanggal_mulai}
                onChange={(e) =>
                  handleFilterChange("tanggal_mulai", e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>
                <Calendar size={14} /> Tanggal Akhir
              </label>
              <input
                type="date"
                value={filters.tanggal_akhir}
                onChange={(e) =>
                  handleFilterChange("tanggal_akhir", e.target.value)
                }
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
                onChange={(e) =>
                  handleFilterChange("status_absensi", e.target.value)
                }
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
          </div>
        </div>

        <div className="data-table-container">
          {loading ? (
            <div className="loading-state">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} />
              <p>Belum ada data absensi.</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tanggal</th>
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
                          {(pagination.current_page - 1) *
                            pagination.per_page +
                            index +
                            1}
                        </td>
                        <td>{formatDate(item.tanggal)}</td>
                        <td>{item.check_in || "-"}</td>
                        <td>{item.check_out || "-"}</td>
                        <td>
                          <span
                            className={`status-badge ${getStatusBadgeClass(
                              item.status_absensi
                            )}`}
                          >
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
                          {item.lat_check_in && item.long_check_in ? (
                            <span className="location-text">
                              <MapPin size={12} />
                              {item.lat_check_in}, {item.long_check_in}
                            </span>
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
                                  setSelectedPhoto({
                                    photo: `${config.backendUrl}/storage/${item.check_in_photo}`,
                                    title: "Foto Check In",
                                    time: item.check_in,
                                  });
                                  setShowPhotoModal(true);
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
                                  setSelectedPhoto({
                                    photo: `${config.backendUrl}/storage/${item.check_out_photo}`,
                                    title: "Foto Check Out",
                                    time: item.check_out,
                                  });
                                  setShowPhotoModal(true);
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
                    Halaman {pagination.current_page} dari{" "}
                    {pagination.last_page} (Total: {pagination.total})
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

        <style jsx>{`
          .user-absensi-page {
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
          }

          .page-header h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.75rem;
            font-weight: 700;
            color: #111827;
          }

          .page-header p {
            margin: 0;
            color: #6b7280;
            font-size: 0.9rem;
          }

          .filters-panel {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1.75rem 0;
          }

          .filters-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 1.25rem;
          }

          .form-group {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .form-group label {
            font-size: 0.85rem;
            font-weight: 500;
            color: #374151;
            display: flex;
            align-items: center;
            gap: 0.4rem;
          }

          .form-group input,
          .form-group select {
            padding: 0.6rem 0.75rem;
            border-radius: 8px;
            border: 1px solid #d1d5db;
            font-size: 0.9rem;
            transition: border-color 0.15s, box-shadow 0.15s;
          }

          .form-group input:focus,
          .form-group select:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.2);
          }

          .filters-actions {
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            padding-top: 1rem;
            border-top: 1px solid #e5e7eb;
          }

          .btn {
            padding: 0.55rem 1.25rem;
            border-radius: 999px;
            border: none;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
          }

          .btn-secondary {
            background: #f9fafb;
            color: #111827;
            border: 1px solid #e5e7eb;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #e5e7eb;
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
            padding: 0.9rem 1rem;
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
            border-radius: 999px;
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

          .location-text {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            color: #6b7280;
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
            .user-absensi-page {
              padding: 1rem;
            }

            .table-wrapper {
              overflow-x: scroll;
            }

            .data-table {
              min-width: 800px;
            }
          }
        `}</style>

        {/* Photo Modal */}
        {showPhotoModal && selectedPhoto && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "1rem",
            }}
            onClick={() => setShowPhotoModal(false)}
          >
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "1.5rem",
                width: "100%",
                maxWidth: "800px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>{selectedPhoto.title}</h3>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              {selectedPhoto.time && (
                <div style={{ marginBottom: "1rem" }}>
                  <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                    <strong>Waktu:</strong> {selectedPhoto.time}
                  </p>
                </div>
              )}
              <div style={{ textAlign: "center", flex: 1, overflow: "auto" }}>
                <img
                  src={selectedPhoto.photo}
                  alt={selectedPhoto.title}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "70vh",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </div>
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowPhotoModal(false)}
                  style={{
                    padding: "0.625rem 1.25rem",
                    backgroundColor: "#6366f1",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

