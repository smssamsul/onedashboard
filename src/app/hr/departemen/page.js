"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Search, Plus, Edit, Trash2, X } from "lucide-react";

export default function DepartemenPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pagination, setPagination] = useState({
    current_page: 1,
    last_page: 1,
    per_page: 15,
    total: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nama: "",
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

  // Load data
  useEffect(() => {
    if (isAuthorized) {
      loadData(1);
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (isAuthorized) {
      loadData(1);
    }
  }, [searchTerm, isAuthorized]);

  const loadData = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      let url = `hr/departemen?page=${page}&per_page=15`;
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
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
      loadDepartemen(id);
    } else {
      setEditingId(null);
      setFormData({
        nama: "",
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const loadDepartemen = async (id) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`hr/departemen/${id}`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();
      if (result.success && result.data) {
        setFormData({
          nama: result.data.nama || "",
        });
      }
    } catch (error) {
      console.error("Error loading departemen:", error);
    }
  };

  const saveDepartemen = async () => {
    if (!formData.nama) {
      alert("Nama departemen harus diisi");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingId ? getApiUrl(`hr/departemen/${editingId}`) : getApiUrl("hr/departemen");
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nama: formData.nama,
        }),
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
      console.error("Error saving departemen:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    }
  };

  const deleteDepartemen = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus departemen ini?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`hr/departemen/${id}`), {
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
      console.error("Error deleting departemen:", error);
      alert("Terjadi kesalahan saat menghapus data");
    }
  };

  if (!isAuthorized) {
    return (
      <Layout title="Departemen | HR">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Departemen | HR">
      <div className="departemen-page">
        <div className="page-header">
          <div>
            <h1>Manajemen Departemen</h1>
            <p>Kelola divisi dan departemen perusahaan</p>
          </div>
        </div>

        <div className="action-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari departemen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Tambah Departemen
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
                    <th>Nama Departemen</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={item.id}>
                      <td>{(pagination.current_page - 1) * pagination.per_page + index + 1}</td>
                      <td>{item.nama}</td>
                      <td>
                        <button className="btn-icon" onClick={() => openModal(item.id)}>
                          <Edit size={14} />
                        </button>
                        <button className="btn-icon btn-danger" onClick={() => deleteDepartemen(item.id)}>
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
                <h3>{editingId ? "Edit Departemen" : "Tambah Departemen"}</h3>
                <button onClick={closeModal} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Departemen *</label>
                  <input
                    type="text"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={saveDepartemen}>
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .departemen-page {
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
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
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

        .form-group input {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }

        @media (max-width: 768px) {
          .departemen-page {
            padding: 1rem;
          }

          .action-bar {
            flex-direction: column;
            align-items: stretch;
          }

          .search-input input {
            width: 100%;
          }
        }
      `}</style>
    </Layout>
  );
}
