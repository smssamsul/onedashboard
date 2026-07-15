import { useState, Fragment } from "react";
import { Package, ChevronDown, ChevronUp, User, CheckCircle2, AlertCircle, Users } from "lucide-react";

export default function ProductPerformanceAll({ productStats, productSummary, loading }) {
    const [expandedRow, setExpandedRow] = useState(null);

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
        <section className="dashboard-panels" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
            <article className="panel">
                <div className="panel__header">
                    <div>
                        <p className="panel__eyebrow">Product Performance (All Staff)</p>
                        <h3 className="panel__title">Statistik Produk Terlaris Anda</h3>
                        <p className="panel__subtitle">Analisis performa penjualan berdasarkan kategori produk dari seluruh sales</p>
                    </div>
                    {productSummary && (
                        <div className="summary-pills">
                            <div className="pill">
                                <span className="pill-label">Total Produk:</span>
                                <span className="pill-value">{productSummary.total_produk}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Informasi Produk</th>
                                <th style={{ textAlign: "center" }}>Total Leads</th>
                                <th style={{ textAlign: "center" }}>Conversion</th>
                                <th style={{ textAlign: "right" }}>Revenue (Paid)</th>
                                <th style={{ textAlign: "right" }}>Potential (Unpaid)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productStats && productStats.length > 0 ? (
                                productStats.map((prod, idx) => {
                                    const isExpanded = expandedRow === (prod.produk_id || idx);
                                    return (
                                        <Fragment key={prod.produk_id || idx}>
                                            <tr
                                                onClick={() => toggleRow(prod.produk_id || idx)}
                                                className={`product-row-main ${isExpanded ? 'is-expanded' : ''}`}
                                            >
                                                <td>
                                                    <div className="product-info-cell">
                                                        <div className="product-icon-box">
                                                            <Package size={18} />
                                                        </div>
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <p className="product-name-txt">{prod.produk_nama}</p>
                                                                {isExpanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                                                            </div>
                                                            <span className="product-code-badge">{prod.produk_kode}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="stat-value-main">{prod.total_customers}</span>
                                                    <p className="stat-sub-txt">Customers</p>
                                                </td>
                                                <td>
                                                    <div className="conversion-container">
                                                        <div className="conversion-text">
                                                            <span className="paid-count">{prod.total_paid}</span>
                                                            <span className="total-count">/ {prod.total_customers}</span>
                                                            <span className="percent-badge">
                                                                {prod.total_customers > 0
                                                                    ? `${((prod.total_paid / prod.total_customers) * 100).toFixed(0)}%`
                                                                    : '0%'}
                                                            </span>
                                                        </div>
                                                        <div className="progress-bar-bg">
                                                            <div
                                                                className="progress-bar-fill"
                                                                style={{
                                                                    width: `${prod.total_customers > 0 ? (prod.total_paid / prod.total_customers) * 100 : 0}%`,
                                                                    backgroundColor: prod.total_paid > 0 ? '#10b981' : '#e2e8f0'
                                                                }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <p className="revenue-paid">{prod.total_revenue_formatted}</p>
                                                    <span className="revenue-count">{prod.total_paid} Closing</span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <p className="revenue-pending">{prod.total_pending_revenue_formatted}</p>
                                                    <span className="revenue-count">{prod.total_unpaid} Pending</span>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="expansion-row">
                                                    <td colSpan="5">
                                                        <div className="expansion-content">

                                                            {/* 1. Sales Distribution Section */}
                                                            <div className="distribution-section" style={{ marginBottom: '2rem' }}>
                                                                <div className="sub-section-header" style={{ color: '#3b82f6', borderBottomColor: '#dbeafe' }}>
                                                                    <Users size={16} />
                                                                    <span>Distribusi Sales ({prod.sales_distribution?.length || 0})</span>
                                                                </div>
                                                                <div className="distribution-grid">
                                                                    {prod.sales_distribution?.length > 0 ? (
                                                                        prod.sales_distribution.map(s => (
                                                                            <div key={s.sales_id} className="sales-mini-card">
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                                                    <p className="s-name">{s.sales_nama}</p>
                                                                                    <span className="s-rev">{s.total_revenue_formatted}</span>
                                                                                </div>
                                                                                <div className="s-stats-row">
                                                                                    <div className="s-stat">
                                                                                        <span>Leads</span>
                                                                                        <strong>{s.total_customers}</strong>
                                                                                    </div>
                                                                                    <div className="s-stat highlight-paid">
                                                                                        <span>Paid</span>
                                                                                        <strong>{s.total_paid}</strong>
                                                                                    </div>
                                                                                    <div className="s-stat highlight-unpaid">
                                                                                        <span>Unpaid</span>
                                                                                        <strong>{s.total_unpaid}</strong>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <p className="empty-sub-txt">Belum ada distribusi sales.</p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* 2. Customer Lists Section */}
                                                            <div className="order-lists-grid">
                                                                {/* Paid Orders Section */}
                                                                <div className="order-sub-section">
                                                                    <div className="sub-section-header paid">
                                                                        <CheckCircle2 size={16} />
                                                                        <span>Paid Orders ({prod.customers_paid?.length || 0})</span>
                                                                    </div>
                                                                    <div className="customer-mini-list">
                                                                        {prod.customers_paid?.length > 0 ? (
                                                                            prod.customers_paid.map(c => (
                                                                                <div key={c.order_id} className="mini-card paid">
                                                                                    <div className="mini-card-main">
                                                                                        <div className="m-avatar"><User size={12} /></div>
                                                                                        <div className="m-info">
                                                                                            <p className="m-name">{c.customer_nama}</p>
                                                                                            <p className="m-meta">By {c.sales_nama} • Order #{c.order_id} • {c.create_at}</p>
                                                                                        </div>
                                                                                        <div className="m-price">{c.total_harga_formatted}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="empty-sub-txt">Belum ada order lunas.</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Unpaid Orders Section */}
                                                                <div className="order-sub-section">
                                                                    <div className="sub-section-header unpaid">
                                                                        <AlertCircle size={16} />
                                                                        <span>Unpaid Orders ({prod.customers_unpaid?.length || 0})</span>
                                                                    </div>
                                                                    <div className="customer-mini-list">
                                                                        {prod.customers_unpaid?.length > 0 ? (
                                                                            prod.customers_unpaid.map(c => (
                                                                                <div key={c.order_id} className="mini-card unpaid">
                                                                                    <div className="mini-card-main">
                                                                                        <div className="m-avatar"><User size={12} /></div>
                                                                                        <div className="m-info">
                                                                                            <p className="m-name">{c.customer_nama}</p>
                                                                                            <p className="m-meta">By {c.sales_nama} • Order #{c.order_id} • {c.create_at}</p>
                                                                                        </div>
                                                                                        <div className="m-price">{c.total_harga_formatted}</div>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <p className="empty-sub-txt">Tidak ada order tertunda.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="table-empty">
                                        {loading ? "Memuat data statistik produk..." : "Belum ada statistik produk tersedia."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </article>

            <style jsx>{`
                .product-row-main { cursor: pointer; transition: background 0.2s ease; }
                .product-row-main:hover { background-color: #f8fafc; }
                .product-row-main.is-expanded { background-color: #f1f5f9; }

                .data-table th {
                    background-color: #f97316; color: #fff; font-weight: 700;
                    font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px;
                }
                .data-table th:first-child { border-top-left-radius: 8px; border-bottom-left-radius: 8px; }
                .data-table th:last-child { border-top-right-radius: 8px; border-bottom-right-radius: 8px; }
                .data-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
                
                .expansion-row td { padding: 0 !important; border-bottom: 2px solid #e2e8f0; }
                .expansion-content { background: #f8fafc; padding: 1.5rem; border-left: 4px solid #f97316; }
                
                .distribution-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
                .sales-mini-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
                .s-name { font-weight: 700; color: #1e293b; font-size: 0.85rem; margin: 0; }
                .s-rev { font-size: 0.75rem; font-weight: 800; color: #059669; }
                .s-stats-row { display: flex; justify-content: space-between; border-top: 1px solid #f1f5f9; margin-top: 8px; padding-top: 8px; }
                .s-stat { display: flex; flex-direction: column; align-items: center; flex: 1; }
                .s-stat span { font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
                .s-stat strong { font-size: 0.8rem; color: #1e293b; }
                .s-stat.highlight-paid strong { color: #059669; }
                .s-stat.highlight-unpaid strong { color: #f97316; }

                .order-lists-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
                .order-sub-section { display: flex; flex-direction: column; gap: 1rem; }
                
                .sub-section-header { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.85rem; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
                .sub-section-header.paid { color: #059669; }
                .sub-section-header.unpaid { color: #f97316; }
                
                .customer-mini-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; padding-right: 5px; }
                .customer-mini-list::-webkit-scrollbar { width: 4px; }
                .customer-mini-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

                .mini-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; transition: transform 0.2s; }
                .mini-card:hover { transform: translateX(5px); border-color: #cbd5e1; }
                .mini-card-main { display: flex; align-items: center; gap: 12px; }
                
                .m-avatar { width: 28px; height: 28px; background: #f1f5f9; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #64748b; flex-shrink: 0; }
                .m-info { flex: 1; }
                .m-name { font-weight: 700; color: #1e293b; font-size: 0.8rem; margin: 0; line-height: 1.2; }
                .m-meta { font-size: 0.65rem; color: #94a3b8; margin: 2px 0 0 0; }
                .m-price { font-weight: 800; color: #1e293b; font-size: 0.8rem; }
                
                .empty-sub-txt { font-size: 0.75rem; color: #94a3b8; font-style: italic; margin: 0; }

                .product-info-cell { display: flex; align-items: center; gap: 12px; }
                .product-icon-box {
                    width: 36px; height: 36px; background: #eff6ff; color: #3b82f6; 
                    border-radius: 8px; display: flex; align-items: center; justify-content: center;
                }
                .product-name-txt { font-weight: 700; color: #1e293b; margin: 0; font-size: 0.9rem; }
                .product-code-badge { 
                    font-size: 0.65rem; font-weight: 700; color: #64748b; background: #f1f5f9; 
                    padding: 2px 6px; border-radius: 4px; text-transform: uppercase;
                }

                .stat-value-main { font-size: 1.1rem; font-weight: 800; color: #1e293b; }
                .stat-sub-txt { font-size: 0.75rem; color: #94a3b8; margin: 0; }

                .conversion-container { width: 100%; max-width: 140px; }
                .conversion-text { display: flex; align-items: baseline; gap: 4px; margin-bottom: 6px; }
                .paid-count { font-weight: 800; color: #10b981; font-size: 0.9rem; }
                .total-count { color: #94a3b8; font-size: 0.75rem; }
                .percent-badge { 
                    margin-left: auto; font-size: 0.7rem; font-weight: 700; color: #3b82f6;
                    background: #eff6ff; padding: 1px 5px; border-radius: 4px;
                }
                .progress-bar-bg { width: 100%; height: 6px; background: #f1f5f9; border-radius: 10px; overflow: hidden; }
                .progress-bar-fill { height: 100%; border-radius: 10px; transition: width 0.5s ease; }

                .revenue-paid { font-weight: 800; color: #059669; font-size: 0.95rem; margin: 0; }
                .revenue-pending { font-weight: 800; color: #d97706; font-size: 0.95rem; margin: 0; }
                .revenue-count { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }

                .summary-pills { display: flex; gap: 10px; }
                .pill { background: #f8fafc; border: 1px solid #e2e8f0; padding: 4px 12px; border-radius: 20px; display: flex; gap: 6px; align-items: center; }
                .pill-label { font-size: 0.7rem; color: #64748b; font-weight: 600; }
                .pill-value { font-size: 0.75rem; color: #1e293b; font-weight: 800; }
                .panel__subtitle { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
                
                @media (max-width: 1024px) {
                    .order-lists-grid { grid-template-columns: 1fr; gap: 1.5rem; }
                }
            `}</style>
        </section>
    );
}
