"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";
import { getApiUrl } from "@/config/api";
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-hot-toast";

export default function PixelSettingPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pixels, setPixels] = useState([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    jenis: "Facebook Pixel",
    nama: "",
    pixel: "",
    conversion_api_token: "",
    kode_testing: "",
  });
  
  const [submitLoading, setSubmitLoading] = useState(false);

  // Check Sales access
  useEffect(() => {
    const checkAccess = () => {
      try {
        const userData = localStorage.getItem("user");
        if (!userData) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(userData);
        const userDivisi = user?.divisi || localStorage.getItem("division");

        if (userDivisi !== 3 && userDivisi !== "3") {
          alert("Akses ditolak. Hanya Sales yang dapat mengakses halaman ini.");
          router.push("/sales/dashboard");
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
      fetchPixels();
    }
  }, [isAuthorized]);

  const fetchPixels = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(getApiUrl("sales/pixel-meta"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPixels(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching pixels:", error);
      toast.error("Gagal memuat data pixel");
    } finally {
      setLoading(false);
    }
  };

  const openModalForCreate = () => {
    setFormData({
      jenis: "Facebook Pixel",
      nama: "",
      pixel: "",
      conversion_api_token: "",
      kode_testing: "",
    });
    setIsEditMode(false);
    setCurrentId(null);
    setShowModal(true);
  };

  const openModalForEdit = (pixel) => {
    setFormData({
      jenis: "Facebook Pixel", // Currently only supporting FB Pixel
      nama: pixel.nama || "",
      pixel: pixel.pixel || "",
      conversion_api_token: pixel.conversion_api_token || "",
      kode_testing: pixel.kode_testing || "",
    });
    setIsEditMode(true);
    setCurrentId(pixel.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nama || !formData.pixel) {
      toast.error("Nama dan Pixel ID wajib diisi!");
      return;
    }

    try {
      setSubmitLoading(true);
      const token = localStorage.getItem("token");
      
      const endpoint = isEditMode 
        ? getApiUrl(`sales/pixel-meta/${currentId}`)
        : getApiUrl("sales/pixel-meta");
        
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Pixel berhasil disimpan");
        closeModal();
        fetchPixels(); // Refresh data
      } else {
        toast.error(result.message || "Gagal menyimpan pixel");
      }
    } catch (error) {
      console.error("Error saving pixel:", error);
      toast.error("Terjadi kesalahan saat menyimpan pixel");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus pixel ini?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(getApiUrl(`sales/pixel-meta/${id}`), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message || "Pixel berhasil dihapus");
        fetchPixels();
      } else {
        toast.error(result.message || "Gagal menghapus pixel");
      }
    } catch (error) {
      console.error("Error deleting pixel:", error);
      toast.error("Terjadi kesalahan saat menghapus pixel");
    }
  };

  const truncateText = (text, length = 30) => {
    if (!text) return "-";
    if (text.length <= length) return text;
    return text.substring(0, length) + "...";
  };

  if (!isAuthorized || loading) {
    return (
      <Layout title="Pengaturan Pixel | Sales">
        <div style={{ textAlign: "center", padding: "4rem" }}>
          <p>{loading ? "Memuat data..." : "Memeriksa akses..."}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Pengaturan Pixel | Sales">
      <div className="pixel-setting-page">
        
        <div className="page-header">
          <div>
            <h2 className="page-title">Daftar Akun Analitik</h2>
            <p className="page-description">
              Kelola Pixel Facebook, Conversion API, dan kode analitik lainnya untuk tracking konversi produk Anda.
            </p>
          </div>
          <button onClick={openModalForCreate} className="btn btn-primary add-btn">
            <Plus size={18} /> Tambah Akun
          </button>
        </div>

        <div className="setting-card">
          {pixels.length === 0 ? (
            <div className="empty-state">
              <p>Belum ada data pixel yang ditambahkan.</p>
              <button onClick={openModalForCreate} className="btn btn-outline">
                Tambah Sekarang
              </button>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="pixel-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Pixel ID</th>
                    <th>Conversion API Token</th>
                    <th>Kode Testing</th>
                    <th style={{ textAlign: "center" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pixels.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>
                        <span className="font-medium text-gray-900">{item.nama || "-"}</span>
                      </td>
                      <td>
                        <span className="badge badge-gray">{item.pixel}</span>
                      </td>
                      <td className="token-cell">
                        {truncateText(item.conversion_api_token)}
                      </td>
                      <td>
                        {item.kode_testing ? (
                          <span className="badge badge-blue">{item.kode_testing}</span>
                        ) : "-"}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => openModalForEdit(item)}
                            className="btn-text text-blue"
                            title="Edit"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, marginRight: '10px' }}
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="btn-text text-red"
                            title="Hapus"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? "Edit Akun Analitik" : "Detail Akun Analitik"}</h3>
              <button onClick={closeModal} className="close-btn">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">

              <div className="form-group">
                <label>Nama <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="nama"
                  value={formData.nama}
                  onChange={handleInputChange}
                  placeholder="Contoh: Pixel Utama"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label>Pixel ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="pixel"
                  value={formData.pixel}
                  onChange={handleInputChange}
                  placeholder="Contoh: 1234567890"
                  className="input-field"
                  required
                />
              </div>

              <div className="form-group">
                <label>Conversion API Access Token</label>
                <textarea
                  name="conversion_api_token"
                  value={formData.conversion_api_token}
                  onChange={handleInputChange}
                  placeholder="EAAM..."
                  className="input-field textarea-field"
                  rows="4"
                ></textarea>
              </div>

              <div className="form-group">
                <label>Kode Testing</label>
                <input
                  type="text"
                  name="kode_testing"
                  value={formData.kode_testing}
                  onChange={handleInputChange}
                  placeholder="Contoh: TEST12345"
                  className="input-field"
                />
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={submitLoading} className="btn btn-primary">
                  {submitLoading ? "Menyimpan..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .pixel-setting-page {
          padding: 2rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 2rem;
        }

        .page-title {
          margin: 0 0 0.5rem 0;
          color: #111827;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .page-description {
          color: #6b7280;
          margin: 0;
          font-size: 0.95rem;
        }

        .setting-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }

        .table-responsive {
          overflow-x: auto;
        }

        .pixel-table {
          width: 100%;
          border-collapse: collapse;
        }

        .pixel-table th {
          text-align: left;
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #374151;
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .pixel-table th:first-child {
          border-top-left-radius: 8px;
        }
        
        .pixel-table th:last-child {
          border-top-right-radius: 8px;
        }

        .pixel-table td {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
          font-size: 0.9rem;
          vertical-align: middle;
        }

        .pixel-table tr:last-child td {
          border-bottom: none;
        }

        .token-cell {
          max-width: 200px;
          word-break: break-all;
          font-family: monospace;
          color: #6b7280;
          font-size: 0.85rem;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .badge-gray {
          background-color: #f3f4f6;
          color: #374151;
          border: 1px solid #e5e7eb;
        }

        .badge-blue {
          background-color: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .action-buttons {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .btn-icon:hover {
          background-color: #f3f4f6;
        }

        .text-blue { color: #3b82f6; }
        .text-blue:hover { color: #2563eb; }
        
        .text-red { color: #ef4444; }
        .text-red:hover { color: #dc2626; }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #F1A124;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #d68f20;
        }

        .btn-outline {
          background-color: white;
          border-color: #F1A124;
          color: #F1A124;
        }

        .btn-outline:hover:not(:disabled) {
          background-color: #fff9f0;
          border-color: #d68f20;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #6b7280;
        }
        
        .empty-state p {
          margin-bottom: 1rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.125rem;
          color: #111827;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          color: #9ca3af;
          cursor: pointer;
          padding: 0;
        }

        .close-btn:hover {
          color: #4b5563;
        }

        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-weight: 500;
          font-size: 0.9rem;
          color: #374151;
        }

        .input-field {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid #d1d5db;
          font-size: 0.95rem;
          outline: none;
          transition: all 0.2s;
          background: white;
        }

        .input-field:focus {
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
        }
        
        .input-field:disabled {
          background-color: #f3f4f6;
          color: #6b7280;
          cursor: not-allowed;
        }

        .textarea-field {
          resize: vertical;
          font-family: inherit;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        
        .font-medium { font-weight: 500; }
        .text-gray-900 { color: #111827; }
        .text-red-500 { color: #ef4444; }
      `}</style>
    </Layout>
  );
}
