"use client";

import { useEffect, useState } from "react";
import { getKnowledgeSources, createKnowledgeSource, updateKnowledgeSource, deleteKnowledgeSource, regenerateEmbeddings } from "@/lib/sales/knowledge";
import { toast } from "react-hot-toast";
import { Plus, Edit, Trash2, RefreshCw, X } from "lucide-react";
import "@/styles/sales/dashboard.css";
import "@/styles/sales/shared-table.css";
import "@/styles/sales/orders.css";
import "@/styles/sales/pesanan.css";

export default function KnowledgeSection({ productId }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({
    type: "product",
    product_id: productId,
    title: "",
    content: "",
    auto_chunk: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchSources();
    }
  }, [productId]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const data = await getKnowledgeSources({ type: "product", product_id: productId });
      setSources(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (editingSource) {
        await updateKnowledgeSource(editingSource.id, {
          type: formData.type,
          product_id: formData.product_id,
          title: formData.title,
          content: formData.content,
          regenerate_embeddings: false,
        });
        toast.success("Knowledge source berhasil diupdate");
      } else {
        await createKnowledgeSource({
          type: formData.type,
          product_id: formData.product_id,
          title: formData.title,
          content: formData.content,
          auto_chunk: true,
        });
        toast.success("Knowledge source berhasil dibuat");
      }
      setShowModal(false);
      setEditingSource(null);
      setFormData({
        type: "product",
        product_id: productId,
        title: "",
        content: "",
        auto_chunk: true,
      });
      fetchSources();
    } catch (error) {
      toast.error(error.message || "Gagal menyimpan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (source) => {
    setEditingSource(source);
    setFormData({
      type: source.type,
      product_id: productId,
      title: source.title,
      content: source.content,
      auto_chunk: true,
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus knowledge source ini?")) return;
    try {
      await deleteKnowledgeSource(id);
      toast.success("Berhasil dihapus");
      fetchSources();
    } catch (error) {
      toast.error(error.message || "Gagal menghapus");
    }
  };

  const handleRegenerate = async (id) => {
    if (!confirm("Yakin ingin regenerate embeddings? Ini akan menghapus chunks lama dan membuat yang baru.")) return;
    try {
      await regenerateEmbeddings(id);
      toast.success("Embeddings berhasil di-regenerate");
      fetchSources();
    } catch (error) {
      toast.error(error.message || "Gagal regenerate");
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.25rem" }}>
            Product Knowledge
          </h3>
          <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Kelola knowledge base khusus untuk produk ini
          </p>
        </div>
        <button
          className="orders-btn orders-btn--success"
          style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          onClick={() => {
            setEditingSource(null);
            setFormData({
              type: "product",
              product_id: productId,
              title: "",
              content: "",
              auto_chunk: true,
            });
            setShowModal(true);
          }}
        >
          <Plus size={18} />
          Tambah Knowledge
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>Memuat data...</div>
      ) : sources.length === 0 ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
          <p>Belum ada knowledge source untuk produk ini</p>
          <p style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            Tambahkan knowledge source untuk membantu AI chatbot menjawab pertanyaan tentang produk ini
          </p>
        </div>
      ) : (
        <div className="table-shell">
          <div className="table-wrapper">
            <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Content Preview</th>
                <th>Chunks</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => (
                <tr key={source.id}>
                  <td>
                    <strong>{source.title}</strong>
                  </td>
                  <td>
                    <div style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {source.content?.substring(0, 100)}...
                    </div>
                  </td>
                  <td>{source.chunks?.length || 0}</td>
                  <td>{new Date(source.created_at).toLocaleDateString("id-ID")}</td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn-icon"
                        onClick={() => handleEdit(source)}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => handleRegenerate(source.id)}
                        title="Regenerate Embeddings"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        className="btn-icon btn-icon--danger"
                        onClick={() => handleDelete(source.id)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="orders-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="orders-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", maxHeight: "90vh" }}>
            <div className="orders-modal-header">
              <h2>{editingSource ? "Edit" : "Tambah"} Product Knowledge</h2>
              <button type="button" className="orders-modal-close" onClick={() => setShowModal(false)} aria-label="Tutup modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="orders-modal-body" style={{ overflowY: "auto", flex: 1 }}>
              <label className="orders-field">
                Title <span className="required">*</span>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Contoh: Informasi Produk A"
                />
              </label>

              <label className="orders-field">
                Content <span className="required">*</span>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  required
                  rows={10}
                  placeholder="Masukkan konten knowledge tentang produk ini..."
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </label>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
                <button
                  type="button"
                  className="orders-btn orders-btn--ghost"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="orders-btn orders-btn--success"
                  disabled={submitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? "not-allowed" : "pointer",
                    minWidth: "100px",
                    justifyContent: "center",
                  }}
                >
                  {submitting ? (
                    <>
                      <i
                        className="pi pi-spin pi-spinner"
                        style={{ fontSize: "0.875rem" }}
                      />
                      {editingSource ? "Menyimpan..." : "Mengirim..."}
                    </>
                  ) : (
                    editingSource ? "Update" : "Simpan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
