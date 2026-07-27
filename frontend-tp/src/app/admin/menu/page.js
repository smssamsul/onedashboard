"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getDepartemenList, getMenuList, createMenu, updateMenu, deleteMenu } from "@/lib/menuAccess";
import { Search, Plus, Edit, Trash2, X } from "lucide-react";

const emptyForm = {
  key: "",
  label: "",
  href: "",
  icon_name: "",
  section: "",
  departemen_id: "",
  urutan: 0,
};

export default function MenuMasterPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [departemenList, setDepartemenList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const userData = localStorage.getItem("user");
      if (!userData) {
        router.push("/login");
        return;
      }
      const user = JSON.parse(userData);
      const userDivisi = String(user?.divisi ?? "");
      if (userDivisi !== "1" && userDivisi !== "2" && userDivisi !== "admin") {
        alert("Akses ditolak. Hanya Admin yang dapat mengakses halaman ini.");
        router.push("/admin");
        return;
      }
      setIsAuthorized(true);
    } catch (error) {
      console.error("Error checking access:", error);
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      loadData();
      getDepartemenList().then(setDepartemenList).catch(() => setDepartemenList([]));
    }
  }, [isAuthorized]);

  const loadData = async (search = "") => {
    try {
      setLoading(true);
      const params = search ? { search } : {};
      const result = await getMenuList(params);
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error("Error loading menu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) return;
    const timeout = setTimeout(() => loadData(searchTerm), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const openModal = (item = null) => {
    setFormErrors({});
    if (item) {
      setEditingId(item.id);
      setFormData({
        key: item.key || "",
        label: item.label || "",
        href: item.href || "",
        icon_name: item.icon_name || "",
        section: item.section || "",
        departemen_id: item.departemen_id ?? "",
        urutan: item.urutan ?? 0,
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormErrors({});
  };

  const saveMenu = async () => {
    if (!formData.key || !formData.label) {
      alert("Key dan Label harus diisi");
      return;
    }

    setSaving(true);
    setFormErrors({});
    try {
      const payload = {
        ...formData,
        departemen_id: formData.departemen_id || null,
        urutan: Number(formData.urutan) || 0,
      };
      if (editingId) {
        await updateMenu(editingId, payload);
      } else {
        await createMenu(payload);
      }
      closeModal();
      loadData(searchTerm);
    } catch (error) {
      console.error("Error saving menu:", error);
      if (error.validationErrors) {
        setFormErrors(error.validationErrors);
      }
      // api() sudah menampilkan toast error, tidak perlu alert tambahan
    } finally {
      setSaving(false);
    }
  };

  const removeMenu = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus menu ini?")) return;

    try {
      await deleteMenu(id);
      loadData(searchTerm);
    } catch (error) {
      console.error("Error deleting menu:", error);
      // api() sudah menampilkan toast error
    }
  };

  const departemenName = (id) => {
    if (!id) return "Semua Divisi";
    const dep = departemenList.find((d) => String(d.id) === String(id));
    return dep ? dep.nama : id;
  };

  if (!isAuthorized) {
    return (
      <Layout title="Menu Master | Admin">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>Memeriksa akses...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Menu Master | Admin">
      <div className="menu-page">
        <div className="page-header">
          <div>
            <h1>Menu Master</h1>
            <p>Kelola daftar menu yang bisa diatur hak aksesnya per departemen &amp; jabatan</p>
          </div>
        </div>

        <div className="action-bar">
          <div className="search-input">
            <Search size={16} />
            <input
              type="text"
              placeholder="Cari menu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={() => openModal()}>
            <Plus size={16} /> Tambah Menu
          </button>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">Memuat data...</div>
          ) : data.length === 0 ? (
            <div className="empty-state">Belum ada menu. Tambahkan menu pertama.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Key</th>
                  <th>Label</th>
                  <th>Href</th>
                  <th>Section</th>
                  <th>Divisi</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <code>{item.key}</code>
                    </td>
                    <td>{item.label}</td>
                    <td>{item.href || "-"}</td>
                    <td>{item.section || "-"}</td>
                    <td>{departemenName(item.departemen_id)}</td>
                    <td>
                      <button className="btn-icon" onClick={() => openModal(item)}>
                        <Edit size={14} />
                      </button>
                      <button className="btn-icon btn-danger" onClick={() => removeMenu(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>{editingId ? "Edit Menu" : "Tambah Menu"}</h3>
                <button onClick={closeModal} className="modal-close">
                  <X size={20} />
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Key * (slug unik, mis. hr.karyawan)</label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  />
                  {formErrors.key && <span className="field-error">{formErrors.key[0]}</span>}
                </div>
                <div className="form-group">
                  <label>Label *</label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  />
                  {formErrors.label && <span className="field-error">{formErrors.label[0]}</span>}
                </div>
                <div className="form-group">
                  <label>Href (path halaman)</label>
                  <input
                    type="text"
                    value={formData.href}
                    onChange={(e) => setFormData({ ...formData, href: e.target.value })}
                    placeholder="/hr/karyawan"
                  />
                </div>
                <div className="form-group">
                  <label>Section (grup di sidebar)</label>
                  <input
                    type="text"
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="DATA"
                  />
                </div>
                <div className="form-group">
                  <label>Icon (nama komponen lucide-react)</label>
                  <input
                    type="text"
                    value={formData.icon_name}
                    onChange={(e) => setFormData({ ...formData, icon_name: e.target.value })}
                    placeholder="Users"
                  />
                </div>
                <div className="form-group">
                  <label>Divisi (kosongkan = berlaku untuk semua divisi)</label>
                  <select
                    value={formData.departemen_id}
                    onChange={(e) => setFormData({ ...formData, departemen_id: e.target.value })}
                  >
                    <option value="">Semua Divisi</option>
                    {departemenList.map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        {dep.nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Urutan</label>
                  <input
                    type="number"
                    value={formData.urutan}
                    onChange={(e) => setFormData({ ...formData, urutan: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Batal
                </button>
                <button className="btn btn-primary" onClick={saveMenu} disabled={saving}>
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .menu-page {
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
          overflow-x: auto;
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
          white-space: nowrap;
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
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
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
        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
        }
        .field-error {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
          display: block;
        }
        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        @media (max-width: 768px) {
          .menu-page {
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
