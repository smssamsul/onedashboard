"use client";

import React, { useState, useEffect } from 'react';

export default function SupportWidget({ customerInfo }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    nama: "",
    wa: ""
  });

  // Target WhatsApp Number (Support Central)
  const SUPPORT_WA = "6281234567890"; // Ganti dengan nomor CS Anda

  useEffect(() => {
    if (customerInfo) {
      setFormData({
        nama: customerInfo.nama || customerInfo.nama_lengkap || customerInfo.name || "",
        wa: customerInfo.wa || ""
      });
    }
  }, [customerInfo]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const text = `Halo Admin, Saya butuh bantuan.\n\n` +
      `*Nama:* ${formData.nama}\n` +
      `*No. Telp:* ${formData.wa}\n` +
      `*Pesan:* ${message}`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${SUPPORT_WA}?text=${encoded}`, "_blank");
    setIsOpen(false);
    setMessage("");
  };

  return (
    <div className="support-widget-root">
      {/* Floating Action Button (FAB) */}
      {!isOpen && (
        <button
          className="support-fab-new"
          onClick={() => setIsOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="fab-label">Butuh Bantuan?</span>
        </button>
      )}

      {/* Support Popover */}
      {isOpen && (
        <div className="support-box">
          <div className="support-box-header">
            <div className="header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
            </div>
            <div className="header-titles">
              <h3>Customer Support</h3>
              <span>Kami siap membantu Anda</span>
            </div>
            <button className="btn-close" onClick={() => setIsOpen(false)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <form className="support-box-body" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Nama Anda</label>
              <input type="text" value={formData.nama} readOnly className="input-readonly" />
            </div>

            <div className="input-group">
              <label>No. WhatsApp</label>
              <input type="text" value={formData.wa} readOnly className="input-readonly" />
            </div>

            <div className="input-group">
              <label>Isi Pesan Bantuan</label>
              <textarea
                placeholder="Tuliskan kendala Anda di sini..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-send-wa">
              <span>Kirim Pesan</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </form>
          <div className="support-box-footer">Respon rata-rata &lt; 15 menit</div>
        </div>
      )}

      <style jsx global>{`
        .support-widget-root {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 999999;
          font-family: 'Inter', sans-serif;
          pointer-events: auto;
        }

        .support-fab-new {
          background: #f1a124;
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 50px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(241, 161, 36, 0.4);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .support-fab-new:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(241, 161, 36, 0.5);
          background: #e8911a;
        }

        .fab-label {
          font-weight: 700;
          font-size: 15px;
          white-space: nowrap;
        }

        .support-box {
          width: 320px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.2);
          border: 1px solid #f1f5f9;
          overflow: hidden;
          animation: supportPopIn 0.3s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .support-box-header {
          background: #0f172a;
          color: white;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
        }

        .header-icon {
          background: rgba(241, 161, 36, 0.2);
          color: #f1a124;
          padding: 8px;
          border-radius: 10px;
        }

        .header-titles h3 { margin: 0; font-size: 15px; font-weight: 700; }
        .header-titles span { font-size: 12px; opacity: 0.7; }

        .btn-close {
          position: absolute;
          right: 15px;
          top: 15px;
          background: transparent;
          border: none;
          color: white;
          opacity: 0.5;
          cursor: pointer;
        }

        .support-box-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; }

        .input-readonly {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
          border-radius: 10px;
          color: #1e293b;
          font-weight: 600;
          font-size: 14px;
        }

        textarea {
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          height: 100px;
          font-family: inherit;
          font-size: 14px;
          resize: none;
        }

        textarea:focus {
          outline: none;
          border-color: #f1a124;
          background: #fffcf5;
        }

        .btn-send-wa {
          background: #0f172a;
          color: white;
          border: none;
          padding: 16px;
          border-radius: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-send-wa:hover {
          background: #1e293b;
          transform: translateY(-2px);
        }

        .support-box-footer {
          padding: 12px;
          text-align: center;
          font-size: 11px;
          color: #94a3b8;
          border-top: 1px solid #f1f5f9;
          background: #fafafa;
        }

        @keyframes supportPopIn {
          from { opacity: 0; transform: scale(0.95) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        @media (max-width: 640px) {
          .support-widget-root { right: 20px; bottom: 20px; }
          .support-box { width: calc(100vw - 40px); }
        }
      `}</style>
    </div>
  );
}
