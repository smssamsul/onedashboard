"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function InvitationFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { kode } = params;
  const ref = searchParams.get("ref") || "";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [invitationData, setInvitationData] = useState(null);

  const [formData, setFormData] = useState({
    nama: "",
    wa: "",
    email: "",
  });

  useEffect(() => {
    async function fetchProduct() {
      if (!kode) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await fetch(`/api/landing/${kode}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Produk tidak ditemukan");
        }

        setProduct(result.data);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error(error.message || "Gagal memuat data produk");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [kode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.wa.trim()) {
      toast.error("Nama dan nomor WhatsApp wajib diisi");
      return;
    }
    if (!product) {
      toast.error("Data produk tidak ditemukan");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nama: formData.nama.trim(),
        wa: formData.wa.trim(),
        email: formData.email.trim() || undefined,
        produk: product.id,
        ref: ref || undefined,
        sumber: "link",
      };

      const response = await fetch("/api/invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mendaftar undangan");
      }

      setInvitationData(result.data);
      setSubmitted(true);
      toast.success("Pendaftaran undangan berhasil!");
    } catch (error) {
      console.error("Error submit invitation:", error);
      toast.error(error.message || "Terjadi kesalahan saat mendaftar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Memuat data produk...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Produk tidak ditemukan</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.formWrapper}>
          <div style={styles.header}>
            <h1 style={styles.title}>Pendaftaran Berhasil 🎉</h1>
            <p style={styles.subtitle}>
              Terima kasih, {formData.nama}. Kamu terdaftar untuk <strong>{product.nama}</strong>.
            </p>
            {invitationData?.kode_invitation && (
              <p style={{ ...styles.subtitle, marginTop: 8 }}>
                Kode undangan: <strong>{invitationData.kode_invitation}</strong>
              </p>
            )}
            <p style={{ ...styles.subtitle, marginTop: 16 }}>
              Detail acara akan kami kirimkan lewat WhatsApp.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>Undangan {product.nama}</h1>
          <p style={styles.subtitle}>Isi data di bawah ini untuk mendaftar, gratis!</p>
        </div>

        {ref && (
          <div style={styles.referralBadge}>
            Kamu diundang oleh salah satu member kami ✨
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="field" style={styles.field}>
            <label style={styles.label}>
              Nama Lengkap <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Nomor WhatsApp <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="wa"
              value={formData.wa}
              onChange={handleChange}
              placeholder="6281234567890 (gunakan format 62)"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nama@email.com"
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitButton,
              ...(submitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {submitting ? "Memproses..." : "Daftar Sekarang"}
          </button>
        </form>
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
    maxWidth: "600px",
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
    fontSize: "28px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "16px",
    color: "#6b7280",
  },
  referralBadge: {
    textAlign: "center",
    backgroundColor: "#fef3c7",
    color: "#92400e",
    borderRadius: "8px",
    padding: "10px 16px",
    marginBottom: "24px",
    fontSize: "14px",
    fontWeight: "500",
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
  submitButton: {
    marginTop: "8px",
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
