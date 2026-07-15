"use client";

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="not-found-wrapper">
      <div className="not-found-box">
        <div className="not-found-icon">
          <span>🔍</span>
        </div>
        <h1>404</h1>
        <h2>Halaman Tidak Ditemukan</h2>
        <p>Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
        <Link href="/" className="not-found-button">
          Kembali ke Beranda
        </Link>
      </div>

      <style jsx>{`
        .not-found-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: 20px;
        }

        .not-found-box {
          text-align: center;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          padding: 60px 50px;
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 450px;
          animation: fade-in 0.5s ease;
        }

        @keyframes fade-in {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .not-found-icon {
          margin-bottom: 24px;
        }

        .not-found-icon span {
          font-size: 64px;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        h1 {
          font-size: 80px;
          font-weight: 800;
          background: linear-gradient(135deg, #f59e0b, #ef4444);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0;
          line-height: 1;
        }

        h2 {
          font-size: 22px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.95);
          margin: 16px 0 12px;
        }

        p {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0 0 32px;
          line-height: 1.6;
        }

        .not-found-button {
          display: inline-block;
          padding: 14px 32px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          text-decoration: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
        }

        .not-found-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
        }
      `}</style>
    </div>
  );
}
