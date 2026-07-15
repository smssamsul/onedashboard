import { useState } from "react";
import { toastSuccess, toastError } from "@/lib/toast";

export default function DeleteSalesModal({ sales, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/sales/sales-list/${sales.id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const json = await res.json();
            if (json.success) {
                // Warning toast usually implied for delete operations or simple success
                toastSuccess("Data sales berhasil dihapus");
                onSuccess();
            } else {
                toastError(json.message || "Gagal menghapus sales");
            }
        } catch (err) {
            console.error("Error deleting sales:", err);
            toastError("Terjadi kesalahan saat menghapus sales");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h2>Konfirmasi Hapus</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ textAlign: 'center', padding: '2rem 1.5rem' }}>
                    <p style={{ fontSize: '1rem', color: '#1f2937', marginBottom: '0.5rem' }}>
                        Anda yakin ingin menghapus data sales ini?
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: 600 }}>
                        {sales.user_rel?.nama || sales.nama || "Sales Item"}
                    </p>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        className="btn-delete"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading ? "Menghapus..." : "Delete"}
                    </button>
                </div>
            </div>
        </div>
    );
}
