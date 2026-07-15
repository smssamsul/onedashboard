"use client";

import { useState, useEffect } from "react";

// Helper untuk format currency
const formatCurrency = (value) => {
    if (value == null) return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(number);
};

// Helper logic status Paid (disamakan dengan viewCustomer.js)
// Helper logic status Paid (Strict check on status_pembayaran)
const isOrderPaid = (order) => {
    // Logic ketat: Hanya status_pembayaran '2' atau 'paid' yang dianggap paid.
    // Null dianggap unpaid.
    const statusBayar = order.status_pembayaran;
    return statusBayar == "2" || statusBayar === 2 || statusBayar == "paid";
};

export default function CustomerOrderStatsCells({ customerId }) {
    const [stats, setStats] = useState({
        count: 0,
        revenue: 0,
        loading: true,
        error: false
    });

    useEffect(() => {
        let isMounted = true;

        async function fetchStats() {
            if (!customerId) return;

            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`/api/sales/customer/riwayat-order/${customerId}`, {
                    headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                });

                if (!res.ok) throw new Error("Failed");

                const json = await res.json();

                if (isMounted) {
                    if (json.success && Array.isArray(json.data)) {
                        const orders = json.data;

                        // Hitung hanya yang PAID
                        const paidOrders = orders.filter(o => isOrderPaid(o));

                        const count = paidOrders.length;
                        const revenue = paidOrders.reduce((sum, o) => {
                            return sum + (Number(o.total_harga) || 0);
                        }, 0);

                        setStats({ count, revenue, loading: false, error: false });
                    } else {
                        setStats({ count: 0, revenue: 0, loading: false, error: false });
                    }
                }
            } catch (err) {
                if (isMounted) {
                    // Silent error, show 0/-
                    setStats({ count: 0, revenue: 0, loading: false, error: true });
                }
            }
        }

        fetchStats();

        return () => { isMounted = false; };
    }, [customerId]);

    if (stats.loading) {
        return (
            <>
                <td style={{ color: "#9ca3af" }}>...</td>
                <td style={{ color: "#9ca3af" }}>...</td>
            </>
        );
    }

    if (stats.error) {
        return (
            <>
                <td>-</td>
                <td>-</td>
            </>
        );
    }

    return (
        <>
            <td>
                <span style={{
                    fontWeight: 600,
                    color: stats.count > 0 ? "#059669" : "#64748b"
                }}>
                    {stats.count}
                </span>
            </td>
            <td>
                <span style={{
                    fontWeight: 500,
                    color: stats.revenue > 0 ? "#111827" : "#64748b"
                }}>
                    {stats.revenue > 0 ? formatCurrency(stats.revenue) : "-"}
                </span>
            </td>
        </>
    );
}
