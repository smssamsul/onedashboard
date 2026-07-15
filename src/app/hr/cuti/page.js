"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

export default function HrCutiPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [karyawanList, setKaryawanList] = useState([]);
  const [typeList, setTypeList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    karyawan: "",
    type_cuti: "",
    start_date: "",
    end_date: "",
    bulan: "",
    status_cuti: "",
  });

  const [showFilters, setShowFilters] = useState(false);

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

  useEffect(() => {
    if (isAuthorized) {
      loadKaryawanList();
      loadTypeList();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      loadData(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, isAuthorized]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      karyawan: "",
      type_cuti: "",
      start_date: "",
      end_date: "",
      bulan: "",
      status_cuti: "",
    });
  };

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

  const loadTypeList = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("hr/type-cuti?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setTypeList(result.data || []);
      }
    } catch (error) {
      console.error("Error loading type cuti:", error);
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

      let url = `hr/cuti?page=${page}&per_page=15`;

      if (filters.karyawan) {
        url += `&karyawan=${filters.karyawan}`;
      }

      if (filters.type_cuti) {
        url += `&type_cuti=${filters.type_cuti}`;
      }

      if (filters.start_date && filters.end_date) {
        url += `&start_date=${filters.start_date}&end_date=${filters.end_date}`;
      }

      if (filters.bulan) {
        url += `&bulan=${filters.bulan}`;
      }

      if (filters.status_cuti) {
        url += `&status_cuti=${filters.status_cuti}`;
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
    if (status === "disetujui") return "status-approve";
    if (status === "ditolak") return "status-reject";
    return "status-pending";
  };

  const handleApprove = async (id) => {
    if (!confirm("Yakin ingin menyetujui pengajuan cuti ini?")) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(getApiUrl(`hr/cuti/${id}/approve`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(result.message || "Gagal menyetujui cuti.");
        return;
      }

      alert("Pengajuan cuti berhasil disetujui.");
      loadData(pagination.current_page);
    } catch (error) {
      console.error("Error approve cuti:", error);
      alert("Terjadi kesalahan saat menyetujui cuti.");
    }
  };

  const handleReject = async (id) => {
    const alasan_penolakan = prompt(
      "Alasan penolakan (opsional, bisa dikosongkan):"
    );

    if (!confirm("Yakin ingin menolak pengajuan cuti ini?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const response = await fetch(getApiUrl(`hr/cuti/${id}/reject`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ alasan_penolakan }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(result.message || "Gagal menolak cuti.");
        return;
      }

      alert("Pengajuan cuti berhasil ditolak.");
      loadData(pagination.current_page);
    } catch (error) {
      console.error("Error reject cuti:", error);
      alert("Terjadi kesalahan saat menolak cuti.");
    }
  };

  if (!isAuthorized) {
    return (
      <Layout title="Laporan Cuti | HR">
        <div className="cuti-report-page">
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p>Memeriksa akses...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Laporan Cuti | HR">
      <div className="cuti-report-page">
        <div className="page-header">
          <div>
            <h1>Laporan Cuti</h1>
            <p>Manajemen pengajuan cuti karyawan</p>
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
                <label>
                  <User size={14} /> Karyawan
                </label>
                <select
                  value={filters.karyawan}
                  onChange={(e) =>
                    handleFilterChange("karyawan", e.target.value)
                  }
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
                  <Calendar size={14} /> Tanggal Mulai
                </label>
                <input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) =>
                    handleFilterChange("start_date", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Tanggal Akhir
                </label>
                <input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) =>
                    handleFilterChange("end_date", e.target.value)
                  }
                />
              </div>

              <div className="form-group">
                <label>Jenis Cuti</label>
                <select
                  value={filters.type_cuti}
                  onChange={(e) =>
                    handleFilterChange("type_cuti", e.target.value)
                  }
                >
                  <option value="">Semua Jenis</option>
                  {typeList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  <Calendar size={14} /> Bulan (berdasarkan tanggal mulai)
                </label>
                <input
                  type="month"
                  value={filters.bulan}
                  onChange={(e) => handleFilterChange("bulan", e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Status Pengajuan</label>
                <select
                  value={filters.status_cuti}
                  onChange={(e) =>
                    handleFilterChange("status_cuti", e.target.value)
                  }
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
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
              <p>Tidak ada data cuti</p>
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Periode</th>
                      <th>Nama Karyawan</th>
                      <th>Jenis Cuti</th>
                      <th>Status Direksi</th>
                      <th>Status Pengajuan</th>
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
                          {formatDate(item.start_date)} -{" "}
                          {formatDate(item.end_date)}
                        </td>
                        <td>{item.karyawan_rel?.nama || "-"}</td>
                        <td>{item.type_rel?.nama || "-"}</td>
                        <td>
                          {item.approval_direksi ? (
                            <span
                              className={`status-badge ${
                                item.status_approval_direksi === "approved"
                                  ? "status-approve"
                                  : item.status_approval_direksi === "rejected"
                                  ? "status-reject"
                                  : "status-pending"
                              }`}
                            >
                              {item.status_approval_direksi === "approved"
                                ? "Disetujui"
                                : item.status_approval_direksi === "rejected"
                                ? "Ditolak"
                                : "Menunggu"}
                            </span>
                          ) : (
                            <span style={{ color: "#6b7280", fontSize: "12px" }}>-</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${getStatusBadgeClass(
                              item.status_cuti
                            )}`}
                          >
                            {item.status_cuti || "pending"}
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
                              onClick={() => handleApprove(item.id)}
                              disabled={
                                item.status_cuti === "disetujui" ||
                                (item.approval_direksi &&
                                  item.status_approval_direksi !== "approved")
                              }
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="btn-icon btn-reject"
                              title="Tolak"
                              onClick={() => handleReject(item.id)}
                              disabled={item.status_cuti === "ditolak"}
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
          .cuti-report-page {
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
            display: inline-flex;
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

          .btn-secondary {
            background: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .btn-secondary:hover {
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
            padding: 0.9rem 1rem;
            font-size: 0.875rem;
            color: #111827;
            border-bottom: 1px solid #f3f4f6;
            vertical-align: top;
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

          .status-approve {
            background: #dcfce7;
            color: #15803d;
          }

          .status-reject {
            background: #fee2e2;
            color: #b91c1c;
          }

          .status-pending {
            background: #fef3c7;
            color: #92400e;
          }

          .alasan-text {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            font-size: 0.8rem;
            color: #4b5563;
          }

          .action-buttons {
            display: flex;
            gap: 0.4rem;
          }

          .btn-icon {
            width: 30px;
            height: 30px;
            border-radius: 999px;
            border: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.15s, transform 0.1s, opacity 0.1s;
          }

          .btn-icon:hover:not(:disabled) {
            transform: translateY(-1px);
          }

          .btn-approve {
            background: #e0f2fe;
            color: #0369a1;
          }

          .btn-approve:hover:not(:disabled) {
            background: #bae6fd;
          }

          .btn-reject {
            background: #fee2e2;
            color: #b91c1c;
          }

          .btn-reject:hover:not(:disabled) {
            background: #fecaca;
          }

          .btn-icon:disabled {
            opacity: 0.5;
            cursor: not-allowed;
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
            .cuti-report-page {
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
              min-width: 900px;
            }
          }
        `}</style>
      </div>
    </Layout>
  );
}

