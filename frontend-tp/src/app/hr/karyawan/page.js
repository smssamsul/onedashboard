"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Search, Plus, Edit, Trash2, X } from "lucide-react";
import { getJabatanLabel } from "@/lib/jabatanLabels";

export default function KaryawanPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [departemenList, setDepartemenList] = useState([]);
  const [divisiList, setDivisiList] = useState([]);
  const [shiftList, setShiftList] = useState([]);
  const [direksiList, setDireksiList] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    departemen: "",
    status: "",
  });

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    nama: "",
    jenis_kelamin: "",
    tanggal_lahir: "",
    email: "",
    notelp: "",
    tanggal_join: "",
    tanggal_resign: "",
    departemen: "",
    jabatan: "",
    shift: "",
    status_karyawan: "",
    alamat: "",
    avatar_url: "",
    kuota_cuti: "",
    approval: "",
    status: "1",
  });

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

  // Load initial data
  useEffect(() => {
    if (isAuthorized) {
      loadDivisiList();
      loadShiftList();
      loadDireksiList();
      loadData(1);
    }
  }, [isAuthorized]);

  // Reload when filters change
  useEffect(() => {
    if (isAuthorized) {
      loadData(1);
    }
  }, [filters, isAuthorized]);

  const loadDivisiList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("hr/departemen?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setDivisiList(result.data || []);
      }
    } catch (error) {
      console.error("Error loading divisi:", error);
    }
    // Tetap load departemen untuk filter
    loadDepartemenList();
  };

  const loadDepartemenList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("hr/departemen?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setDepartemenList(result.data || []);
      }
    } catch (error) {
      console.error("Error loading departemen:", error);
    }
  };

  const loadShiftList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("hr/shift?all=true"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setShiftList(result.data || []);
      }
    } catch (error) {
      console.error("Error loading shift:", error);
    }
  };

  const loadDireksiList = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl("hr/karyawan/direksi"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success) {
        setDireksiList(result.data || []);
      }
    } catch (error) {
      console.error("Error loading direksi:", error);
    }
  };

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      let url = `hr/karyawan?page=${page}&per_page=15`;

      if (filters.search) {
        url += `&search=${encodeURIComponent(filters.search)}`;
      }
      if (filters.departemen) {
        url += `&departemen=${filters.departemen}`;
      }
      if (filters.status) {
        url += `&status=${filters.status}`;
      }

      const response = await fetch(getApiUrl(url), {
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

  const openModal = (id = null) => {
    if (id) {
      setEditingId(id);
      loadKaryawan(id);
    } else {
      setEditingId(null);
      setFormData({
        nama: "",
        jenis_kelamin: "",
        tanggal_lahir: "",
        email: "",
        notelp: "",
        tanggal_join: "",
        tanggal_resign: "",
        departemen: "",
        jabatan: "",
        shift: "",
        status_karyawan: "",
        alamat: "",
        avatar_url: "",
        kuota_cuti: "",
        status: "1",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const loadKaryawan = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`hr/karyawan/${id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success && result.data) {
        setFormData({
          nama: result.data.nama || "",
          jenis_kelamin: result.data.jenis_kelamin || "",
          tanggal_lahir: result.data.tanggal_lahir || "",
          email: result.data.email || "",
          notelp: result.data.notelp || "",
          tanggal_join: result.data.tanggal_join || "",
          tanggal_resign: result.data.tanggal_resign || "",
          departemen: result.data.departemen || "",
          jabatan: result.data.jabatan || "",
          shift: result.data.shift || "",
          status_karyawan: result.data.status_karyawan || "",
          alamat: result.data.alamat || "",
          avatar_url: result.data.avatar_url || "",
          kuota_cuti: result.data.kuota_cuti || "",
          approval: result.data.approval || "",
          status: result.data.status || "1",
        });
      }
    } catch (error) {
      console.error("Error loading karyawan:", error);
    }
  };

  const saveKaryawan = async () => {
    if (!formData.nama || !formData.tanggal_join || !formData.jabatan) {
      alert("Nama, Tanggal Join, dan Jabatan harus diisi");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingId ? getApiUrl(`hr/karyawan/${editingId}`) : getApiUrl("hr/karyawan");
      const method = editingId ? "PUT" : "POST";

      const payload = {
        nama: formData.nama,
        jenis_kelamin: formData.jenis_kelamin || null,
        tanggal_lahir: formData.tanggal_lahir || null,
        email: formData.email || null,
        notelp: formData.notelp || null,
        tanggal_join: formData.tanggal_join,
        departemen: formData.departemen || null,
        jabatan: formData.jabatan,
        shift: formData.shift || null,
        status_karyawan: formData.status_karyawan || null,
        alamat: formData.alamat || null,
        avatar_url: formData.avatar_url || null,
        kuota_cuti: formData.kuota_cuti ? parseInt(formData.kuota_cuti) : null,
        approval: formData.approval || null,
      };

      if (editingId) {
        payload.tanggal_resign = formData.tanggal_resign || null;
        payload.status = formData.status || "1";
      } else {
        payload.status = "1";
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        closeModal();
        loadData(pagination.current_page);
        alert(result.message || "Data berhasil disimpan");
      } else {
        alert(result.message || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error saving karyawan:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    }
  };

  const deleteKaryawan = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus karyawan ini?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`hr/karyawan/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (result.success) {
        loadData(pagination.current_page);
        alert(result.message || "Data berhasil dihapus");
      } else {
        alert(result.message || "Terjadi kesalahan");
      }
    } catch (error) {
      console.error("Error deleting karyawan:", error);
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  if (!isAuthorized) {
    return (
      <Layout title="Karyawan | HR">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Karyawan | HR">
      <div className="karyawan-page">
        <div className="page-header">
          <div>
            <h1>Manajemen Karyawan</h1>
            <p>Kelola data karyawan perusahaan</p>
          </div>
        </div>

        <div className="action-bar">
          <div className="filters">
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                placeholder="Cari karyawan..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              value={filters.departemen}
              onChange={(e) => setFilters({ ...filters, departemen: e.target.value })}
            >
              <option value="">Semua Departemen</option>
              {departemenList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Semua Status</option>
              <option value="1">Aktif</option>
              <option value="N">Non Aktif</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Tambah Karyawan
          </button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">Tidak ada data</div>
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>No. Telp</th>
                    <th>Departemen</th>
                    <th>Jabatan</th>
                    <th>Atasan</th>
                    <th>Kuota Cuti</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(pagination.current_page - 1) * pagination.per_page + index + 1}</td>
                      <td>{item.nama || "-"}</td>
                      <td>{item.email || "-"}</td>
                      <td>{item.notelp || "-"}</td>
                      <td>{item.departemen_rel?.nama || "-"}</td>
                      <td>{getJabatanLabel(item.jabatan)}</td>
                      <td>{item.approval_rel?.nama || "-"}</td>
                      <td>{item.kuota_cuti !== null && item.kuota_cuti !== undefined ? `${item.kuota_cuti} hari` : "-"}</td>
                      <td>
                        <span className={`status-badge ${item.status === "1" ? "status-aktif" : "status-resign"}`}>
                          {item.status === "1" ? "Aktif" : "Non Aktif"}
                        </span>
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => openModal(item.id)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => deleteKaryawan(item.id)}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagination.last_page > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => loadData(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                  >
                    Sebelumnya
                  </button>
                  <span>
                    Halaman {pagination.current_page} dari {pagination.last_page} (Total: {pagination.total})
                  </span>
                  <button
                    onClick={() => loadData(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingId ? "Edit Karyawan" : "Tambah Karyawan"}</h3>
                <button onClick={closeModal} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Karyawan *</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Jenis Kelamin</label>
                    <select
                      value={formData.jenis_kelamin}
                      onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value })}
                    >
                      <option value="">Pilih</option>
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Tanggal Lahir</label>
                    <input
                      type="date"
                      value={formData.tanggal_lahir}
                      onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>No. Telepon</label>
                    <input
                      type="text"
                      value={formData.notelp}
                      onChange={(e) => setFormData({ ...formData, notelp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tanggal Join *</label>
                    <input
                      type="date"
                      value={formData.tanggal_join}
                      onChange={(e) => setFormData({ ...formData, tanggal_join: e.target.value })}
                      required
                    />
                  </div>
                  {editingId && (
                    <div className="form-group">
                      <label>Tanggal Resign</label>
                      <input
                        type="date"
                        value={formData.tanggal_resign}
                        onChange={(e) => setFormData({ ...formData, tanggal_resign: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Departemen</label>
                    <select
                      value={formData.departemen}
                      onChange={(e) => setFormData({ ...formData, departemen: e.target.value })}
                    >
                      <option value="">Pilih Divisi</option>
                      {divisiList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Jabatan *</label>
                    <select
                      value={formData.jabatan}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      required
                    >
                      <option value="">Pilih Jabatan</option>
                      <option value="1">Vice President</option>
                      <option value="2">Assistant Vice President</option>
                      <option value="3">General Manager</option>
                      <option value="4">Manager</option>
                      <option value="5">Supervisor</option>
                      <option value="6">Officer</option>
                      <option value="7">Clerical Staff</option>
                      <option value="8">Internship</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Shift</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                  >
                    <option value="">Pilih Shift</option>
                    {shiftList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.start_time} - {s.end_time})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status Karyawan</label>
                  <select
                    value={formData.status_karyawan}
                    onChange={(e) => setFormData({ ...formData, status_karyawan: e.target.value })}
                  >
                    <option value="">Pilih Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Resign">Resign</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Alamat</label>
                  <textarea
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Kuota Cuti (Hari)</label>
                  <input
                    type="number"
                    value={formData.kuota_cuti}
                    onChange={(e) => setFormData({ ...formData, kuota_cuti: e.target.value })}
                    min="0"
                    placeholder="Masukkan kuota cuti"
                  />
                </div>

                <div className="form-group">
                  <label>Approval Direksi</label>
                  <select
                    value={formData.approval}
                    onChange={(e) => setFormData({ ...formData, approval: e.target.value })}
                  >
                    <option value="">Pilih Direksi</option>
                    {direksiList.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {editingId && (
                  <>
                    <div className="form-group">
                      <label>Avatar URL</label>
                      <input
                        type="text"
                        value={formData.avatar_url}
                        onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="1">Aktif</option>
                        <option value="N">Non Aktif</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={saveKaryawan}>
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .karyawan-page {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .page-header {
          background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%);
          border-radius: 12px;
          padding: 1.5rem 2rem;
          color: white;
          margin-bottom: 1.5rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          font-size: 1.875rem;
          font-weight: 700;
        }

        .page-header p {
          margin: 0;
          opacity: 0.9;
          font-size: 0.875rem;
        }

        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .filters {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .search-input {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input svg {
          position: absolute;
          left: 0.75rem;
          color: #6b7280;
        }

        .search-input input {
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          width: 280px;
        }

        .filters select {
          padding: 0.625rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          background: white;
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

        .btn-primary:hover {
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

        .btn-icon {
          padding: 0.375rem;
          border: none;
          background: #6366f1;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          margin-right: 0.5rem;
        }

        .btn-icon:hover {
          background: #4f46e5;
        }

        .btn-danger {
          background: #ef4444;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        .table-container {
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

        .status-aktif {
          background: #d1fae5;
          color: #059669;
        }

        .status-resign {
          background: #fee2e2;
          color: #dc2626;
        }

        .pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .pagination button {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .pagination button:hover:not(:disabled) {
          background: #f9fafb;
        }

        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination span {
          font-size: 0.875rem;
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
          z-index: 9999;
          padding: 1rem;
          overflow-y: auto;
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 700px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
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
        }

        .modal-close:hover {
          color: #111827;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .form-group textarea {
          resize: vertical;
          min-height: 80px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        @media (max-width: 768px) {
          .karyawan-page {
            padding: 1rem;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .filters {
            width: 100%;
          }

          .search-input input {
            width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
