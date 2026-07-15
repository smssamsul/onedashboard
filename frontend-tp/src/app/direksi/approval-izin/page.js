"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import {
  Calendar,
  User,
  FileText,
  Filter,
  Check,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";

export default function DireksiApprovalIzinPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    jenis_izin: "",
    status_izin: "pending",
  });

  const [showFilters, setShowFilters] = useState(false);
  const abortControllerRef = useRef(null);
  const filtersRef = useRef(filters);
  const loadingRef = useRef(false);

  // Update ref when filters change
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    const checkAccess = () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(userData);
        const isDireksi = (user.level === "9" || user.level === 9) || (user.divisi === "9" || user.divisi === 9);

        if (!isDireksi) {
          alert("Akses ditolak. Hanya direksi yang dapat mengakses halaman ini.");
          router.push("/login");
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

  const loadData = useCallback(async (page = 1, currentFilters) => {
    // Prevent multiple simultaneous requests
    if (loadingRef.current) {
      return;
    }

    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    loadingRef.current = true;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      let url = `hr/izin?page=${page}&per_page=15`;

      if (currentFilters?.jenis_izin) {
        url += `&jenis_izin=${currentFilters.jenis_izin}`;
      }

      if (currentFilters?.status_izin) {
        url += `&status_izin=${currentFilters.status_izin}`;
      }

      const response = await fetch(getApiUrl(url), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: abortControllerRef.current.signal,
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
      if (error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    // Use a small delay to debounce rapid filter changes
    const timeoutId = setTimeout(() => {
      loadData(1, filtersRef.current);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthorized, filters.jenis_izin, filters.status_izin, loadData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      jenis_izin: "",
      status_izin: "pending",
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.last_page) {
      loadData(newPage);
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

  const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
      return timeString.substring(0, 5);
    } catch {
      return timeString;
    }
  };

  const getJenisIzinLabel = (jenis) => {
    const labels = {
      WFH: "Work From Home",
      izin_telat: "Izin Telat",
      izin_sakit: "Izin Sakit",
    };
    return labels[jenis] || jenis;
  };

  const getStatusBadgeClass = (status) => {
    if (status === "approved") return "status-approve";
    if (status === "rejected") return "status-reject";
    return "status-pending";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      approved: "Disetujui",
      rejected: "Ditolak",
    };
    return labels[status] || status;
  };

  const handleApprove = async (id, status) => {
    const statusLabel = status === "approved" ? "menyetujui" : "menolak";
    if (!confirm(`Yakin ingin ${statusLabel} pengajuan izin ini?`)) return;

    const catatan = prompt(
      `Catatan approval (opsional, bisa dikosongkan):`
    );

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(getApiUrl(`hr/izin/${id}/approve`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          status_izin: status,
          catatan_approval: catatan || null,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(result.message || `Gagal ${statusLabel} izin.`);
        return;
      }

      alert(`Pengajuan izin berhasil di${statusLabel}.`);
      loadData(pagination.current_page, filters);
    } catch (error) {
      console.error(`Error ${statusLabel} izin:`, error);
      alert(`Terjadi kesalahan saat ${statusLabel} izin.`);
    }
  };

  if (!isAuthorized) {
    return (
      <Layout title="Approval Izin | Direksi">
        <div className="approval-izin-page">
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p>Memeriksa akses...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Approval Izin | Direksi">
      <div className="approval-izin-page">
        <div className="page-header">
          <div>
            <h1>Approval Izin</h1>
            <p>Manajemen approval pengajuan izin karyawan</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="form-group">
                <label>Jenis Izin</label>
                <select
                  value={filters.jenis_izin}
                  onChange={(e) =>
                    handleFilterChange("jenis_izin", e.target.value)
                  }
                >
                  <option value="">Semua Jenis</option>
                  <option value="WFH">Work From Home</option>
                  <option value="izin_telat">Izin Telat</option>
                  <option value="izin_sakit">Izin Sakit</option>
                </select>
              </div>

              <div className="form-group">
                <label>Status Pengajuan</label>
                <select
                  value={filters.status_izin}
                  onChange={(e) =>
                    handleFilterChange("status_izin", e.target.value)
                  }
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
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
              <p>Tidak ada data izin</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tanggal/Periode</th>
                      <th>Nama Karyawan</th>
                      <th>Jenis Izin</th>
                      <th>Jam Mulai</th>
                      <th>Status</th>
                      <th>Alasan</th>
                      <th>Aksi</th>
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
                        <td>
                          {item.jenis_izin === "WFH"
                            ? `${formatDate(item.tanggal_mulai)} - ${formatDate(item.tanggal_akhir)}`
                            : formatDate(item.tanggal)}
                        </td>
                        <td>{item.karyawan_rel?.nama || "-"}</td>
                        <td>{getJenisIzinLabel(item.jenis_izin)}</td>
                        <td>
                          {item.jam_mulai ? (
                            <span>
                              <Clock size={14} style={{ marginRight: 4 }} />
                              {formatTime(item.jam_mulai)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${getStatusBadgeClass(
                              item.status_izin
                            )}`}
                          >
                            {getStatusLabel(item.status_izin)}
                          </span>
                        </td>
                        <td style={{ maxWidth: 260 }}>
                          <span className="alasan-text">
                            {item.alasan || "-"}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-icon btn-approve"
                              title="Setujui"
                              onClick={() => handleApprove(item.id, "approved")}
                              disabled={item.status_izin === "approved"}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="btn-icon btn-reject"
                              title="Tolak"
                              onClick={() => handleApprove(item.id, "rejected")}
                              disabled={item.status_izin === "rejected"}
                            >
                              <XIcon size={16} />
                            </button>
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
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="pagination-info">
                    Halaman {pagination.current_page} dari {pagination.last_page}
                  </span>
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .approval-izin-page {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 4px 0;
        }

        .page-header p {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #4f46e5;
          color: white;
        }

        .btn-primary:hover {
          background: #4338ca;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .filters-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .form-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group select:focus {
          outline: none;
          border-color: #4f46e5;
        }

        .filters-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .data-table-container {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .loading-state,
        .empty-state {
          padding: 48px;
          text-align: center;
          color: #6b7280;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
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
          padding: 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          border-bottom: 1px solid #e5e7eb;
        }

        .data-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
          color: #374151;
        }

        .data-table tbody tr:hover {
          background: #f9fafb;
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-approve {
          background: #d1fae5;
          color: #065f46;
        }

        .status-reject {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }

        .alasan-text {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        .btn-icon {
          padding: 6px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-approve {
          background: #d1fae5;
          color: #065f46;
        }

        .btn-approve:hover:not(:disabled) {
          background: #a7f3d0;
        }

        .btn-reject {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-reject:hover:not(:disabled) {
          background: #fecaca;
        }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #f9fafb;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-info {
          font-size: 14px;
          color: #6b7280;
        }
      `}</style>
    </Layout>
  );
}
