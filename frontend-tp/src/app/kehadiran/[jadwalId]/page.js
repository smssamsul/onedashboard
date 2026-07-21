"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

const STEP_INPUT_WA = "input_wa";
const STEP_CONFIRM = "confirm";
const STEP_FORM_BARU = "form_baru";
const STEP_DONE = "done";

export default function KehadiranCheckinPage() {
  const params = useParams();
  const { jadwalId } = params;

  const [jadwal, setJadwal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(STEP_INPUT_WA);

  const [wa, setWa] = useState("");
  const [lookupData, setLookupData] = useState(null);
  const [namaBaru, setNamaBaru] = useState("");
  const [emailBaru, setEmailBaru] = useState("");

  useEffect(() => {
    async function fetchJadwal() {
      if (!jadwalId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`/api/public-jadwal/${jadwalId}`);
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Jadwal tidak ditemukan");
        }
        setJadwal(result.data);
      } catch (error) {
        console.error("Error fetching jadwal:", error);
        toast.error(error.message || "Gagal memuat data jadwal");
      } finally {
        setLoading(false);
      }
    }
    fetchJadwal();
  }, [jadwalId]);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!wa.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/kehadiran/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jadwal_id: jadwalId, wa: wa.trim() }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengecek nomor WhatsApp");
      }

      if (result.found) {
        setLookupData(result.data);
        setStep(STEP_CONFIRM);
      } else {
        setStep(STEP_FORM_BARU);
      }
    } catch (error) {
      console.error("Error lookup:", error);
      toast.error(error.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  const submitCheckin = async (extra = {}) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/kehadiran/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jadwal_id: jadwalId, wa: wa.trim(), ...extra }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal check-in");
      }
      setStep(STEP_DONE);
      toast.success("Check-in berhasil!");
    } catch (error) {
      console.error("Error checkin:", error);
      toast.error(error.message || "Terjadi kesalahan saat check-in");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCheckin = () => submitCheckin();

  const handleSubmitFormBaru = (e) => {
    e.preventDefault();
    if (!namaBaru.trim()) {
      toast.error("Nama wajib diisi");
      return;
    }
    submitCheckin({ nama: namaBaru.trim(), email: emailBaru.trim() || undefined });
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

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>{jadwal.produk?.nama || jadwal.nama_jadwal}</h1>
          <p style={styles.subtitle}>{jadwal.nama_jadwal}</p>
          {jadwal.waktu_mulai && (
            <p style={styles.subtitle}>
              {new Date(jadwal.waktu_mulai).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}
            </p>
          )}
        </div>

        {step === STEP_INPUT_WA && (
          <form onSubmit={handleLookup} style={styles.form}>
            <div style={styles.field}>
              <label style={styles.label}>Masukkan Nomor WhatsApp Kamu</label>
              <input
                type="text"
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                placeholder="6281234567890"
                style={styles.input}
                required
              />
            </div>
            <button type="submit" disabled={submitting} style={{ ...styles.submitButton, ...(submitting ? styles.submitButtonDisabled : {}) }}>
              {submitting ? "Mengecek..." : "Lanjutkan"}
            </button>
          </form>
        )}

        {step === STEP_CONFIRM && lookupData && (
          <div style={styles.form}>
            {lookupData.sudah_checkin ? (
              <div style={styles.infoBox}>
                Halo <strong>{lookupData.nama}</strong>, kamu sudah tercatat hadir sebelumnya. Sampai jumpa di acara!
              </div>
            ) : (
              <>
                <div style={styles.infoBox}>
                  Halo <strong>{lookupData.nama}</strong>, konfirmasi kehadiran kamu di acara ini?
                </div>
                <button
                  onClick={handleConfirmCheckin}
                  disabled={submitting}
                  style={{ ...styles.submitButton, ...(submitting ? styles.submitButtonDisabled : {}) }}
                >
                  {submitting ? "Memproses..." : "Ya, Saya Hadir"}
                </button>
              </>
            )}
          </div>
        )}

        {step === STEP_FORM_BARU && (
          <form onSubmit={handleSubmitFormBaru} style={styles.form}>
            <div style={styles.infoBox}>
              Nomor belum terdaftar. Isi data singkat untuk check-in.
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Nama Lengkap <span style={styles.required}>*</span></label>
              <input
                type="text"
                value={namaBaru}
                onChange={(e) => setNamaBaru(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                type="email"
                value={emailBaru}
                onChange={(e) => setEmailBaru(e.target.value)}
                style={styles.input}
              />
            </div>
            <button type="submit" disabled={submitting} style={{ ...styles.submitButton, ...(submitting ? styles.submitButtonDisabled : {}) }}>
              {submitting ? "Memproses..." : "Check-in Sekarang"}
            </button>
          </form>
        )}

        {step === STEP_DONE && (
          <div style={styles.infoBox}>
            Check-in berhasil! Selamat mengikuti acara 🎉
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
    padding: "20px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  loading: {
    textAlign: "center",
    padding: "40px",
    fontSize: "18px",
    color: "#666",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    fontSize: "18px",
    color: "#dc2626",
  },
  formWrapper: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "32px",
    marginTop: "40px",
  },
  header: {
    textAlign: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#6b7280",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    color: "#dc2626",
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
  },
  infoBox: {
    backgroundColor: "#f0fdf4",
    color: "#166534",
    borderRadius: "8px",
    padding: "14px 16px",
    fontSize: "14px",
    textAlign: "center",
  },
  submitButton: {
    padding: "14px",
    backgroundColor: "#f97316",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  submitButtonDisabled: {
    backgroundColor: "#fdba74",
    cursor: "not-allowed",
  },
};
