"use client";

import { useState } from "react";

export default function DeleteProductModal({ product, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (!product?.id) return;
    
    setDeleting(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      
      // Kirim dengan parameter force=true untuk hard delete
      const res = await fetch(`/api/sales/produk/${product.id}?force=true`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      console.log("🗑️ Delete response:", data);

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal menghapus produk");
      }

      // Berhasil dihapus
      onDeleted?.(product.id);
      onClose();
    } catch (err) {
      console.error("Delete product error:", err);
      setError(err.message || "Terjadi kesalahan saat menghapus produk");
    } finally {
      setDeleting(false);
    }
  };

  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card" style={{ maxWidth: "480px" }}>
        <div className="modal-header" style={{ borderBottom: "1px solid #fee2e2", background: "#fef2f2" }}>
          <h2 style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: "8px" }}>
            <i className="pi pi-exclamation-triangle" />
            Hapus Produk
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Tutup modal">
            <i className="pi pi-times" />
          </button>
        </div>

        <div className="modal-body" style={{ padding: "24px" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <div style={{ 
              width: "80px", 
              height: "80px", 
              borderRadius: "50%", 
              background: "#fee2e2", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              margin: "0 auto 16px"
            }}>
              <i className="pi pi-trash" style={{ fontSize: "32px", color: "#dc2626" }} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: "18px", color: "#1f2937" }}>
              Yakin ingin menghapus?
            </h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
              Produk ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </p>
          </div>

          <div style={{ 
            background: "#f9fafb", 
            border: "1px solid #e5e7eb", 
            borderRadius: "12px", 
            padding: "16px",
            marginBottom: "16px"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {product.header ? (
                <img 
                  src={`/api/image?path=${encodeURIComponent(product.header)}`}
                  alt={product.nama}
                  style={{ 
                    width: "60px", 
                    height: "60px", 
                    objectFit: "cover", 
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb"
                  }}
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div style={{ 
                  width: "60px", 
                  height: "60px", 
                  background: "#e5e7eb", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <i className="pi pi-box" style={{ fontSize: "24px", color: "#9ca3af" }} />
                </div>
              )}
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontWeight: "600", color: "#1f2937" }}>
                  {product.nama}
                </p>
                <p style={{ margin: 0, fontSize: "13px", color: "#6b7280" }}>
                  ID: {product.id} • {product.kategori_rel?.nama || "Tanpa Kategori"}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ 
              background: "#fef2f2", 
              border: "1px solid #fecaca", 
              borderRadius: "8px", 
              padding: "12px",
              color: "#dc2626",
              fontSize: "14px",
              marginBottom: "16px"
            }}>
              <i className="pi pi-times-circle" style={{ marginRight: "8px" }} />
              {error}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ 
          display: "flex", 
          gap: "12px", 
          justifyContent: "flex-end",
          padding: "16px 24px",
          borderTop: "1px solid #e5e7eb",
          background: "#f9fafb"
        }}>
          <button 
            type="button" 
            className="btn-cancel"
            onClick={onClose}
            disabled={deleting}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontWeight: "500",
              cursor: "pointer"
            }}
          >
            Batal
          </button>
          <button 
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background: deleting ? "#fca5a5" : "#dc2626",
              color: "white",
              fontWeight: "600",
              cursor: deleting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            {deleting ? (
              <>
                <i className="pi pi-spin pi-spinner" />
                Menghapus...
              </>
            ) : (
              <>
                <i className="pi pi-trash" />
                Hapus Permanen
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-card {
          background: white;
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: modalIn 0.2s ease-out;
        }
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-radius: 16px 16px 0 0;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 18px;
        }
        .modal-close {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          color: #6b7280;
        }
        .modal-close:hover {
          background: #f3f4f6;
        }
      `}</style>
    </div>
  );
}

