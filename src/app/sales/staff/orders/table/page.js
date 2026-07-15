"use client";

import { useEffect, useState } from "react";
import "./table-orders.css";
import { ExternalLink, Image as ImageIcon } from "lucide-react";

// --- WABubbleChat Implementation for Experiment ---
const WABubbleChat = ({ customerId, orderId, orderStatus, statusPembayaran }) => {
    const [followupLogs, setFollowupLogs] = useState([]);

    useEffect(() => {
        if (!customerId) return;

        const fetchFollowupLogs = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
                if (!token) return;

                const res = await fetch(`/api/sales/logs-follup?customer_id=${customerId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setFollowupLogs(data.data || []);
                }
            } catch (err) {
                console.error("Error fetching logs:", err);
            }
        };

        fetchFollowupLogs();
    }, [customerId, orderId]);

    const isSent = (eventType) => {
        if (!followupLogs || followupLogs.length === 0) return false;

        // Cek apakah ada log untuk event type ini
        // Event type "W" special case
        if (eventType === "W") {
            // Logic simplified for experiment: if logs exist, assume "W" is active/sent
            return followupLogs.some(log => log.customer_id === customerId); // Simplified check
        }

        // Mapping type string ke log content keywords atau logic spesifik
        // Disederhanakan untuk demo
        return false;
    };

    // Bubble definitions
    const bubbles = [
        { type: "W", label: "W" }, // Welcome / Initiation
        { type: "1", label: "1" },
        { type: "2", label: "2" },
        { type: "3", label: "3" },
        { type: "4", label: "4" },
    ];

    // Status Logic for Bubbles (Inactive/Active based on props)
    // This is a visual representation for the experiment
    const getBubbleClass = (type) => {
        let isActive = false;

        // Simple logic for experiment visualization
        if (type === "W") isActive = true; // Always active for demo
        else if (type === "1" && statusPembayaran === 0) isActive = true;

        return isActive ? "wa-bubble active" : "wa-bubble inactive";
    };

    return (
        <div className="follow-up-container">
            <div className={`wa-bubble-icon ${true ? 'active' : ''}`}>
                <i className="pi pi-whatsapp" style={{ fontSize: '14px' }}></i>
            </div>
            {bubbles.map((b) => (
                <div key={b.type} className={getBubbleClass(b.type)}>
                    {b.label}
                </div>
            ))}
            <div className="wa-bubble menu">
                <span>⋮</span>
            </div>
        </div>
    );
};

// --- Constants ---
const STATUS_PEMBAYARAN_MAP = {
    0: { label: "Unpaid", class: "unpaid" },
    null: { label: "Unpaid", class: "unpaid" },
    1: { label: "Waiting Approval", class: "pending" }, // Menunggu approve finance
    2: { label: "Paid", class: "paid" },             // Finance approved
    3: { label: "Rejected", class: "rejected" },
    4: { label: "Partial Payment", class: "partial" },
};

const STATUS_ORDER_MAP = {
    "1": { label: "Pending", class: "pending" },
    "2": { label: "Processing", class: "success" },
    "3": { label: "Failed", class: "failed" },
    "4": { label: "Completed", class: "completed" },
    "N": { label: "Deleted", class: "deleted" },
};

// --- Helper Functions ---
const formatOrderDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const buildImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return `/api/image?path=${encodeURIComponent(cleanPath)}`;
};


export default function TableExperiment() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
                if (!token) return;

                const res = await fetch("/api/sales/order", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setOrders(data.data?.data || []); // Adjust based on API structure
                }
            } catch (err) {
                console.error("Fetch error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []);

    // Placeholder handlers
    const handleView = (order) => { console.log("View", order.id); };
    const handleEdit = (order) => { console.log("Edit", order.id); };
    const handleOpenImageModal = (url) => { window.open(url, "_blank"); };

    return (
        <div className="table-experiment-container">
            <div className="table-experiment-header">
                <h1>Experimental Orders Table</h1>
                <p>Features: Double sticky left columns (Checkbox + ID) and sticky right action column.</p>
            </div>

            <div className="table-wrapper">
                <table className="table-orders">
                    <thead>
                        <tr>
                            {/* Sticky left 1: Checkbox */}
                            <th className="sticky-left-1" style={{ width: '50px', minWidth: '50px' }}>
                                <input type="checkbox" className="checkbox-custom" />
                            </th>

                            {/* Sticky left 2: Order ID */}
                            <th className="sticky-left-2">Order ID</th>

                            <th>Customer</th>
                            <th>Produk</th>
                            <th>Status Pembayaran</th>
                            <th>Status Order</th>
                            <th>Follow Up Text</th>
                            <th style={{ textAlign: 'center' }}>Bukti Pembayaran</th>
                            <th>Gross Revenue</th>
                            <th>Sales</th>

                            {/* Sticky right: Action */}
                            <th className="sticky-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                        ) : orders.length === 0 ? (
                            <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>No orders found.</td></tr>
                        ) : (
                            orders.map((order, index) => {
                                const produkNama = order.produk_rel?.nama || "-";
                                const customerNama = order.customer_rel?.nama || "-";

                                const statusOrderRaw = order.status_order ?? order.status;
                                const statusOrderInfo = STATUS_ORDER_MAP[statusOrderRaw] || { label: "-", class: "default" };

                                const statusPembayaranInfo = STATUS_PEMBAYARAN_MAP[Number(order.status_pembayaran) || 0];

                                const buktiUrl = buildImageUrl(order.bukti_pembayaran);

                                return (
                                    <tr key={order.id || index}>
                                        {/* Sticky left 1: Checkbox */}
                                        <td className="sticky-left-1">
                                            <input type="checkbox" className="checkbox-custom" />
                                        </td>

                                        {/* Sticky left 2: Order ID + External Link */}
                                        <td className="sticky-left-2">
                                            <div className="order-id-cell">
                                                <div className="order-id-content">
                                                    <div>
                                                        <a href={`/order/${order.id}`} className="order-id-link">
                                                            <p className="order-id-text">{order.id}</p>
                                                            <p className="order-date-text">{formatOrderDate(order.tanggal || order.create_at)}</p>
                                                        </a>
                                                    </div>
                                                    <ExternalLink
                                                        size={16}
                                                        className="external-link-icon"
                                                        onClick={(e) => { e.stopPropagation(); handleView(order); }}
                                                    />
                                                </div>
                                            </div>
                                        </td>

                                        {/* Scrollable Columns */}
                                        <td>
                                            <div className="customer-cell">
                                                <span className="customer-name">{customerNama}</span>
                                                <span className="customer-detail">{order.customer_rel?.wa ? `+${order.customer_rel.wa}` : "-"}</span>
                                            </div>
                                        </td>

                                        <td>{produkNama}</td>

                                        <td>
                                            <span className={`status-badge payment-${statusPembayaranInfo.class}`}>
                                                {statusPembayaranInfo.label}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={`status-badge status-${statusOrderInfo.class}`}>
                                                {statusOrderInfo.label}
                                            </span>
                                        </td>

                                        <td>
                                            <WABubbleChat
                                                customerId={order.customer_rel?.id}
                                                orderId={order.id}
                                                statusPembayaran={order.status_pembayaran}
                                            />
                                        </td>

                                        <td style={{ textAlign: 'center' }}>
                                            {buktiUrl ? (
                                                <ImageIcon size={20} className="proof-icon" onClick={() => handleOpenImageModal(buktiUrl)} />
                                            ) : <span className="no-data">-</span>}
                                        </td>

                                        <td className="revenue-text">
                                            Rp {Number(order.total_harga || 0).toLocaleString("id-ID")}
                                        </td>

                                        <td>
                                            {order.customer_rel?.sales_rel?.nama || "-"}
                                        </td>

                                        {/* Sticky Right: Action */}
                                        <td className="sticky-right">
                                            <div className="action-menu">
                                                <button
                                                    style={{
                                                        padding: "0.4rem 0.75rem",
                                                        fontSize: "0.8rem",
                                                        whiteSpace: "nowrap",
                                                        background: "#f1a124",
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "0.5rem",
                                                        cursor: "pointer"
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(order);
                                                    }}
                                                >
                                                    Action
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
