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
  Plus,
  Clock,
} from "lucide-react";

export default function HrIzinPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [karyawanList, setKaryawanList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    karyawan: "",
    jenis_izin: "",
    tanggal: "",
    bulan: "",
    status_izin: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    karyawan: "",
    jenis_izin: "",
    tanggal: "",
    tanggal_mulai: "",
    tanggal_akhir: "",
    jam_mulai: "",
    alasan: "",
  });

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
      jenis_izin: "",
      tanggal: "",
      bulan: "",
      status_izin: "",
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

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      let url = `hr/izin?page=${page}&per_page=15`;

      if (filters.karyawan) {
        url += `&karyawan=${filters.karyawan}`;
      }

      if (filters.jenis_izin) {
        url += `&jenis_izin=${filters.jenis_izin}`;
      }

      if (filters.tanggal) {
        url += `&tanggal=${filters.tanggal}`;
      }

      if (filters.bulan) {
        url += `&bulan=${filters.bulan}`;
      }

      if (filters.status_izin) {
        url += `&status_izin=${filters.status_izin}`;
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
      return timeString.substring(0, 5); // Format HH:mm
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/login";
        return;
      }

      const payload = {
        karyawan: formData.karyawan,
        jenis_izin: formData.jenis_izin,
        alasan: formData.alasan,
      };

      if (formData.jenis_izin === "WFH") {
        payload.tanggal_mulai = formData.tanggal_mulai;
        payload.tanggal_akhir = formData.tanggal_akhir;
      } else {
        payload.tanggal = formData.tanggal;
        if (formData.jenis_izin === "izin_telat") {
          payload.jam_mulai = formData.jam_mulai;
        }
      }

      const response = await fetch(getApiUrl("hr/izin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        alert(result.message || "Gagal membuat pengajuan izin.");
        return;
      }

      alert("Pengajuan izin berhasil dibuat.");
      setShowForm(false);
      setFormData({
        karyawan: "",
        jenis_izin: "",
        tanggal: "",
        tanggal_mulai: "",
        tanggal_akhir: "",
        jam_mulai: "",
        alasan: "",
      });
      loadData(pagination.current_page);
    } catch (error) {
      console.error("Error submit izin:", error);
      alert("Terjadi kesalahan saat membuat pengajuan izin.");
    }
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
      loadData(pagination.current_page);
    } catch (error) {
      console.error(`Error ${statusLabel} izin:`, error);
      alert(`Terjadi kesalahan saat ${statusLabel} izin.`);
    }
  };

  if (!isAuthorized) {
    return (
      <Layout title="Laporan Izin | HR">
        <div className="izin-report-page">
          <div style={{ textAlign: "center", padding: "4rem" }}>
            <p>Memeriksa akses...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Laporan Izin | HR">
      <div className="izin-report-page">
        <div className="page-header">
          <div>
            <h1>Laporan Izin</h1>
            <p>Manajemen pengajuan izin karyawan</p>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
            >
              <Plus size={16} /> Tambah Izin
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Tambah Pengajuan Izin</h2>
                <button
                  className="modal-close"
                  onClick={() => setShowForm(false)}
                >
                  <XIcon size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Karyawan *</label>
                  <select
                    value={formData.karyawan}
                    onChange={(e) =>
                      setFormData({ ...formData, karyawan: e.target.value })
                    }
                    required
                  >
                    <option value="">Pilih Karyawan</option>
                    {karyawanList.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Jenis Izin *</label>
                  <select
                    value={formData.jenis_izin}
                    onChange={(e) =>
                      setFormData({ ...formData, jenis_izin: e.target.value })
                    }
                    required
                  >
                    <option value="">Pilih Jenis Izin</option>
                    <option value="WFH">Work From Home</option>
                    <option value="izin_telat">Izin Telat</option>
                    <option value="izin_sakit">Izin Sakit</option>
                  </select>
                </div>

                {formData.jenis_izin === "WFH" && (
                  <>
                    <div className="form-group">
                      <label>Tanggal Mulai *</label>
                      <input
                        type="date"
                        value={formData.tanggal_mulai}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanggal_mulai: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Tanggal Akhir *</label>
                      <input
                        type="date"
                        value={formData.tanggal_akhir}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tanggal_akhir: e.target.value,
                          })
                        }
                        min={formData.tanggal_mulai}
                        required
                      />
                    </div>
                  </>
                )}

                {(formData.jenis_izin === "izin_telat" ||
                  formData.jenis_izin === "izin_sakit") && (
                  <>
                    <div className="form-group">
                      <label>Tanggal *</label>
                      <input
                        type="date"
                        value={formData.tanggal}
                        onChange={(e) =>
                          setFormData({ ...formData, tanggal: e.target.value })
                        }
                        required
                      />
                    </div>
                    {formData.jenis_izin === "izin_telat" && (
                      <div className="form-group">
                        <label>Jam Mulai *</label>
                        <input
                          type="time"
                          value={formData.jam_mulai}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              jam_mulai: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="form-group">
                  <label>Alasan *</label>
                  <textarea
                    value={formData.alasan}
                    onChange={(e) =>
                      setFormData({ ...formData, alasan: e.target.value })
                    }
                    rows={4}
                    placeholder="Masukkan alasan izin (minimal 10 karakter)"
                    required
                    minLength={10}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowForm(false)}
                  >
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
                  <Calendar size={14} /> Bulan
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
                      <th>Status Direksi</th>
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
                              disabled={
                                item.status_izin === "approved" ||
                                (item.approval_direksi &&
                                  item.status_approval_direksi !== "approved")
                              }
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
        .izin-report-page {
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
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .form-group select,
        .form-group input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
        }

        .form-group select:focus,
        .form-group input:focus {
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
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .modal-close {
          padding: 4px;
          border: none;
          background: none;
          cursor: pointer;
          color: #6b7280;
        }

        .modal-content form {
          padding: 20px;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }

        .form-group textarea {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: #4f46e5;
        }
      `}</style>
    </Layout>
  );
}
