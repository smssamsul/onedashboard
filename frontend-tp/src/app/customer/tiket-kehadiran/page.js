"use client";

import { useState, useEffect, useRef } from "react";
import CustomerLayout from "@/components/customer/CustomerLayout";
import { customerFetch } from "@/lib/customerAuth";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Download, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

function TiketCard({ order }) {
    const canvasRef = useRef(null);

    const handleDownload = () => {
        const canvas = canvasRef.current?.querySelector("canvas");
        if (!canvas) return;
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `tiket-kehadiran-${order.kode_order || order.id}.png`.replace(/\s+/g, "-").toLowerCase();
        link.click();
    };

    return (
        <div className="tiket-card">
            <div className="tiket-card-header">
                <h3>{order.produk_nama || "Produk"}</h3>
                <p>{order.tanggal_order || "-"}</p>
            </div>
            <div ref={canvasRef} className="tiket-card-qr">
                <QRCodeCanvas value={order.qr_token} size={200} level="M" includeMargin />
            </div>
            <p className="tiket-card-hint">Tunjukkan QR ini ke petugas saat check-in di lokasi acara</p>
            <button type="button" className="tiket-card-download" onClick={handleDownload}>
                <Download size={16} /> Download QR
            </button>
        </div>
    );
}

export default function TiketKehadiranPage() {
    const [tikets, setTikets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTikets();
    }, []);

    const fetchTikets = async () => {
        setLoading(true);
        try {
            const res = await customerFetch("/dashboard");
            const orders = Array.isArray(res?.data?.orders_aktif) ? res.data.orders_aktif : [];
            setTikets(orders.filter((o) => o.qr_token));
        } catch (err) {
            console.error("Fetch tiket kehadiran error:", err);
            toast.error(err.message || "Gagal memuat tiket kehadiran Anda");
        } finally {
            setLoading(false);
        }
    };

    return (
        <CustomerLayout>
            <div className="tiket-container">
                <div className="tiket-header">
                    <h1>Tiket Kehadiran</h1>
                    <p>QR tiket untuk check-in di lokasi acara seminar/event yang sudah Anda bayar lunas</p>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <Loader2 size={32} className="spinner-icon" />
                        <p>Memuat tiket Anda...</p>
                    </div>
                ) : tikets.length > 0 ? (
                    <div className="tiket-grid">
                        {tikets.map((order) => (
                            <TiketCard key={order.id} order={order} />
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <QrCode size={48} />
                        <h3>Belum ada tiket kehadiran</h3>
                        <p>Tiket QR akan muncul di sini begitu pembayaran seminar/event Anda sudah lunas.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .tiket-container { max-width: 1000px; margin: 0 auto; padding: 32px 20px 60px; }
                .tiket-header { margin-bottom: 24px; }
                .tiket-header h1 { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0; }
                .tiket-header p { color: #64748b; font-size: 14px; margin: 0; }

                .tiket-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
                .tiket-card {
                    display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 20px;
                    background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; text-align: center;
                }
                .tiket-card-header h3 { font-size: 15px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
                .tiket-card-header p { font-size: 12px; color: #94a3b8; margin: 0; }
                .tiket-card-qr { padding: 12px; background: #fff; border: 1px solid #f1f5f9; border-radius: 10px; }
                .tiket-card-hint { font-size: 12px; color: #64748b; margin: 0; }
                .tiket-card-download {
                    display: flex; align-items: center; gap: 6px; padding: 8px 16px;
                    background: #ff7a00; color: #fff; border: none; border-radius: 10px;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                }
                .tiket-card-download:hover { background: #e56d00; }

                .loading-state, .empty-state {
                    text-align: center; padding: 80px 20px; color: #64748b;
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                }
                .empty-state svg { color: #cbd5e1; margin-bottom: 8px; }
                .empty-state h3 { font-size: 18px; color: #1e293b; margin: 0; }
                .empty-state p { font-size: 14px; margin: 0; }
                .spinner-icon { animation: spin 1s linear infinite; color: #ff7a00; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </CustomerLayout>
    );
}
