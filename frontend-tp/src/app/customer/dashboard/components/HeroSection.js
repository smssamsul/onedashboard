"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Info, ShieldCheck, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { toast } from "react-hot-toast";
import { getCustomerSession } from "@/lib/customerAuth";
import CryptoJS from "crypto-js";

export default function HeroSection({ customerInfo, isLoading, isVerified }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  const [verityLoading, setVerifyLoading] = useState(false);
  const isSubmitting = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const handleCopyId = () => {
    if (customerInfo?.id) {
      navigator.clipboard.writeText(String(customerInfo.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (verityLoading || isSubmitting.current) return;

    isSubmitting.current = true;
    setVerifyLoading(true);

    try {
      const session = getCustomerSession();
      if (!session || !session.user) {
        toast.error("Sesi tidak valid. Silakan login kembali.");
        router.push("/customer");
        return;
      }

      const customer = session.user;
      const secret = process.env.NEXT_PUBLIC_OTP_SECRET_KEY;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const hash = CryptoJS.HmacSHA256(timestamp, secret).toString(CryptoJS.enc.Hex);

      const payload = {
        customer_id: customer.id,
        wa: customer.wa
      };

      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Timestamp": timestamp,
          "X-API-Hash": hash
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        toast.success("OTP berhasil dikirim ke WhatsApp!");
        router.push('/customer/otp');
      } else {
        toast.error(data.message || "Gagal mengirim OTP.");
      }
    } catch (error) {
      console.error("OTP Error:", error);
      toast.error("Terjadi kesalahan saat mengirim OTP.");
    } finally {
      isSubmitting.current = false;
      setVerifyLoading(false);
    }
  };

  if (isLoading) {
    return (
      <header className="customer-dashboard__hero">
        <div className="hero-content">
          <div className="hero-text">
            <div className="skeleton-loader" style={{ width: '150px', height: '20px', marginBottom: '1rem' }} />
            <div className="skeleton-loader" style={{ width: '300px', height: '40px', marginBottom: '1rem' }} />
            <div className="skeleton-loader" style={{ width: '100%', height: '60px' }} />
          </div>
          <div className="hero-member-card skeleton-loader" style={{ width: '100%', height: '240px', borderRadius: '16px' }} />
        </div>
      </header>
    );
  }

  // Get data safely
  const displayName = customerInfo?.nama_panggilan || customerInfo?.nama || "Member";
  const memberId = customerInfo?.memberID || (customerInfo?.id ? String(customerInfo.id).padStart(6, '0') : "000000");
  const membershipType = customerInfo?.keanggotaan || "BASIC";

  // Hanya tampilkan member card untuk keanggotaan platinum, gold, silver, bronze
  const validMembershipTiers = ["platinum", "gold", "silver", "bronze"];
  const showMemberCard = validMembershipTiers.includes(membershipType?.toLowerCase());



  // QR Data
  const qrData = `${origin}/member/${customerInfo?.id}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&bgcolor=FFFFFF&color=000000&margin=0`;

  return (
    <header className="customer-dashboard__hero">
      <div className={`hero-content${showMemberCard ? ' has-card' : ''}`}>

        {/* LEFT COLUMN: TEXT */}
        <div className="hero-text">
          <p className="hero-eyebrow">Dashboard Member</p>
          <h1 className="hero-title">
            Halo, <span className="hero-name-highlight">{displayName}</span>
          </h1>
          <p className="hero-subtitle">
            {showMemberCard
              ? "Selamat datang kembali! Berikut adalah kartu keanggotaan digital Anda."
              : "Selamat datang kembali! Pantau aktivitas dan pesanan Anda di sini."}
          </p>

          {/* Account Status Refactored */}
          {!isLoading && isVerified !== undefined && (
            <div className={`hero-status-pill ${isVerified ? 'verified' : 'unverified'}`}>
              <div className="status-label">STATUS AKUN</div>
              <div className="status-value-group">
                {isVerified ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <span className="status-value">{isVerified ? "TERVERIFIKASI" : "BELUM VERIFIKASI"}</span>
                {!isVerified && (
                  <button
                    className="hero-verify-btn"
                    onClick={handleVerify}
                    disabled={verityLoading}
                  >
                    {verityLoading ? "..." : "Verifikasi Sekarang"}
                  </button>
                )}
              </div>
            </div>
          )}


        </div>

        {/* RIGHT COLUMN: MEMBER CARD — hanya tampil untuk tier platinum/gold/silver/bronze */}
        {showMemberCard && (
          <div className="hero-card-wrapper">
            <div className="ternak-card">

              {/* Background Illustration (Housing Rows) */}
              <div className="ternak-card__bg">
                {/* Simple CSS shape skyline mimicking property rows */}
                <svg className="skyline-svg" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <path d="M0,200 L0,150 L30,120 L60,150 L60,140 L90,110 L120,140 L120,100 L160,140 L200,100 L240,140 L240,120 L270,90 L300,120 L330,90 L360,120 L400,80 L400,200 Z" fill="#2d2d2d" opacity="0.3" />
                  <path d="M20,200 L20,170 L50,140 L80,170 L110,140 L140,170 L170,140 L200,170 L230,140 L260,170 L290,140 L320,170 L350,140 L380,170 L400,150 L400,200 Z" fill="#383838" opacity="0.4" />
                </svg>
              </div>

              {/* TOP ROW */}
              <div className="ternak-card__top">
                <div className="ternak-card__brand">
                  <h2 className="brand-title">TERNAK PROPERTI</h2>
                  <span className="brand-subtitle">MEMBERSHIP</span>
                </div>

                <div className="ternak-card__qr">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="Member QR" className="qr-image" />
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="ternak-card__bottom">
                <div className="ternak-card__info-left">
                  <div className="info-group">
                    <label>MEMBER ID</label>
                    <div className="value-row">
                      <span className="id-text">{memberId}</span>
                      <button onClick={handleCopyId} className="copy-icon-btn">
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <div className="info-group mt-2">
                    <label>CARDHOLDER</label>
                    <div className="holder-name">{customerInfo?.nama || displayName}</div>
                  </div>
                </div>

                <div className="ternak-card__info-right">
                  <label className="align-right">MEMBER</label>
                  <div className="membership-badge">
                    {membershipType}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .customer-dashboard__hero {
          margin-bottom: 2rem;
          width: 100%;
        }
        
        .hero-content {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        @media (min-width: 900px) {
          .hero-content.has-card {
            display: grid;
            grid-template-columns: 1fr 400px;
            gap: 4rem;
            align-items: flex-start;
          }
        }

        .hero-text {
          padding-top: 0;
          display: flex;
          flex-direction: column;
        }

        .hero-eyebrow {
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          margin-bottom: 0.75rem;
          font-weight: 700;
        }

        .hero-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 1rem;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .hero-name-highlight {
          color: #f59e0b; /* Gold/Orange */
        }

        .hero-subtitle {
          color: #64748b;
          font-size: 1.125rem;
          line-height: 1.6;
          max-width: 90%;
          margin-bottom: 1.5rem;
        }
        
        /* New Status Pill Style */
        .hero-status-pill {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 8px 0;
        }
        .status-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: #94a3b8;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .status-value-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .status-value {
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .verified .status-value { color: #10b981; }
        .verified :global(svg) { color: #10b981; }
        
        .unverified .status-value { color: #ef4444; }
        .unverified :global(svg) { color: #ef4444; }
        
        .hero-verify-btn {
          margin-left: 12px;
          background: #ef4444;
          color: white;
          border: none;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .hero-verify-btn:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }



        /* --- TERNAK CARD DESIGN --- */
        .hero-card-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        .ternak-card {
          width: 100%;
          max-width: 400px;
          aspect-ratio: 1.586; /* Credit Card Ratio */
          background: #111;
          border-radius: 20px;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5);
          color: #fff;
          border: 1px solid #333;
        }

        /* Background Illustration */
        .ternak-card__bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          background: linear-gradient(135deg, #1a1a1a 0%, #000 100%);
        }

        .skyline-svg {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }

        /* Top Section */
        .ternak-card__top {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .brand-title {
          font-family: sans-serif; 
          font-weight: 800;
          font-size: 1.5rem;
          line-height: 1;
          margin: 0;
          background: linear-gradient(45deg, #fff, #fbbf24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .brand-subtitle {
          font-size: 0.75rem;
          letter-spacing: 0.3em;
          color: #fbbf24; /* Amber-400 */
          text-transform: uppercase;
          font-weight: 600;
          display: block;
          margin-top: 4px;
        }

        .ternak-card__qr {
          background: #fff;
          padding: 4px;
          border-radius: 8px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-image {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Bottom Section */
        .ternak-card__bottom {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: auto;
        }

        .info-group label {
          font-size: 0.6rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
          display: block;
          margin-bottom: 2px;
        }

        .value-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .id-text {
          font-family: 'Courier New', monospace;
          font-size: 1rem;
          color: #fbbf24;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .copy-icon-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 0;
        }
        .copy-icon-btn:hover { color: #fbbf24; }

        .holder-name {
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          line-height: 1.2;
          max-width: 180px;
          color: #fff;
          word-wrap: break-word;
        }
        
        .mt-2 { margin-top: 0.75rem; }

        .ternak-card__info-right {
          text-align: right;
        }

        .align-right {
          text-align: right;
        }

        .membership-badge {
          font-size: 1.25rem;
          font-weight: 900;
          color: #fbbf24;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-shadow: 0 2px 4px rgba(0,0,0,0.5);
          font-style: italic;
        }
        
        .skeleton-loader {
            background: #e2e8f0;
            border-radius: 8px;
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
        }
      `}</style>
    </header>
  );
}
