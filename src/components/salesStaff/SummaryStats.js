import Link from "next/link";
import { Wallet, ShoppingCart, AlertCircle, TrendingUp, ArrowRight } from "lucide-react";

export default function SummaryStats({ orderStats, mePerformance }) {
    const formatCurrency = (val) => {
        return new Intl.NumberFormat("id-ID", {
            style: "currency",
            currency: "IDR",
            minimumFractionDigits: 0,
        }).format(Number(val) || 0);
    };

    const orderCards = [
        {
            label: "Total Revenue",
            value: orderStats.totalRevenueFormatted || formatCurrency(orderStats.totalRevenue),
            icon: <Wallet size={24} />,
            color: "accent-emerald",
            desc: "Total Pendapatan"
        },
        {
            label: "Total Orders",
            value: (orderStats.totalOrders || 0).toLocaleString("id-ID"),
            icon: <ShoppingCart size={24} />,
            color: "accent-blue",
            desc: "Total Pesanan"
        },
        {
            label: "Unpaid Orders",
            value: (orderStats.unpaidCount || 0).toLocaleString("id-ID"),
            icon: <AlertCircle size={24} />,
            color: "accent-red",
            desc: "Belum Dibayar"
        },
        {
            label: "Conversion Rate",
            value: mePerformance?.conversion_rate_formatted || orderStats.conversionRateFormatted || "0.00%",
            icon: <TrendingUp size={24} />,
            color: "accent-cyan",
            desc: "Success / Total"
        }
    ];

    return (
        <section className="dashboard-panels">
            <article className="panel panel--summary">
                <div className="panel__header">
                    <div>
                        <p className="panel__eyebrow">Sales Performance</p>
                        <h3 className="panel__title">Order Overview</h3>
                    </div>
                    <Link href="/sales/staff/orders" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem', color: '#3b82f6', fontWeight: 500, textDecoration: 'none' }}>
                        Lihat Semua Order <ArrowRight size={16} />
                    </Link>
                </div>
                <div className="dashboard-summary-horizontal">
                    {orderCards.map((card) => (
                        <article className="summary-card" key={card.label}>
                            <div className={`summary-card__icon ${card.color}`}>{card.icon}</div>
                            <div>
                                <p className="summary-card__label">{card.label}</p>
                                <p className="summary-card__value">{card.value}</p>
                                {card.desc && <p className="summary-card__desc">{card.desc}</p>}
                            </div>
                        </article>
                    ))}
                </div>
            </article>

            <style jsx>{`
                .dashboard-summary-horizontal {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                    margin-top: 1.5rem;
                }

                .summary-card {
                    background: #ffffff;
                    border: 1px solid #f1f5f9;
                    border-radius: 1rem;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    transition: all 0.3s ease;
                }

                .summary-card__value { 
                    font-size: 1.35rem; 
                    font-weight: 850; 
                    color: #001f3f; 
                    line-height: 1.2;
                }

                .summary-card__desc { 
                    font-size: 0.75rem; 
                    color: #64748b; 
                    margin-top: 4px; 
                    font-weight: 500;
                }

                @media (max-width: 1024px) {
                    .dashboard-summary-horizontal {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .dashboard-summary-horizontal {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
}
