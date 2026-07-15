"use client";

import React from 'react';
import { X, CreditCard, Calendar, ChevronRight, AlertCircle, ShoppingBag } from 'lucide-react';

export default function UnpaidOrdersModal({ isOpen, onClose, orders = [], onPaymentAction, isPaymentLoading }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatPrice = (price) => {
    if (!price) return "0";
    const numPrice = typeof price === "string" ? parseInt(price.replace(/[^\d]/g, "")) : price;
    return (isNaN(numPrice) ? 0 : numPrice).toLocaleString("id-ID");
  };

  return (
    <div className="saas-modal-overlay" onClick={handleOverlayClick}>
      <div className="saas-modal" onClick={(e) => e.stopPropagation()}>
        <div className="saas-modal__header">
          <div className="header-info">
            <h2 className="header-title">Payment Pending</h2>
            <p className="header-description">Anda memiliki {orders.length} tagihan yang memerlukan tindakan pembayaran.</p>
          </div>
          <button onClick={onClose} className="saas-close-btn" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="saas-modal__content">
          {orders.length === 0 ? (
            <div className="saas-empty">
              <div className="saas-empty-icon">
                <ShoppingBag size={40} strokeWidth={1.5} />
              </div>
              <h3>No Pending Invoices</h3>
              <p>Semua transaksi Anda telah berhasil diproses.</p>
            </div>
          ) : (
            <div className="saas-invoice-list">
              {orders.map((order) => (
                <div key={order.id} className="saas-invoice-card">
                  <div className="card-top">
                    <div className="status-badge">
                      <div className="pulse-dot"></div>
                      Waiting for Payment
                    </div>
                    <div className="invoice-date">
                      <Calendar size={14} />
                      {order.orderDate}
                    </div>
                  </div>

                  <div className="card-main">
                    <div className="product-details">
                      <span className="product-category">{order.type}</span>
                      <h4 className="product-title">{order.title}</h4>
                    </div>
                    <div className="price-tag">
                      <span className="price-label">Amount Due</span>
                      <span className="price-value">Rp {order.total}</span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <div className="payment-security">
                      <AlertCircle size={14} />
                      <span>Secure Checkout</span>
                    </div>
                    <button
                      className="saas-primary-btn"
                      onClick={() => onPaymentAction(order)}
                      disabled={isPaymentLoading}
                    >
                      {isPaymentLoading ? (
                        <div className="spinner-small"></div>
                      ) : (
                        <>
                          <span>Complete Payment</span>
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="saas-modal__footer">
          <p className="footer-notice">Butuh bantuan? <a href="#">Hubungi Support</a></p>
          <button onClick={onClose} className="saas-ghost-btn">Tutup</button>
        </div>
      </div>

      <style jsx>{`
        .saas-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 20px;
          animation: overlayFade 0.3s ease-out;
        }

        .saas-modal {
          width: 100%;
          max-width: 640px;
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalSlideUp 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .saas-modal__header {
          padding: 32px 32px 24px;
          background: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #f1f5f9;
        }

        .header-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin: 0;
        }

        .header-description {
          font-size: 0.9375rem;
          color: #64748b;
          margin: 8px 0 0;
          line-height: 1.5;
        }

        .saas-close-btn {
          background: #f8fafc;
          border: 1px solid #f1f5f9;
          color: #94a3b8;
          padding: 8px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .saas-close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
          transform: scale(1.05);
        }

        .saas-modal__content {
          padding: 24px 32px;
          background: #fcfdfe;
          max-height: 55vh;
          overflow-y: auto;
        }

        .saas-invoice-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .saas-invoice-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.3s ease;
          position: relative;
        }

        .saas-invoice-card:hover {
          border-color: #f1a124;
          box-shadow: 0 10px 30px -10px rgba(241, 161, 36, 0.15);
        }

        .card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          background: #fffbeb;
          color: #92400e;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 9999px;
          border: 1px solid #fef3c7;
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #f59e0b;
          border-radius: 50%;
          animation: dotPulse 1.5s infinite;
        }

        .invoice-date {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .card-main {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }

        .product-category {
          font-size: 0.75rem;
          font-weight: 600;
          color: #f1a124;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
          display: block;
        }

        .product-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
          max-width: 320px;
        }

        .price-tag {
          text-align: right;
        }

        .price-label {
          display: block;
          font-size: 0.75rem;
          color: #94a3b8;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .price-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: #0f172a;
        }

        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 20px;
          border-top: 1px dashed #e2e8f0;
        }

        .payment-security {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .saas-primary-btn {
          background: #0f172a;
          color: #ffffff;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .saas-primary-btn:hover:not(:disabled) {
          background: #334155;
          gap: 14px;
        }

        .saas-primary-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .saas-empty {
          padding: 60px 0;
          text-align: center;
        }

        .saas-empty-icon {
          color: #e2e8f0;
          margin-bottom: 20px;
        }

        .saas-empty h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 8px;
        }

        .saas-empty p {
          color: #94a3b8;
          font-size: 0.875rem;
        }

        .saas-modal__footer {
          padding: 24px 32px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
        }

        .footer-notice {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .footer-notice a {
          color: #f1a124;
          text-decoration: none;
          font-weight: 600;
        }

        .saas-ghost-btn {
          padding: 10px 24px;
          background: transparent;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .saas-ghost-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .spinner-small {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes overlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        @keyframes dotPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 640px) {
          .saas-modal-overlay {
            padding: 0;
            align-items: flex-end;
          }
          
          .saas-modal {
            border-radius: 24px 24px 0 0;
            max-height: 90vh;
          }

          .saas-modal__header, .saas-modal__content, .saas-modal__footer {
            padding-left: 20px;
            padding-right: 20px;
          }

          .card-main {
            flex-direction: column;
            align-items: flex-start;
          }

          .price-tag {
            text-align: left;
            margin-top: 16px;
          }

          .card-actions {
            flex-direction: column;
            gap: 16px;
          }

          .saas-primary-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
