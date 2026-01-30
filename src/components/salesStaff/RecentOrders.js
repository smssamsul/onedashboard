import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function RecentOrders({ recentOrders, formatCurrency }) {
    return (
        <section className="dashboard-panels">
            <article className="panel">
                <div className="panel__header">
                    <div>
                        <h3 className="panel__title">Recent Orders</h3>
                        <p className="panel__subtitle">Daftar transaksi pelanggan terakhir</p>
                    </div>
                    <Link href="/sales/staff/orders" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}>
                        Lihat Semua Order <ArrowRight size={16} />
                    </Link>
                </div>
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length > 0 ? (
                                recentOrders.map((order, idx) => (
                                    <tr key={order.id || idx}>
                                        <td>
                                            <div className="customer-cell">
                                                <div className="avatar-small">
                                                    {order.customer_rel?.nama?.charAt(0) || order.customer_nama?.charAt(0) || order.customer?.charAt(0) || "C"}
                                                </div>
                                                <div>
                                                    <span className="customer-name" style={{ fontSize: '0.85rem' }}>
                                                        {order.customer_rel?.nama || order.customer_nama || order.customer || "-"}
                                                    </span>
                                                    <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>
                                                        {order.tanggal_order || order.tanggal || order.create_at || "-"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${String(order.status_pembayaran) === '2' ? 'paid' : 'unpaid'}`} style={{ fontSize: '0.65rem' }}>
                                                {String(order.status_pembayaran) === '2' ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }}>
                                            {order.total_harga_formatted || formatCurrency(order.total_harga)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="table-empty">Belum ada order terbaru.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </article>

            <style jsx>{`
                .data-table th {
                    background-color: #f97316;
                    color: #fff;
                    font-weight: 700;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 12px 16px;
                }
                .data-table th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
                .data-table th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
                .data-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }

                .status-badge {
                    font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 5px; text-transform: uppercase;
                }
                .status-badge.paid { background: #dcfce7; color: #15803d; }
                .status-badge.unpaid { background: #fff7ed; color: #f97316; border: 1px solid #ffedd5; }

                .customer-name { font-weight: 700; color: #1e293b; font-size: 0.9rem; }
                .avatar-small {
                    width: 32px; height: 32px; background: #f1f5f9; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; color: #475569; font-size: 11px; flex-shrink: 0;
                }
                .customer-cell { display: flex; align-items: center; gap: 10px; }
                .panel__subtitle { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
            `}</style>
        </section>
    );
}
