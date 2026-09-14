"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import QrScanner from "@/components/QrScanner";
import { getKehadiran, scanQrCheckin } from "@/lib/sales/kehadiran";

const POLL_INTERVAL_MS = 5000;

/**
 * Versi "layar penuh" halaman Kehadiran staff - dipakai buat ditampilkan di
 * TV/monitor lokasi acara sambil staff scan tiket peserta. Sengaja tanpa
 * Layout/sidebar (mirip /kehadiran/{jadwalId}/display yang publik), tapi
 * versi ini terautentikasi dan panel QR statis diganti kamera scan aktif.
 */
export default function StaffKehadiranDisplayPage() {
  const params = useParams();
  const router = useRouter();
  const { jadwalId } = params;

  const [jadwal, setJadwal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [kehadiran, setKehadiran] = useState([]);
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

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

  const fetchKehadiran = useCallback(async () => {
    if (!jadwal?.produk_id) return;
    const data = await getKehadiran(jadwal.produk_id);
    setKehadiran(Array.isArray(data) ? data : []);
    // Dicatat tiap kali polling jalan (bukan cuma pas berhasil) - biar kelihatan
    // kalau loop-nya masih hidup walau misal 0 hasil (auth kadaluarsa dsb).
    setLastUpdated(new Date());
  }, [jadwal]);

  useEffect(() => {
    if (!jadwal) return;
    fetchKehadiran();
    const interval = setInterval(fetchKehadiran, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [jadwal, fetchKehadiran]);

  // Cuma peserta sesi ini - dicocokkan lewat tanggal_jadwal (snapshot), sama
  // seperti halaman kehadiran staff biasa. Dibandingkan lewat Date (bukan
  // string ===) karena beberapa endpoint balikin format tanggal berbeda
  // (ISO vs "Y-m-d H:i:s" polos) walau instant-nya sama.
  const attendees = useMemo(() => {
    if (!jadwal?.waktu_mulai) return [];
    const targetTime = new Date(jadwal.waktu_mulai).getTime();
    return kehadiran
      .filter(
        (row) =>
          String(row.jadwal_id) === String(jadwalId) &&
          row.tanggal_jadwal &&
          new Date(row.tanggal_jadwal).getTime() === targetTime
      )
      .sort((a, b) => new Date(b.waktu_checkin) - new Date(a.waktu_checkin));
  }, [kehadiran, jadwalId, jadwal]);

  const handleScan = async (qrToken) => {
    setScanning(true);
    try {
      const res = await scanQrCheckin(jadwalId, qrToken);
      if (res.already_checked_in) {
        setScanResult({ type: "warning", message: "Sudah check-in sebelumnya", data: res.data });
      } else {
        setScanResult({ type: "success", message: "Berhasil check-in", data: res.data });
      }
      fetchKehadiran();
    } catch (err) {
      setScanResult({ type: "error", message: err.message || "QR tidak valid" });
    } finally {
      setScanning(false);
    }
  };

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

  const feedbackStyle =
    scanResult?.type === "success"
      ? styles.feedbackSuccess
      : scanResult?.type === "warning"
      ? styles.feedbackWarning
      : styles.feedbackError;

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
            <QrScanner active onScan={handleScan} />
          </div>
          <p style={styles.qrCaption}>
            {scanning ? "Memproses scan..." : "Arahkan kamera ke QR tiket peserta"}
          </p>
          {scanResult && (
            <div style={{ ...styles.feedback, ...feedbackStyle }}>
              <div style={styles.feedbackMessage}>
                {scanResult.type === "success" && <CheckCircle2 size={20} />}
                {scanResult.type === "warning" && <AlertTriangle size={20} />}
                {scanResult.type === "error" && <XCircle size={20} />}
                {scanResult.message}
              </div>
              {scanResult.data && (
                <div style={styles.feedbackDetail}>
                  {scanResult.data.nama} — {scanResult.data.produk}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={styles.listPanel}>
          <div style={styles.listHeader}>
            <span>Sudah Hadir</span>
            <span style={styles.counter}>{attendees.length}</span>
          </div>
          <div style={styles.refreshRow}>
            <span>
              {lastUpdated
                ? `Update terakhir: ${lastUpdated.toLocaleTimeString("id-ID")}`
                : "Memuat..."}
            </span>
            <button type="button" onClick={fetchKehadiran} style={styles.refreshButton}>
              Muat Ulang
            </button>
          </div>
          <div style={styles.listBody}>
            {attendees.length === 0 ? (
              <p style={styles.emptyText}>Belum ada yang check-in</p>
            ) : (
              attendees.map((a) => (
                <div key={a.id} style={styles.listItem}>
                  <span style={styles.listName}>{a.customer_rel?.nama || "Peserta"}</span>
                  <span style={styles.listTime}>
                    {a.waktu_checkin
                      ? new Date(a.waktu_checkin).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                      : ""}
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
    width: "380px",
    maxWidth: "100%",
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
    textAlign: "center",
  },
  feedback: {
    width: "100%",
    borderRadius: "14px",
    padding: "14px 18px",
    boxSizing: "border-box",
  },
  feedbackMessage: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontWeight: "700",
    fontSize: "18px",
  },
  feedbackDetail: {
    marginTop: "6px",
    fontSize: "15px",
    opacity: 0.9,
  },
  feedbackSuccess: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    border: "1px solid rgba(74, 222, 128, 0.4)",
    color: "#4ade80",
  },
  feedbackWarning: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    border: "1px solid rgba(251, 191, 36, 0.4)",
    color: "#fbbf24",
  },
  feedbackError: {
    backgroundColor: "rgba(248, 113, 113, 0.15)",
    border: "1px solid rgba(248, 113, 113, 0.4)",
    color: "#f87171",
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
    marginBottom: "8px",
    paddingBottom: "16px",
    borderBottom: "1px solid #334155",
  },
  refreshRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "16px",
  },
  refreshButton: {
    padding: "4px 10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "transparent",
    color: "#cbd5e1",
    cursor: "pointer",
    fontSize: "12px",
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
