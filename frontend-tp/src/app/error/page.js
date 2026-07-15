"use client";
import Link from "next/link";
import "@/styles/error400.css";

export default function Error({ error, reset }) {
  return (
    <div className="error400-container">
      <div className="error400-box">
        <h1 className="error400-title">400</h1>
        <p className="error400-subtitle">Terjadi Kesalahan Permintaan</p>
        <p className="error400-desc">
          {error?.message || "Permintaan tidak dapat diproses. Pastikan data yang dikirim benar."}
        </p>
        <Link href="/" className="error400-btn">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
