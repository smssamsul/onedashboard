"use client";

import { useState } from "react";
import "@/styles/sales/admin.css";

export default function EmailSyncWarningModal({ userId, oldEmail, newEmail, onClose }) {
  const [copied, setCopied] = useState(false);

  const sqlQuery = `UPDATE auth_table SET email = '${newEmail}' WHERE user_id = ${userId};`;

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
        <div className="modal-header">
          <h2>⚠️ Email Sync Warning</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ marginBottom: "0.75rem", color: "#374151", lineHeight: "1.6" }}>
              Email user berhasil diubah dari <strong>{oldEmail}</strong> ke <strong>{newEmail}</strong>.
            </p>
            <div
              style={{
                backgroundColor: "#FEF3C7",
                border: "1px solid #F59E0B",
                borderRadius: "6px",
                padding: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <p style={{ margin: 0, color: "#92400E", fontSize: "0.875rem", lineHeight: "1.5" }}>
                <strong>⚠️ Masalah:</strong> User tidak bisa login dengan email baru karena backend belum sync email di tabel authentication/login.
              </p>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: "600", marginBottom: "0.5rem", color: "#111827" }}>
              Solusi untuk Admin:
            </h3>
            <ol style={{ paddingLeft: "1.25rem", margin: 0, color: "#374151", lineHeight: "1.8" }}>
              <li style={{ marginBottom: "0.5rem" }}>
                Minta backend developer untuk update endpoint <code style={{ fontSize: "0.8rem", backgroundColor: "#F3F4F6", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>PUT /api/sales/users/{`{id}`}</code> agar sync email di kedua tabel.
              </li>
              <li style={{ marginBottom: "0.5rem" }}>
                Atau jalankan SQL manual di database:
                <div
                  style={{
                    backgroundColor: "#1F2937",
                    color: "#F9FAFB",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    marginTop: "0.5rem",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                    position: "relative",
                  }}
                >
                  <code style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {sqlQuery}
                  </code>
                  <button
                    onClick={handleCopySQL}
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      backgroundColor: "#3B82F6",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.25rem 0.5rem",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </li>
              <li>
                Setelah itu, user bisa login dengan email baru: <strong>{newEmail}</strong>
              </li>
            </ol>
          </div>

          <div
            style={{
              backgroundColor: "#EFF6FF",
              border: "1px solid #3B82F6",
              borderRadius: "6px",
              padding: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <p style={{ margin: 0, color: "#1E40AF", fontSize: "0.875rem", lineHeight: "1.5" }}>
              <strong>Note:</strong> Sementara backend belum di-fix, user harus login dengan email lama: <strong>{oldEmail}</strong>
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
