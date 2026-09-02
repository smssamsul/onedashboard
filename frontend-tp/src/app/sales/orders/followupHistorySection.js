"use client";
import { useState, useEffect, useCallback } from "react";

const STATUS_TEXT = { "1": "Berhasil", "0": "Gagal" };

/**
 * Riwayat follow-up WhatsApp untuk satu order, dengan tombol "Kirim Ulang"
 * untuk yang gagal. Dipasang di dalam modal Detail Pesanan (viewOrders.js).
 */
export default function FollowupHistorySection({ orderId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resendingId, setResendingId] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/order/${orderId}/logs-follup`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (json.success) {
        setLogs(json.data?.logs || []);
      } else {
        setError(json.message || "Gagal memuat riwayat follow-up");
      }
    } catch (e) {
      setError("Terjadi kesalahan saat memuat riwayat follow-up");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResend = async (logId) => {
    setResendingId(logId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/sales/logs-follup/${logId}/resend`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      alert(json.message || (json.success ? "Follow-up berhasil dikirim ulang" : "Gagal mengirim ulang follow-up"));
      fetchLogs();
    } catch (e) {
      alert("Terjadi kesalahan saat mengirim ulang follow-up");
    } finally {
      setResendingId(null);
    }
  };

  if (!orderId) return null;

  return (
    <div>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "1rem", fontWeight: 600, color: "#111827" }}>
        Riwayat Follow-up
      </h3>

      {loading ? (
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Memuat riwayat follow-up...</p>
      ) : error ? (
        <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
      ) : logs.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Belum ada follow-up untuk order ini.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {logs.map((log) => {
            const statusKey = String(log.status);
            const isFailed = statusKey === "0";
            const isSuccess = statusKey === "1";
            const canResend = isFailed && !!log.follup;

            return (
              <div
                key={log.id}
                style={{
                  padding: "0.75rem 1rem",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "#111827" }}>
                    {log.follup_rel?.nama || `Follow Up (type ${log.type})`}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.15rem" }}>
                    {log.create_at
                      ? new Date(log.create_at).toLocaleString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-"}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      padding: "0.2rem 0.6rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      background: isSuccess ? "#d1fae5" : isFailed ? "#fee2e2" : "#f3f4f6",
                      color: isSuccess ? "#065f46" : isFailed ? "#991b1b" : "#6b7280",
                    }}
                  >
                    {STATUS_TEXT[statusKey] || "Tidak diketahui"}
                  </span>

                  {canResend && (
                    <button
                      type="button"
                      onClick={() => handleResend(log.id)}
                      disabled={resendingId === log.id}
                      style={{
                        padding: "0.35rem 0.75rem",
                        background: resendingId === log.id ? "#fca5a5" : "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "6px",
                        cursor: resendingId === log.id ? "not-allowed" : "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {resendingId === log.id ? "Mengirim..." : "Kirim Ulang"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
