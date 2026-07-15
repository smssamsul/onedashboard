"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

/**
 * Modal untuk menampilkan QR code Baileys.
 * Props:
 *  - salesId: number
 *  - salesName: string
 *  - onClose: () => void
 *  - onConnected: () => void (callback ketika status berubah ke 'open')
 */
export default function BaileysQRModal({ salesId, salesName, onClose, onConnected }) {
    const [qrData, setQrData] = useState(null);
    const [status, setStatus] = useState("loading"); // loading | qr | open | error | not_found
    const [message, setMessage] = useState("");
    const [polling, setPolling] = useState(true);

    const fetchQR = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/sales/baileys/qr-by-sales/${salesId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.status === "open" || data.status === "connected") {
                setStatus("open");
                setPolling(false);
                onConnected?.();
                return;
            }

            if (data.success && data.qr) {
                setQrData(data.qr);
                setStatus("qr");
            } else {
                setMessage(data.message || "QR belum tersedia, inisialisasi...");
                setStatus("loading");
            }
        } catch {
            setStatus("error");
            setMessage("Gagal menghubungi server");
        }
    }, [salesId, onConnected]);

    const checkStatus = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`/api/sales/baileys/status-by-sales/${salesId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (data.status === "open" || data.status === "connected") {
                setStatus("open");
                setPolling(false);
                onConnected?.();
            }
        } catch {
            // silent
        }
    }, [salesId, onConnected]);

    // Initial QR fetch
    useEffect(() => {
        fetchQR();
    }, [fetchQR]);

    // Polling: cek status setiap 3 detik
    useEffect(() => {
        if (!polling) return;

        const interval = setInterval(() => {
            checkStatus();
            // Refresh QR juga setiap 15 detik (QR bisa expired)
        }, 3000);

        return () => clearInterval(interval);
    }, [polling, checkStatus]);

    // Refresh QR setiap 15 detik (QR bisa kedaluwarsa)
    useEffect(() => {
        if (!polling || status !== "qr") return;
        const qrRefresh = setInterval(() => {
            fetchQR();
        }, 15000);
        return () => clearInterval(qrRefresh);
    }, [polling, status, fetchQR]);

    return (
        <div style={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div style={styles.modal}>
                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <h2 style={styles.title}>
                            Hubungkan WhatsApp
                        </h2>
                        <p style={styles.subtitle}>{salesName}</p>
                    </div>
                    <button onClick={onClose} style={styles.closeBtn} aria-label="Tutup">
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div style={styles.body}>
                    {(status === "open" || status === "connected") && (
                        <div style={styles.successBox}>
                            <div style={styles.successIcon}>✅</div>
                            <h3 style={{ color: "#065f46", marginBottom: "0.5rem" }}>WhatsApp Terhubung!</h3>
                            <p style={{ color: "#047857", margin: 0 }}>
                                Session Baileys untuk {salesName} sudah aktif.
                            </p>
                            <button onClick={onClose} style={{ ...styles.btnPrimary, marginTop: "1.5rem" }}>
                                Tutup
                            </button>
                        </div>
                    )}

                    {status === "loading" && (
                        <div style={styles.centerBox}>
                            <div style={styles.spinner} />
                            <p style={{ color: "#6b7280", marginTop: "1rem" }}>
                                {message || "Menyiapkan QR Code..."}
                            </p>
                            <p style={{ color: "#9ca3af", fontSize: "0.8rem" }}>
                                Mohon tunggu sebentar
                            </p>
                        </div>
                    )}

                    {status === "qr" && qrData && (
                        <div style={styles.qrBox}>
                            <div style={styles.qrInstructions}>
                                <div style={styles.step}><span style={styles.stepNum}>1</span> Buka WhatsApp di HP</div>
                                <div style={styles.step}><span style={styles.stepNum}>2</span> Menu → Perangkat Tertaut</div>
                                <div style={styles.step}><span style={styles.stepNum}>3</span> Scan QR di bawah ini</div>
                            </div>
                            <div style={styles.qrFrame}>
                                {qrData.startsWith("data:image") ? (
                                    <img src={qrData} alt="QR Code Baileys" style={styles.qrImage} />
                                ) : (
                                    <QRCodeSVG value={qrData} size={200} level="M" includeMargin={false} />
                                )}
                            </div>
                            <p style={styles.qrNote}>
                                QR otomatis diperbarui setiap 15 detik · Status dicek setiap 3 detik
                            </p>
                            <div style={styles.pulsingDot}>
                                <span style={styles.dot} /> Menunggu scan...
                            </div>
                        </div>
                    )}

                    {status === "error" && (
                        <div style={styles.errorBox}>
                            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
                            <h3 style={{ color: "#991b1b", marginBottom: "0.5rem" }}>Terjadi Kesalahan</h3>
                            <p style={{ color: "#b91c1c", marginBottom: "1.5rem" }}>{message}</p>
                            <button onClick={fetchQR} style={styles.btnPrimary}>
                                Coba Lagi
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}

const styles = {
    overlay: {
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, backdropFilter: "blur(4px)",
    },
    modal: {
        background: "white", borderRadius: "16px", width: "90%", maxWidth: "480px",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
        overflow: "hidden", animation: "none",
    },
    header: {
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        padding: "1.5rem 1.5rem 1rem",
        borderBottom: "1px solid #f3f4f6",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
    },
    title: { margin: 0, color: "white", fontSize: "1.25rem", fontWeight: 700 },
    subtitle: { margin: "0.25rem 0 0", color: "#94a3b8", fontSize: "0.875rem" },
    closeBtn: {
        background: "rgba(255,255,255,0.1)", border: "none", color: "white",
        width: "32px", height: "32px", borderRadius: "8px", cursor: "pointer",
        fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.2s",
    },
    body: { padding: "2rem 1.5rem" },
    centerBox: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "2rem 0", textAlign: "center",
    },
    spinner: {
        width: "48px", height: "48px", border: "4px solid #e5e7eb",
        borderTopColor: "#4f46e5", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
    },
    successBox: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "1.5rem", textAlign: "center",
        background: "#d1fae5", borderRadius: "12px",
    },
    successIcon: { fontSize: "3rem", marginBottom: "0.75rem" },
    errorBox: {
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "1.5rem", textAlign: "center",
        background: "#fee2e2", borderRadius: "12px",
    },
    qrBox: {
        display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem",
    },
    qrInstructions: {
        display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center",
        width: "100%",
    },
    step: {
        display: "flex", alignItems: "center", gap: "0.5rem",
        fontSize: "0.8rem", color: "#374151", fontWeight: 500,
    },
    stepNum: {
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: "22px", height: "22px", borderRadius: "50%",
        background: "#4f46e5", color: "white", fontSize: "0.75rem", fontWeight: 700,
        flexShrink: 0,
    },
    qrFrame: {
        padding: "12px", background: "white",
        border: "3px solid #4f46e5", borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(79,70,229,0.2)",
    },
    qrImage: { width: "200px", height: "200px", display: "block" },
    qrRaw: {
        fontFamily: "monospace", fontSize: "0.5rem", lineHeight: 1.2,
        whiteSpace: "pre", width: "200px", overflow: "auto", color: "#111",
    },
    qrNote: { color: "#9ca3af", fontSize: "0.75rem", margin: 0, textAlign: "center" },
    pulsingDot: {
        display: "flex", alignItems: "center", gap: "0.5rem",
        color: "#16a34a", fontSize: "0.875rem", fontWeight: 600,
    },
    dot: {
        display: "inline-block", width: "10px", height: "10px", borderRadius: "50%",
        background: "#22c55e", animation: "pulse 1.5s ease-in-out infinite",
    },
    btnPrimary: {
        background: "#4f46e5", color: "white", border: "none",
        padding: "0.75rem 2rem", borderRadius: "8px", cursor: "pointer",
        fontWeight: 600, fontSize: "0.9rem", transition: "background 0.2s",
    },
};
