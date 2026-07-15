import { useState, useEffect } from "react";
import { toastSuccess, toastError } from "@/lib/toast";

export default function EditSalesModal({ sales, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        user_id: sales.sales_id || sales.user_id || "",
        nama: sales.user_rel?.nama || sales.nama || "",
        urutan: sales.urutan || "",
        woowa_key: sales.woowa_key || "",
        no_wa: sales.no_wa || ""
    });

    // Fetch users for dropdown to allow changing user if needed (though API might restricted)
    useEffect(() => {
        async function fetchUsers() {
            try {
                const token = localStorage.getItem("token");
                const res = await fetch("/api/admin/users", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setUsers(json.data);
                }
            } catch (err) {
                console.error("Error fetching users:", err);
            }
        }
        fetchUsers();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };

            // Auto fill nama when user is selected
            if (name === "user_id") {
                const selectedUser = users.find(u => String(u.id) === String(value));
                if (selectedUser) {
                    newData.nama = selectedUser.nama;
                }
            }
            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            // Request body according to prompt: name, urutan, woowa_key
            // We'll also include user_id if it changed, just in case the backend supports it, 
            // but primarily focusing on the requested fields.
            const bodyData = {
                nama: formData.nama,
                urutan: formData.urutan,
                woowa_key: formData.woowa_key,
                no_wa: formData.no_wa,
                user_id: formData.user_id
            };

            const res = await fetch(`/api/sales/sales-list/${sales.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(bodyData)
            });

            const json = await res.json();
            if (json.success) {
                toastSuccess("Data sales berhasil diperbarui");
                onSuccess();
            } else {
                toastError(json.message || "Gagal memperbarui sales");
            }
        } catch (err) {
            console.error("Error updating sales:", err);
            toastError("Terjadi kesalahan saat memperbarui sales");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2>Edit Sales</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="form-grid" style={{ gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div className="form-group">
                            <label>User *</label>
                            <select
                                name="user_id"
                                value={formData.user_id}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Pilih User</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.nama} ({u.email})</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Woowa Key</label>
                            <input
                                type="text"
                                name="woowa_key"
                                placeholder="Masukkan Woowa Key"
                                value={formData.woowa_key}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                No WhatsApp Sales
                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400, marginLeft: '6px' }}>(format: 628xxx)</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{
                                    position: 'absolute', left: '12px', top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#16a34a', display: 'flex', alignItems: 'center'
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                        <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.99.574 3.844 1.568 5.399L2 22l4.759-1.548C8.23 21.406 10.07 22 12 22c5.523 0 10-4.477 10-10S17.522 2 12 2z"/>
                                    </svg>
                                </span>
                                <input
                                    type="tel"
                                    name="no_wa"
                                    placeholder="Contoh: 6281234567890"
                                    value={formData.no_wa}
                                    onChange={handleChange}
                                    style={{ paddingLeft: '36px' }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Urutan</label>
                            <input
                                type="number"
                                name="urutan"
                                placeholder="Urutan"
                                value={formData.urutan}
                                onChange={handleChange}
                            />
                        </div>
                    </form>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={onClose}>Batal</button>
                    <button type="button" className="btn-save" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Menyimpan..." : "Simpan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
