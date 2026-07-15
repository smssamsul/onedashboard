"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import dynamic from "next/dynamic";
import "@/styles/sales/admin.css";
import "@/styles/sales/shared-table.css";
import "./sales-list.css";

// Dynamic import for modals to ensure client-side rendering
const AddSalesModal = dynamic(() => import("./addSales"), { ssr: false });
const EditSalesModal = dynamic(() => import("./editSales"), { ssr: false });
const DeleteSalesModal = dynamic(() => import("./deleteSales"), { ssr: false });
const BaileysQRModal = dynamic(() => import("./BaileysQRModal"), { ssr: false });

export default function SalesListPage() {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [search, setSearch] = useState("");

    // Modal states
    const [showAdd, setShowAdd] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [selectedSales, setSelectedSales] = useState(null);

    // Baileys states
    const [waEngine, setWaEngine] = useState("woowa"); // 'woowa' | 'baileys'
    const [baileysStatuses, setBaileysStatuses] = useState({}); // { [salesId]: 'open'|'qr'|'not_found'|'error' }
    const [qrModal, setQrModal] = useState(null); // { salesId, salesName } | null

    const fetchSalesData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("token");
            const res = await fetch("/api/sales/sales-list", {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setSalesData(json.data);

                    // Client-side stats calculation
                    const total = json.data.length;
                    const active = json.data.filter(item => item.user_rel?.status === "1").length;
                    setStats({
                        total: total,
                        active: active,
                        inactive: total - active
                    });
                }
            }
        } catch (err) {
            console.error("Error fetching sales list:", err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch WA engine aktif
    const fetchWaEngine = useCallback(async () => {
        try {
            const token = localStorage.getItem("token");
            const res = await fetch("/api/sales/baileys/engine", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setWaEngine(data.engine || "woowa");
            }
        } catch {
            // silent
        }
    }, []);

    // Fetch Baileys status untuk semua sales
    const fetchAllBaileysStatuses = useCallback(async (salesList) => {
        if (!salesList || salesList.length === 0) return;
        const token = localStorage.getItem("token");
        const statusMap = {};
        await Promise.all(
            salesList.map(async (s) => {
                try {
                    const res = await fetch(`/api/sales/baileys/status-by-sales/${s.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    statusMap[s.id] = data.status || "not_found";
                } catch {
                    statusMap[s.id] = "error";
                }
            })
        );
        setBaileysStatuses(statusMap);
    }, []);

    useEffect(() => {
        fetchSalesData();
        fetchWaEngine();
    }, [fetchWaEngine]);

    // Fetch Baileys status saat engine = baileys dan data sales sudah ada
    useEffect(() => {
        if (waEngine === "baileys" && salesData.length > 0) {
            fetchAllBaileysStatuses(salesData);
        }
    }, [waEngine, salesData, fetchAllBaileysStatuses]);

    const handleAddSuccess = () => {
        setShowAdd(false);
        fetchSalesData();
    };

    const handleEdit = (item) => {
        setSelectedSales(item);
        setShowEdit(true);
    };

    const handleEditSuccess = () => {
        setShowEdit(false);
        setSelectedSales(null);
        fetchSalesData();
    };

    const handleDelete = (item) => {
        setSelectedSales(item);
        setShowDelete(true);
    };

    const handleDeleteSuccess = () => {
        setShowDelete(false);
        setSelectedSales(null);
        fetchSalesData();
    };


    const formatDate = (dateString) => {
        if (!dateString) return "-";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("id-ID", {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    // Filter displayed data based on search
    const filteredData = useMemo(() => {
        if (!search) return salesData;
        const lowerSearch = search.toLowerCase();
        return salesData.filter(item =>
            item.user_rel?.nama?.toLowerCase().includes(lowerSearch) ||
            item.user_rel?.email?.toLowerCase().includes(lowerSearch) ||
            item.no_wa?.toLowerCase().includes(lowerSearch)
        );
    }, [search, salesData]);

    return (
        <Layout title="Sales Team Management">
            <div className="dashboard-shell table-shell">
                {/* Main Panel & Table */}
                <section className="panel">
                    <div className="panel__header">
                        <div>
                            <p className="panel__eyebrow">Team Management</p>
                            <h3 className="panel__title">Daftar Sales</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="customers-button customers-button--primary"
                                onClick={() => setShowAdd(true)}
                                style={{
                                    background: '#fb8500',
                                    color: 'white',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                + Tambah Sales
                            </button>
                        </div>
                    </div>

                    <div className="table-wrapper sales-list-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Urutan</th>
                                    <th>Nama Sales</th>
                                    <th>Email</th>
                                    <th>No WA</th>
                                    <th>Woowa Key</th>
                                    {waEngine === "baileys" && <th>WA Baileys</th>}
                                    <th>Last Update Lead</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="table-empty">Loading data...</td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="table-empty">Tidak ada data sales ditemukan.</td>
                                    </tr>
                                ) : (
                                    filteredData.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <span style={{ fontWeight: 500, color: '#475569' }}>
                                                    {item.urutan || "-"}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                                    {item.user_rel?.nama || "-"}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ color: '#475569' }}>{item.user_rel?.email || "-"}</div>
                                            </td>
                                            <td>
                                                {item.no_wa ? (
                                                    <a
                                                        href={`https://wa.me/${item.no_wa.replace(/[^0-9]/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            background: '#dcfce7',
                                                            color: '#16a34a',
                                                            fontWeight: 600,
                                                            fontSize: '0.8rem',
                                                            padding: '0.25rem 0.6rem',
                                                            borderRadius: '0.4rem',
                                                            textDecoration: 'none',
                                                            border: '1px solid #bbf7d0',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        title={`Chat WA: ${item.no_wa}`}
                                                    >
                                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                                            <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.99.574 3.844 1.568 5.399L2 22l4.759-1.548C8.23 21.406 10.07 22 12 22c5.523 0 10-4.477 10-10S17.522 2 12 2z" />
                                                        </svg>
                                                        {item.no_wa}
                                                    </a>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Belum diset</span>
                                                )}
                                            </td>
                                            <td>
                                                {item.woowa_key ? (
                                                    <div style={{
                                                        fontFamily: 'monospace',
                                                        background: '#f8fafc',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '0.25rem',
                                                        fontSize: '0.75rem',
                                                        color: '#475569',
                                                        border: '1px solid #cbd5e1',
                                                        display: 'inline-block'
                                                    }} title={item.woowa_key}>
                                                        {item.woowa_key}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Not Configured</span>
                                                )}
                                            </td>
                                            {/* Kolom Baileys Status — hanya tampil jika engine = baileys */}
                                            {waEngine === "baileys" && (
                                                <td>
                                                    {(() => {
                                                        const st = baileysStatuses[item.id];
                                                        if (st === "open" || st === "connected") {
                                                            return (
                                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                    <span style={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                                                        background: '#dcfce7', color: '#16a34a',
                                                                        fontWeight: 600, fontSize: '0.8rem',
                                                                        padding: '0.25rem 0.6rem', borderRadius: '0.4rem',
                                                                        border: '1px solid #bbf7d0'
                                                                    }}>Connected</span>

                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm(`Yakin ingin logout WA Baileys untuk ${item.user_rel?.nama}?`)) return;
                                                                            try {
                                                                                const token = localStorage.getItem("token");
                                                                                await fetch(`/api/sales/baileys/session-by-sales/${item.id}`, {
                                                                                    method: "DELETE",
                                                                                    headers: { Authorization: `Bearer ${token}` }
                                                                                });
                                                                                setBaileysStatuses(prev => ({ ...prev, [item.id]: "not_found" }));
                                                                            } catch (e) {
                                                                                console.error(e);
                                                                            }
                                                                        }}
                                                                        style={{
                                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                                            color: '#ef4444', fontSize: '0.75rem', textDecoration: 'underline', padding: 0
                                                                        }}
                                                                        title="Logout Baileys"
                                                                    >
                                                                        Logout
                                                                    </button>
                                                                </div>
                                                            );
                                                        }
                                                        if (st === undefined) {
                                                            return <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>...</span>;
                                                        }
                                                        return (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                                                    background: '#fee2e2', color: '#dc2626',
                                                                    fontWeight: 600, fontSize: '0.75rem',
                                                                    padding: '0.2rem 0.5rem', borderRadius: '0.4rem',
                                                                    border: '1px solid #fecaca'
                                                                }}>Not Connected</span>
                                                                <button
                                                                    id={`btn-qr-sales-${item.id}`}
                                                                    onClick={() => setQrModal({ salesId: item.id, salesName: item.user_rel?.nama || `Sales #${item.id}` })}
                                                                    style={{
                                                                        background: '#4f46e5', color: 'white',
                                                                        border: 'none', cursor: 'pointer',
                                                                        fontSize: '0.72rem', fontWeight: 600,
                                                                        padding: '0.2rem 0.5rem', borderRadius: '0.35rem'
                                                                    }}
                                                                    title="Generate QR Baileys"
                                                                >
                                                                    QR
                                                                </button>
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                            )}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569' }}>
                                                    <span>{formatDate(item.last_update_lead)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        className="table-shell action-btn action-btn--primary"
                                                        title="Edit"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="table-shell action-btn action-btn--danger"
                                                        title="Delete"
                                                        onClick={() => handleDelete(item)}
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination - Visual Placeholder matching image style */}
                    <div className="customers-pagination" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem", padding: "1.5rem", flexWrap: "wrap", borderTop: "1px solid #e2e8f0" }}>
                        <button
                            className="customers-pagination__btn"
                            disabled
                            style={{
                                padding: "0.5rem 1rem",
                                minWidth: "100px",
                                background: "#e5e7eb",
                                color: "#9ca3af",
                                border: "none",
                                borderRadius: "0.5rem",
                                cursor: "not-allowed",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            Previous
                        </button>

                        <div style={{
                            fontSize: "0.9rem",
                            color: "#475569",
                            fontWeight: 500
                        }}>
                            Page 1 of 1 ({salesData.length} total)
                        </div>

                        <button
                            className="customers-pagination__btn"
                            disabled
                            style={{
                                padding: "0.5rem 1rem",
                                minWidth: "100px",
                                background: "#e5e7eb",
                                color: "#9ca3af",
                                border: "none",
                                borderRadius: "0.5rem",
                                cursor: "not-allowed",
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            Next
                        </button>
                    </div>
                </section>

                {/* Modals */}
                {showAdd && (
                    <AddSalesModal
                        onClose={() => setShowAdd(false)}
                        onSuccess={handleAddSuccess}
                    />
                )}

                {showEdit && selectedSales && (
                    <EditSalesModal
                        sales={selectedSales}
                        onClose={() => {
                            setShowEdit(false);
                            setSelectedSales(null);
                        }}
                        onSuccess={handleEditSuccess}
                    />
                )}

                {showDelete && selectedSales && (
                    <DeleteSalesModal
                        sales={selectedSales}
                        onClose={() => {
                            setShowDelete(false);
                            setSelectedSales(null);
                        }}
                        onSuccess={handleDeleteSuccess}
                    />
                )}

                {/* Baileys QR Modal */}
                {qrModal && (
                    <BaileysQRModal
                        salesId={qrModal.salesId}
                        salesName={qrModal.salesName}
                        onClose={() => setQrModal(null)}
                        onConnected={() => {
                            setBaileysStatuses(prev => ({ ...prev, [qrModal.salesId]: "open" }));
                            setQrModal(null);
                        }}
                    />
                )}
            </div>
        </Layout>
    );
}
