"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  FileText, Plus, Edit2, Trash2, Search,
  ExternalLink, Calendar, User, ChevronRight,
  Eye, Save, X, Layout as LayoutIcon, Gift, Check
} from "lucide-react";
import { toast } from "react-hot-toast";
import ArticleEditor from "./ArticleEditor";
import axios from "axios";

export default function ArticleSection({ productName }) {
  const params = useParams();
  const productId = params.id;

  const [view, setView] = useState("list"); // "list" | "editor"
  const [linkedArticles, setLinkedArticles] = useState([]);
  const [allGlobalArticles, setAllGlobalArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // 1. Fetch ALL global articles for modal
      const allRes = await axios.get(`/api/sales/post`, { headers });
      if (allRes.data?.success) {
        setAllGlobalArticles(allRes.data.data || []);
      }

      // 2. Fetch specific product data to get post_rel
      const productRes = await axios.get(`/api/sales/produk/${productId}`, { headers });
      if (productRes.data?.success) {
        const data = productRes.data.data;
        const linked = data.post_rel || [];
        setLinkedArticles(linked);
        setSelectedIds(linked.map(a => a.id));
      }
    } catch (err) {
      console.error("Fetch articles error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [productId]);

  const handleCreate = () => {
    setCurrentArticle(null);
    setView("editor");
  };

  const handleEdit = (article) => {
    setCurrentArticle(article);
    setView("editor");
  };

  const handleDelete = async (id) => {
    if (confirm("Apakah Anda yakin ingin menghapus artikel ini?")) {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const response = await axios.delete(`/api/sales/post/${id}`, { headers });
        if (response.data?.success) {
          toast.success("Artikel berhasil dihapus");
          fetchArticles();
        } else {
          toast.error("Gagal menghapus: " + (response.data?.message || "Unknown error"));
        }
      } catch (err) {
        toast.error("Gagal menghapus artikel");
      }
    }
  };

  const handleSuccessSave = () => {
    setView("list");
    fetchArticles();
  };

  const handleToggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleUpdateRelation = async (newIds) => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const payload = { post: newIds || selectedIds };

      const response = await axios.put(`/api/sales/produk/${productId}/post`, payload, { headers });

      if (response.data?.success) {
        toast.success("Relasi artikel berhasil diperbarui");
        setShowAddModal(false);
        fetchArticles();
      } else {
        toast.error(response.data?.message || "Gagal memperbarui relasi");
      }
    } catch (err) {
      console.error("Update relation error:", err);
      toast.error("Gagal menyambung ke server untuk update relasi");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredLinked = linkedArticles.filter(a =>
    (a.title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGlobal = allGlobalArticles.filter(a =>
    (a.title || "").toLowerCase().includes(modalSearch.toLowerCase())
  );

  return (
    <div className="article-section-container">
      {view === "list" ? (
        <div className="article-list-view fade-in">
          {/* Roster Header */}
          <div className="card-header-inner">
            <div className="card-title-group">
              <span className="card-subtitle">EXCLUSIVE ACCESS</span>
              <h2 className="card-title">Materi Pembelajaran</h2>
            </div>
            <div className="header-actions">
              <button className="btn-add-bonus" onClick={() => setShowAddModal(true)}>
                <Plus size={16} /> Tambahkan Bonus Artikel
              </button>
              <button className="btn-primary-orange" onClick={handleCreate}>
                <FileText size={16} /> Buat Artikel Baru
              </button>
            </div>
          </div>

          {/* Search Bar Premium */}
          <div className="search-container-premium">
            <div className="search-box-premium">
              <Search size={20} className="search-icon-left" />
              <input
                type="text"
                className="search-input-premium"
                placeholder="Cari artikel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear-btn" onClick={() => setSearchQuery("")}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Table / List */}
          <div className="table-container-clean">
            {loading && linkedArticles.length === 0 ? (
              <div className="loading-state">
                <div className="spinner orange"></div>
                <p>Memuat materi...</p>
              </div>
            ) : filteredLinked.length > 0 ? (
              <table className="bonus-table-clean">
                <thead>
                  <tr>
                    <th className="w-10 text-center">#</th>
                    <th>JUDUL MATERI</th>
                    <th className="text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinked.map((article, index) => (
                    <tr key={article.id}>
                      <td className="row-num">{index + 1}</td>
                      <td>
                        <div className="article-info-clean">
                          <span className="article-name">{article.title}</span>
                          <span className="article-slug-clean">/{article.slug}</span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons-clean">
                          <button
                            className="btn-action-icon"
                            title="Lihat"
                            onClick={() => window.open(`/article/${article.slug}`, '_blank')}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="btn-action-icon"
                            title="Edit"
                            onClick={() => handleEdit(article)}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            className="btn-action-icon delete"
                            title="Hapus Relasi"
                            onClick={() => {
                              const updated = selectedIds.filter(id => id !== article.id);
                              handleUpdateRelation(updated);
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <Gift size={48} className="empty-icon-gray" />
                <h3>Belum ada materi bonus</h3>
                <p>Klik "Tambahkan Bonus Artikel" untuk memilih materi yang sudah ada atau buat materi baru.</p>
              </div>
            )}
          </div>

          {/* ADD BONUS MODAL */}
          {showAddModal && (
            <div className="modal-overlay">
              <div className="modal-content-premium">
                <div className="modal-header">
                  <div className="header-title-group">
                    <h3 className="modal-title">Tambahkan Bonus Artikel</h3>
                    <p className="modal-subtitle">Pilih artikel materi untuk ditambahkan ke produk ini</p>
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>
                    <X size={20} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="modal-search-box">
                    <Search size={18} />
                    <input
                      type="text"
                      placeholder="Cari artikel global..."
                      value={modalSearch}
                      onChange={(e) => setModalSearch(e.target.value)}
                    />
                  </div>

                  <div className="global-articles-list">
                    {filteredGlobal.map(article => {
                      const isSelected = selectedIds.includes(article.id);
                      return (
                        <div
                          key={article.id}
                          className={`global-article-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleToggleSelection(article.id)}
                        >
                          <div className="checkbox-box">
                            {isSelected && <Check size={14} />}
                          </div>
                          <div className="article-details">
                            <span className="a-title">{article.title}</span>
                            <span className="a-slug">/{article.slug}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="modal-footer">
                  <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Batal</button>
                  <button
                    className="btn-save-modal"
                    onClick={() => handleUpdateRelation()}
                    disabled={isSyncing}
                  >
                    {isSyncing ? "Menyimpan..." : "Simpan Relasi"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="article-editor-view fade-in">
          {/* Editor Header */}
          <div className="editor-view-header">
            <div className="header-left-side">
              <button className="btn-back" onClick={() => setView("list")}>
                <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
                Kembali ke Daftar
              </button>
              <h2 className="editor-title">{currentArticle ? 'Edit Artikel' : 'Buat Artikel Baru'}</h2>
              <p className="editor-subtitle">Kelola konten artikel khusus untuk {productName}</p>
            </div>
          </div>

          <ArticleEditor
            initialData={currentArticle}
            idorder={productId}
            onSuccess={handleSuccessSave}
            onCancel={() => setView("list")}
          />
        </div>
      )}

      <style jsx>{`
        /* Premium Theme Sync with Bonus Page */
        .article-section-container {
            background: #fff;
            border-radius: 12px;
            overflow: hidden;
        }

        .card-header-inner {
            padding: 24px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .card-title-group { display: flex; flex-direction: column; }
        .card-subtitle { font-size: 11px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.1em; }
        .card-title { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
        
        .btn-primary-orange {
            background: #ff7a00;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .btn-primary-orange:hover {
            background: #e66e00;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 122, 0, 0.2);
        }

        .btn-sync-relation {
            background: #fff;
            color: #ff7a00;
            border: 1px solid #ff7a00;
            padding: 10px 16px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-right: 12px;
        }
        .btn-sync-relation:hover {
            background: #fff7ed;
            box-shadow: 0 4px 12px rgba(255, 122, 0, 0.1);
        }
        .btn-sync-relation:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .header-actions {
            display: flex;
            align-items: center;
        }

        .search-container-premium {
            padding: 0 30px 24px 30px;
        }
        .search-box-premium {
            display: flex;
            align-items: center;
            background: #f8fafc;
            padding: 0 16px;
            height: 48px;
            width: 100%;
            max-width: 400px;
            border-radius: 12px;
            position: relative;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid #f1f5f9;
        }
        .search-box-premium:focus-within {
            background: #fff;
            border-color: #ff7a00;
            box-shadow: 0 8px 30px rgba(255, 122, 0, 0.1);
        }
        .search-icon-left { color: #94a3b8; margin-right: 12px; flex-shrink: 0; }
        .search-input-premium {
            flex: 1;
            height: 100%;
            border: none;
            outline: none;
            background: transparent;
            font-size: 14px;
            color: #1e293b;
        }
        .search-clear-btn {
            background: #f1f5f9;
            border: none;
            color: #94a3b8;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
        }

        .table-container-clean { padding: 0 30px 30px 30px; }
        .bonus-table-clean {
            width: 100%;
            border-collapse: collapse;
        }
        .bonus-table-clean thead th {
            background: #f8fafc;
            padding: 12px 16px;
            text-align: left;
            font-size: 11px;
            font-weight: 800;
            color: #475569;
            letter-spacing: 0.05em;
        }
        .bonus-table-clean tr td {
            padding: 16px;
            color: #334155;
            border-bottom: 1px solid #f8fafc;
        }
        .bonus-table-clean tr:hover td {
            background: #fafafa;
        }
        .bonus-table-clean tr.selected-row td {
            background: #fffcf0;
        }
        .row-num { font-weight: 500; color: #94a3b8; font-size: 13px; display: flex; align-items: center; justify-content: center; }
        .row-num input[type="checkbox"] {
            cursor: pointer;
            accent-color: #ff7a00;
        }
        .article-name { font-weight: 600; color: #1e293b; display: block; font-size: 14px; }
        .article-slug-clean { font-size: 11px; color: #cbd5e1; }

        .status-pill-clean {
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .status-pill-clean.published { background: #fff7ed; color: #ff7a00; }
        .status-pill-clean.draft { background: #f1f5f9; color: #94a3b8; }

        .action-buttons-clean {
            display: flex;
            gap: 4px;
            justify-content: flex-end;
        }
        .btn-action-icon {
            background: none;
            border: none;
            color: #cbd5e1;
            cursor: pointer;
            padding: 6px;
            transition: all 0.2s;
        }
        .btn-action-icon:hover { color: #ff7a00; }
        .btn-action-icon.delete:hover { color: #ef4444; }

        /* Editor Header Sync */
        .editor-view-header {
            padding: 24px 30px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 0;
            background: #fff;
        }
        .btn-back {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            color: #64748b;
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .btn-back:hover { border-color: #ff7a00; color: #ff7a00; }
        .editor-title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
        .editor-subtitle { color: #94a3b8; font-size: 14px; margin: 4px 0 0 0; }

        .spinner.orange {
            width: 24px;
            height: 24px;
            border: 3px solid #f1f5f9;
            border-top: 3px solid #ff7a00;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .empty-state {
            padding: 60px 20px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .empty-icon-gray { color: #f1f5f9; stroke-width: 1.5; margin-bottom: 16px; }
        .empty-state h3 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 0; }
        .empty-state p { color: #94a3b8; font-size: 14px; margin-top: 8px; max-width: 320px; }

        /* Modal & Add Bonus Styles */
        .btn-add-bonus {
          background: #fff;
          color: #ff7a00;
          border: 1px solid #ff7a00;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-right: 12px;
        }
        .btn-add-bonus:hover { background: #fff7ed; transform: translateY(-1px); }

        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content-premium {
          background: #fff;
          width: 100%;
          max-width: 500px;
          border-radius: 20px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
          overflow: hidden;
        }
        .modal-header {
          padding: 24px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-title { font-size: 18px; font-weight: 800; color: #1e293b; margin: 0; }
        .modal-subtitle { font-size: 12px; color: #94a3b8; margin: 4px 0 0 0; }
        .modal-close-btn { background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 4px; }
        .modal-close-btn:hover { color: #ef4444; }

        .modal-body { padding: 24px; }
        .modal-search-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #f8fafc;
          padding: 10px 16px;
          border-radius: 12px;
          border: 1px solid #f1f5f9;
          margin-bottom: 20px;
        }
        .modal-search-box input { border: none; background: none; outline: none; font-size: 14px; flex: 1; }
        .modal-search-box svg { color: #94a3b8; }

        .global-articles-list {
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .global-article-item {
          padding: 12px 16px;
          border-radius: 12px;
          border: 1px solid #f8fafc;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }
        .global-article-item:hover { background: #f8fafc; border-color: #e2e8f0; }
        .global-article-item.selected { background: #fff7ed; border-color: #ffdebd; }

        .checkbox-box {
          width: 20px; height: 20px; border: 2px solid #e2e8f0; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; color: #ff7a00;
          transition: all 0.2s; background: #fff;
        }
        .global-article-item.selected .checkbox-box { border-color: #ff7a00; background: #fff; }
        
        .article-details { display: flex; flex-direction: column; }
        .a-title { font-size: 14px; font-weight: 600; color: #1e293b; }
        .a-slug { font-size: 11px; color: #94a3b8; }

        .modal-footer {
          padding: 20px 24px;
          background: #f8fafc;
          display: flex; gap: 12px;
          justify-content: flex-end;
        }
        .btn-cancel { background: none; border: none; color: #64748b; font-weight: 700; cursor: pointer; font-size: 13px; }
        .btn-save-modal {
          background: #ff7a00;
          color: #fff;
          border: none;
          padding: 10px 24px;
          border-radius: 10px;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
        }
        .btn-save-modal:disabled { opacity: 0.5; }

        .text-center { text-align: center; }
      `}</style>
    </div>
  );
}
