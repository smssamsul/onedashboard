"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";

const POLL_INTERVAL_MS = 5000;

export default function KehadiranDisplayPage() {
  const params = useParams();
  const { jadwalId } = params;

  const [jadwal, setJadwal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendees, setAttendees] = useState([]);
  const [total, setTotal] = useState(0);
  const [checkinLink, setCheckinLink] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCheckinLink(`${window.location.origin}/kehadiran/${jadwalId}`);
    }
  }, [jadwalId]);

  useEffect(() => {
    async function fetchJadwal() {
      if (!jadwalId) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/public-jadwal/${jadwalId}`);
        const result = await response.json();
        if (response.ok && result.success) {
          setJadwal(result.data);
        }
      } catch (error) {
        console.error("Error fetching jadwal:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchJadwal();
  }, [jadwalId]);

  const fetchAttendees = useCallback(async () => {
    if (!jadwalId) return;
    try {
      const response = await fetch(`/api/public-jadwal/${jadwalId}/kehadiran`);
      const result = await response.json();
      if (response.ok && result.success) {
        setAttendees(result.data || []);
        setTotal(result.total || 0);
      }
    } catch (error) {
      console.error("Error fetching attendees:", error);
    }
  }, [jadwalId]);

  useEffect(() => {
    fetchAttendees();
    const interval = setInterval(fetchAttendees, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchAttendees]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Memuat data event...</div>
      </div>
    );
  }

  if (!jadwal) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Jadwal tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>{jadwal.produk?.nama || jadwal.nama_jadwal}</h1>
        <p style={styles.subtitle}>{jadwal.nama_jadwal}</p>
        {jadwal.waktu_mulai && (
          <p style={styles.subtitle}>
            {new Date(jadwal.waktu_mulai).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}
          </p>
        )}
      </div>

      <div style={styles.mainGrid}>
        <div style={styles.qrPanel}>
          <div style={styles.qrFrame}>
            {checkinLink && <QRCodeCanvas value={checkinLink} size={320} level="M" includeMargin={false} />}
          </div>
          <p style={styles.qrCaption}>Scan untuk konfirmasi kehadiran</p>
        </div>

        <div style={styles.listPanel}>
          <div style={styles.listHeader}>
            <span>Sudah Hadir</span>
            <span style={styles.counter}>{total}</span>
          </div>
          <div style={styles.listBody}>
            {attendees.length === 0 ? (
              <p style={styles.emptyText}>Belum ada yang check-in</p>
            ) : (
              attendees.map((a, idx) => (
                <div key={`${a.nama}-${idx}`} style={styles.listItem}>
                  <span style={styles.listName}>{a.nama}</span>
                  <span style={styles.listTime}>
                    {a.waktu_checkin ? new Date(a.waktu_checkin).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    padding: "40px",
    display: "flex",
    flexDirection: "column",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "24px",
    color: "#cbd5e1",
    margin: "auto",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    fontSize: "24px",
    color: "#f87171",
    margin: "auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "40px",
  },
  title: {
    fontSize: "42px",
    fontWeight: "800",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "20px",
    color: "#94a3b8",
    margin: "4px 0 0",
  },
  mainGrid: {
    flex: 1,
    display: "flex",
    gap: "40px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  qrPanel: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  qrFrame: {
    padding: "24px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
  },
  qrCaption: {
    fontSize: "20px",
    color: "#cbd5e1",
    fontWeight: "600",
  },
  listPanel: {
    width: "480px",
    maxWidth: "100%",
    backgroundColor: "#1e293b",
    borderRadius: "20px",
    padding: "24px",
    maxHeight: "600px",
    display: "flex",
    flexDirection: "column",
  },
  listHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "16px",
    paddingBottom: "16px",
    borderBottom: "1px solid #334155",
  },
  counter: {
    fontSize: "32px",
    fontWeight: "800",
    color: "#4ade80",
  },
  listBody: {
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  emptyText: {
    textAlign: "center",
    color: "#64748b",
    fontSize: "16px",
    padding: "24px 0",
  },
  listItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    backgroundColor: "#334155",
    borderRadius: "10px",
    fontSize: "16px",
  },
  listName: {
    fontWeight: "600",
  },
  listTime: {
    color: "#94a3b8",
    fontSize: "14px",
  },
};
