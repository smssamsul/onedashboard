"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Layout from "@/components/Layout";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

export default function TemplateBroadcastPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("Buat Template Broadcast");
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: "",
    judul: "",
    isi: ""
  });

  const textareaRef = useRef(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Token tidak ditemukan");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/sales/template-broadcast", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();

      if (json.success && json.data) {
        setTemplates(Array.isArray(json.data) ? json.data : []);
      } else {
        setError(json.message || "Gagal memuat data template");
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError(err.message || "Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleOpenModal = (template = null) => {
    if (template) {
      setModalTitle("Edit Template Broadcast");
      setFormData({
        id: template.id,
        judul: template.judul,
        isi: template.isi
      });
    } else {
      setModalTitle("Buat Template Broadcast");
      setFormData({
        id: "",
        judul: "",
        isi: ""
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const insertAutoText = (text) => {
    if (!text) return;
    const textarea = textareaRef.current;
    if (!textarea) {
      setFormData(prev => ({
        ...prev,
        isi: (prev.isi || "") + text
      }));
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const val = formData.isi || "";
    
    const before = val.substring(0, start);
    const after = val.substring(end);
    
    setFormData(prev => ({
      ...prev,
      isi: before + text + after
    }));
    
    requestAnimationFrame(() => {
      const newPos = start + text.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.isi.trim()) {
      alert("Judul dan isi template wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const isEdit = !!formData.id;
      const url = isEdit 
        ? `/api/sales/template-broadcast/${formData.id}` 
        : `/api/sales/template-broadcast`;
        
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          judul: formData.judul,
          isi: formData.isi
        })
      });

      const json = await res.json();

      if (json.success) {
        alert(json.message || "Template berhasil disimpan");
        setShowModal(false);
        fetchTemplates();
      } else {
        alert(json.message || "Gagal menyimpan template");
      }
    } catch (err) {
      console.error("Error saving template:", err);
      alert("Terjadi kesalahan saat menyimpan template");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, judul) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus template "${judul}"?`)) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/template-broadcast/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (json.success) {
        fetchTemplates();
      } else {
        alert(json.message || "Gagal menghapus template");
      }
    } catch (err) {
      console.error("Error deleting template:", err);
      alert("Terjadi kesalahan saat menghapus template");
    }
  };

  return (
    <Layout title="Template Broadcast">
      <style>{`
        :root {
            --primary: #F1A124;
            --primary-light: #f7c376;
            --secondary: #3b82f6;
            --surface: #ffffff;
            --text: #1e293b;
            --text-muted: #64748b;
            --border: #e2e8f0;
            --radius-sm: 0.375rem;
            --radius: 0.5rem;
            --radius-lg: 0.75rem;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
        }

        .tb-container {
            padding: 1.5rem;
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: var(--text);
            background: #f8fafc;
            min-height: 100vh;
        }

        .page-header {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
            border-radius: var(--radius-lg);
            padding: 1.5rem 2rem;
            color: white;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: var(--shadow);
        }

        .page-header h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
        }

        .page-header p {
            margin: 0.25rem 0 0 0;
            opacity: 0.9;
            font-size: 0.875rem;
        }

        .btn-create {
            background: white;
            color: var(--primary);
            border: none;
            padding: 0.625rem 1.25rem;
            border-radius: var(--radius);
            font-weight: 600;
            font-size: 0.875rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: var(--shadow-sm);
            transition: all 0.2s;
        }

        .btn-create:hover {
            box-shadow: var(--shadow);
            transform: translateY(-1px);
        }

        .card-table {
            background: var(--surface);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow);
            overflow: hidden;
        }

        .table-responsive {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            background: #f8fafc;
            padding: 1rem 1.5rem;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            font-weight: 600;
            border-bottom: 1px solid var(--border);
        }

        td {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
            font-size: 0.875rem;
            line-height: 1.5;
        }

        tbody tr:hover {
            background: #fcfcfc;
        }

        .action-group {
            display: flex;
            gap: 0.5rem;
        }

        .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.375rem;
            padding: 0.5rem 0.75rem;
            border-radius: var(--radius-sm);
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
        }

        .action-btn.edit { background: #fef3c7; color: #d97706; }
        .action-btn.edit:hover { background: #fde68a; }

        .action-btn.delete { background: #fee2e2; color: #dc2626; }
        .action-btn.delete:hover { background: #fecaca; }

        /* Modal Styles */
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
            backdrop-filter: blur(4px);
            padding: 1rem;
        }

        .modal-content {
            background: var(--surface);
            border-radius: var(--radius-lg);
            width: 100%;
            max-width: 600px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 1.125rem;
            font-weight: 700;
        }

        .modal-close {
            background: none;
            border: none;
            font-size: 1.25rem;
            cursor: pointer;
            color: var(--text-muted);
            padding: 0.25rem;
        }

        .modal-body {
            padding: 1.5rem;
        }

        .form-group {
            margin-bottom: 1.25rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            font-size: 0.875rem;
        }

        .form-group input,
        .form-group textarea {
            width: 100%;
            padding: 0.625rem 1rem;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            font-size: 0.875rem;
            font-family: inherit;
        }

        .form-group textarea {
            min-height: 150px;
            resize: vertical;
        }

        .form-hint {
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: 0.5rem;
            background: #f8fafc;
            padding: 0.75rem;
            border-radius: var(--radius-sm);
        }

        .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid var(--border);
            display: flex;
            justify-content: flex-end;
            gap: 0.75rem;
            background: #f8fafc;
            border-bottom-left-radius: var(--radius-lg);
            border-bottom-right-radius: var(--radius-lg);
        }

        .btn-outline {
            background: white;
            border: 1px solid var(--border);
            padding: 0.5rem 1rem;
            border-radius: var(--radius-sm);
            font-weight: 500;
            cursor: pointer;
        }

        .btn-primary {
            background: var(--primary);
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: var(--radius-sm);
            font-weight: 500;
            cursor: pointer;
        }
        
        .btn-primary:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .btn-secondary-small {
            background: #e2e8f0;
            color: #334155;
            border: none;
            font-size: 0.75rem;
            padding: 0.375rem 0.625rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        .btn-secondary-small:hover {
            background: #cbd5e1;
        }
      `}</style>

      <div className="tb-container">
        <div className="page-header">
          <div>
            <h1>Template Broadcast</h1>
            <p>Kelola template pesan untuk kemudahan broadcast</p>
          </div>
          <button className="btn-create" onClick={() => handleOpenModal()}>
            <i className="pi pi-plus" />
            Buat Template
          </button>
        </div>

        {error && (
          <div style={{ background: "#fee2e2", color: "#dc2626", padding: "1rem", borderRadius: "0.5rem", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <div className="card-table">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Judul Template</th>
                  <th>Isi Pesan</th>
                  <th style={{ width: "150px" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Memuat data...
                    </td>
                  </tr>
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                      Belum ada template broadcast.
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id}>
                      <td><strong>{template.judul}</strong></td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
                          {template.isi.length > 80 ? template.isi.substring(0, 80) + "..." : template.isi}
                        </span>
                      </td>
                      <td>
                        <div className="action-group">
                          <button
                            className="action-btn edit"
                            onClick={() => handleOpenModal(template)}
                            title="Edit"
                          >
                            <i className="pi pi-pencil" /> Edit
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(template.id, template.judul)}
                            title="Hapus"
                          >
                            <i className="pi pi-trash" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalTitle}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <i className="pi pi-times" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Judul Template <span style={{ color: "#dc2626" }}>*</span></label>
                  <input
                    type="text"
                    name="judul"
                    value={formData.judul}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Promo Akhir Tahun"
                  />
                </div>
                
                <div className="form-group">
                  <label>Isi Template <span style={{ color: "#dc2626" }}>*</span></label>
                  <textarea
                    ref={textareaRef}
                    name="isi"
                    value={formData.isi}
                    onChange={handleChange}
                    required
                    placeholder="Gunakan spintax, contoh: {Halo|Hai|Selamat pagi} {Bapak|Ibu|Kak} @{{customer_name}}, ..."
                  />
                  
                  <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button type="button" className="btn-secondary-small" onClick={() => insertAutoText('{Halo|Hai|Selamat pagi}')}>Sapaan (Spintax)</button>
                    <button type="button" className="btn-secondary-small" onClick={() => insertAutoText('{Bapak|Ibu|Kak}')}>Sapaan Gender (Spintax)</button>
                    <button type="button" className="btn-secondary-small" onClick={() => insertAutoText('{{customer_name}}')}>Nama Customer</button>
                    <button type="button" className="btn-secondary-small" onClick={() => insertAutoText('{{product_name}}')}>Nama Produk</button>
                    <button type="button" className="btn-secondary-small" onClick={() => insertAutoText('{{order_total}}')}>Total Order</button>
                  </div>
                  
                  <div className="form-hint">
                    <strong>Format didukung:</strong><br/>
                    - <strong>Spintax:</strong> <code>{'{Teks A|Teks B|Teks C}'}</code> (akan dipilih acak tiap pesan)<br/>
                    - <strong>Variabel:</strong> <code>{'{{customer_name}}'}</code>, <code>{'{{product_name}}'}</code>, <code>{'{{order_total}}'}</code>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={handleCloseModal}>Batal</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
