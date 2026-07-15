"use client";

import { useRouter } from "next/navigation";

export default function OrdersSection({
  orders,
  isLoading,
  currentTime,
  onOrderAction,
  onPaymentAction,
  isPaymentLoading
}) {
  const router = useRouter();

  const getCountdownLabel = (order) => {
    if (!order.startDate) return null;
    const diff = order.startDate.getTime() - currentTime;
    if (diff <= 0) return "Jadwal sudah dimulai";

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const days = Math.floor(totalMinutes / (60 * 24));
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    parts.push(`${minutes} menit`);

    return parts.join(" ");
  };

  const handleOrderClick = (order) => {
    // If order is not paid, redirect to payment page
    if (!order.isPaid) {
      router.push('/customer/dashboard/payment');
      return;
    }

    if (onOrderAction) {
      onOrderAction(order);
    } else {
      const kategoriLower = order.kategoriNama?.toLowerCase() || "";
      if (kategoriLower === "webinar" || kategoriLower === "seminar") {
        router.push(`/customer/webinar/${order.id}`);
      } else if (kategoriLower === "e-book" || kategoriLower === "ebook") {
        if (order.slug && order.slug !== "-") {
          router.push(order.slug);
        }
      } else {
        router.push(`/customer/orders/${order.id}`);
      }
    }
  };

  return (
    <section className="orders-section">
      <div className="orders-section__header">
        <div>
          <h2>Order Aktif Saya</h2>
          <p>Lanjutkan pembelajaran Anda dari sini</p>
        </div>
        {orders.length > 0 && (
          <div className="orders-section__badge">
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
          </div>
        )}
      </div>

      <div className="orders-list">
        {isLoading && (
          <div className="order-card order-card--loading">
            <div className="order-body">
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h3>Memuat order...</h3>
                <p>Mohon tunggu sebentar</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="order-card order-card--empty">
            <div className="order-body">
              <div className="empty-state">
                <div className="empty-state__icon">📋</div>
                <h3>Belum ada order aktif</h3>
                <p>Mulai perjalanan pembelajaran Anda dengan menjelajahi produk kami</p>
                <button
                  className="empty-state__cta"
                  onClick={() => router.push('/')}
                >
                  Jelajahi Produk
                </button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && orders.map((order) => {
          const countdown = getCountdownLabel(order);
          // isPaid berdasarkan status_pembayaran === 2
          const isPaid = order.isPaid === true;

          return (
            <div
              key={order.id}
              className={`order-card ${!isPaid ? 'order-card--locked' : ''}`}
              style={{ position: 'relative' }}
            >
              {!isPaid && (
                <div className="order-card__lock-overlay" style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  backdropFilter: 'blur(2px)',
                  zIndex: 1,
                  borderRadius: 'inherit',
                  pointerEvents: 'none'
                }}>
                </div>
              )}

              <div className="order-card__banner" style={{ position: 'relative', zIndex: 2 }}>
                <span className="order-badge">{order.type}</span>
                {countdown && isPaid && (
                  <div className="order-countdown">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M8 4V8L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>{countdown}</span>
                  </div>
                )}
              </div>

              <div className="order-body" style={{ position: 'relative', zIndex: 2 }}>
                <div className="order-header">
                  <h3>{order.title}</h3>
                  <p className="order-subtitle">{order.slug}</p>
                </div>

                <div className="order-meta">
                  <div className="order-meta__item">
                    <span className="order-meta__label">Total Harga</span>
                    <strong className="order-meta__value">{order.total}</strong>
                  </div>
                  <div className="order-meta__item">
                    <span className="order-meta__label">Tanggal Order</span>
                    <strong className="order-meta__value">{order.orderDate}</strong>
                  </div>
                </div>
              </div>

              <div className="order-footer" style={{ position: 'relative', zIndex: 2 }}>
                {order.schedule && isPaid && (
                  <div className="order-schedule">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="3" y="4" width="10" height="9" rx="1" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M3 6H13" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M10 2V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <div>
                      <span>Jadwal</span>
                      <strong>{order.schedule}</strong>
                    </div>
                  </div>
                )}

                {isPaid ? (
                  <button
                    className="order-action"
                    onClick={() => handleOrderClick(order)}
                  >
                    <span>{order.actionLabel}</span>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : (
                  <button
                    className="order-action"
                    onClick={() => onPaymentAction && onPaymentAction(order)}
                    disabled={isPaymentLoading}
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      background: isPaymentLoading ? '#94a3b8' : '#dc2626',
                      cursor: isPaymentLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isPaymentLoading ? (
                      <>
                        <div className="loading-spinner--mini" style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: '#fff',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          marginRight: '8px'
                        }}></div>
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <span>Lanjutkan Pembayaran</span>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                          <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


