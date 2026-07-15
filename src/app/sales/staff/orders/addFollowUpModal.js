import React, { useState } from "react";
import { Calendar } from "primereact/calendar";
import { Loader2 } from "lucide-react";
import "@/styles/sales/orders.css";

const CHANNEL_OPTIONS = [
    { label: "WhatsApp", value: "WhatsApp" },
    { label: "Telepon", value: "Telepon" },
    { label: "Email", value: "Email" },
    { label: "Meeting", value: "Meeting" },
    { label: "Lainnya", value: "Lainnya" },
];

const TYPE_OPTIONS = [
    { label: "WhatsApp Out", value: "WhatsApp Out" },
    { label: "Call Out", value: "Call Out" },
    { label: "Send Price", value: "Send Price" },
    { label: "Interested", value: "Interested" },
    { label: "Thinking", value: "Thinking" },
    { label: "Closed Won", value: "Closed Won" },
    { label: "Closed Lost", value: "Closed Lost" },
];

export default function AddFollowUpModal({ isOpen, onClose, onSuccess, orderId }) {
    const [formData, setFormData] = useState({
        follow_up_date: new Date(),
        channel: "",
        type: "", // Type Aktivitas
        note: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (!formData.follow_up_date) throw new Error("Tanggal & Waktu wajib diisi");
            if (!formData.type) throw new Error("Type Aktivitas wajib diisi");

            const token = localStorage.getItem("token");

            // Format datetime: YYYY-MM-DD HH:mm:ss
            const date = formData.follow_up_date;
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;

            const payload = {
                order_id: orderId,
                follow_up_date: formattedDate,
                channel: formData.channel || "WhatsApp", // Default to WA if empty? Or validate? UI says "Pilih Channel" so maybe validation needed if strictly required. But image shows just "Channel" label without asterisk? Image says "Tanggal... *" and "Type... *". Channel has no *. So maybe optional.
                type: formData.type,
                note: formData.note
            };

            const res = await fetch("/api/sales/order/followup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Gagal menyimpan follow up");

            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card" style={{ maxWidth: "500px", width: "100%" }}>
                <div className="modal-header">
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Tambah Follow Up</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        <i className="pi pi-times" />
                    </button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "0.75rem", borderRadius: "0.375rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

                        {/* Tanggal & Waktu */}
                        <div className="form-group">
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                                Tanggal & Waktu Follow Up <span style={{ color: "red" }}>*</span>
                            </label>
                            <Calendar
                                value={formData.follow_up_date}
                                onChange={(e) => setFormData({ ...formData, follow_up_date: e.value })}
                                showTime
                                hourFormat="24"
                                showIcon
                                dateFormat="dd/mm/yy"
                                placeholder="hh / bb / tttt , -- . --"
                                style={{ width: "100%" }}
                                inputClassName="p-inputtext-sm"
                            />
                        </div>

                        {/* Channel */}
                        <div className="form-group">
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                                Channel
                            </label>
                            <select
                                value={formData.channel}
                                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                                className="custom-select"
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #ced4da",
                                    borderRadius: "6px",
                                    fontSize: "0.9rem",
                                    background: "#fff"
                                }}
                            >
                                <option value="">Pilih Channel</option>
                                {CHANNEL_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Type Aktivitas */}
                        <div className="form-group">
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                                Type Aktivitas <span style={{ color: "red" }}>*</span>
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="custom-select"
                                required
                                style={{
                                    width: "100%",
                                    padding: "0.5rem",
                                    border: "1px solid #ced4da",
                                    borderRadius: "6px",
                                    fontSize: "0.9rem",
                                    background: "#fff"
                                }}
                            >
                                <option value="">Pilih Type</option>
                                {TYPE_OPTIONS.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Catatan */}
                        <div className="form-group">
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, fontSize: "0.9rem" }}>
                                Catatan
                            </label>
                            <textarea
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                placeholder="Catatan follow up..."
                                rows={4}
                                style={{
                                    width: "100%",
                                    padding: "0.75rem",
                                    border: "1px solid #ced4da",
                                    borderRadius: "6px",
                                    fontSize: "0.9rem",
                                    resize: "vertical",
                                    fontFamily: "inherit"
                                }}
                            />
                        </div>

                        {/* Footer Buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                style={{
                                    padding: "0.6rem 1.25rem",
                                    background: "#fff",
                                    border: "1px solid #d1d5db",
                                    color: "#374151",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                    fontSize: "0.9rem"
                                }}
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    padding: "0.6rem 1.25rem",
                                    background: "#1e3a8a", // Dark blue from image
                                    border: "none",
                                    color: "#fff",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                    fontSize: "0.9rem",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem"
                                }}
                            >
                                {loading && <Loader2 className="animate-spin" size={16} />}
                                Simpan Follow Up
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
