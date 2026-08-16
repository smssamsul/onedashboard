"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-hot-toast";

/**
 * Halaman pembayaran selalu di app.ternakproperti.com (sama seperti alur checkout lain).
 * Di localhost tetap relatif supaya alur bisa dites tanpa lompat ke produksi.
 */
const PAYMENT_ORIGIN = "https://app.ternakproperti.com";

function buildPaymentUrl(query) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const isLocal = host === "localhost" || host === "127.0.0.1";
  return `${isLocal ? "" : PAYMENT_ORIGIN}/payment?${query}`;
}

function getBundlingList(productData) {
  if (!productData) return [];
  if (Array.isArray(productData.bundling_rel)) return productData.bundling_rel;
  if (productData.bundling) {
    if (typeof productData.bundling === "string") {
      try {
        const parsed = JSON.parse(productData.bundling);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    if (Array.isArray(productData.bundling)) return productData.bundling;
  }
  return [];
}

function formatRupiah(value) {
  const n = Number(value || 0);
  return "Rp " + n.toLocaleString("id-ID");
}

export default function CheckoutWorkshopPage() {
  const params = useParams();
  const { kode_produk } = params;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedBundling, setSelectedBundling] = useState(null);
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      if (!kode_produk) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const res = await fetch(`/api/landing/${kode_produk}`);
        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.message || "Produk tidak ditemukan");
        }

        const productData = result.data || result;
        setProduct(productData);

        const list = getBundlingList(productData);
        if (list.length === 1) setSelectedBundling(0);
      } catch (error) {
        console.error("Error fetching product:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [kode_produk]);

  const bundlingList = getBundlingList(product);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!nama || nama.trim().length < 3) {
      toast.error("Nama harus diisi (minimal 3 karakter)");
      return;
    }
    const digits = wa.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Nomor WhatsApp tidak valid (minimal 10 digit)");
      return;
    }
    if (bundlingList.length > 0 && selectedBundling === null) {
      toast.error("Silakan pilih paket terlebih dahulu");
      return;
    }

    setSubmitting(true);
    try {
      const selectedItem = bundlingList[selectedBundling];
      const bundlingId = selectedItem ? selectedItem.id : "";
      const harga = selectedItem ? selectedItem.harga : product.harga_asli || product.harga || "0";

      const payload = {
        nama: nama.trim(),
        wa: wa.trim(),
        produk: parseInt(product.id, 10),
        harga: String(harga),
        ongkir: "0",
        total_harga: String(harga),
        metode_bayar: "manual",
        sumber: "checkout-ws",
        bundling: String(bundlingId),
      };

      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal membuat order");
      }

      const orderId = result.data?.order?.id || result.data?.id;
      if (!orderId) throw new Error("Order ID tidak ditemukan dalam response");

      toast.success("Pendaftaran berhasil! Mengarahkan ke halaman pembayaran...");

      const query = new URLSearchParams({
        order_id: String(orderId),
        harga: String(harga),
        metode: "manual",
      });

      setTimeout(() => {
        window.location.href = buildPaymentUrl(query.toString());
      }, 800);
    } catch (error) {
      console.error("[CHECKOUT-WS] Error:", error);
      toast.error(error.message || "Terjadi kesalahan saat mendaftar");
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

  if (notFound || !product) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>Produk tidak ditemukan</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>{product.nama || "Pendaftaran Workshop"}</h1>
          <p style={styles.subtitle}>Isi data di bawah untuk mengamankan tempat Anda</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {bundlingList.length > 0 && (
            <div style={styles.formSection}>
              <h3 style={styles.sectionTitle}>Pilihan Paket</h3>
              <div style={styles.bundlingList}>
                {bundlingList.map((item, index) => {
                  const isSelected = selectedBundling === index;
                  return (
                    <button
                      type="button"
                      key={item.id ?? index}
                      onClick={() => setSelectedBundling(index)}
                      style={{
                        ...styles.bundlingCard,
                        ...(isSelected ? styles.bundlingCardSelected : {}),
                      }}
                    >
                      <span style={styles.bundlingName}>{item.nama}</span>
                      <span style={styles.bundlingPrice}>{formatRupiah(item.harga)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div style={styles.formSection}>
            <div style={styles.field}>
              <label style={styles.label}>
                Nama Lengkap <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
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
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                placeholder="6281234567890 (gunakan format 62)"
                style={styles.input}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitButton,
              ...(submitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {submitting ? "Memproses..." : "Daftar & Amankan Tempat"}
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
    maxWidth: "480px",
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    padding: "32px",
    marginTop: "40px",
  },
  header: {
    textAlign: "center",
    marginBottom: "28px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "15px",
    color: "#6b7280",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1f2937",
  },
  bundlingList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  bundlingCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 16px",
    borderRadius: "8px",
    border: "2px solid #e5e7eb",
    backgroundColor: "#ffffff",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
  },
  bundlingCardSelected: {
    borderColor: "#ff6c00",
    backgroundColor: "#fff7ed",
  },
  bundlingName: {
    fontWeight: "600",
    color: "#1f2937",
    textTransform: "capitalize",
  },
  bundlingPrice: {
    fontWeight: "600",
    color: "#059669",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#374151",
  },
  required: {
    color: "#dc2626",
  },
  input: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "16px",
    outline: "none",
  },
  submitButton: {
    padding: "16px",
    backgroundColor: "#ff6c00",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
    cursor: "not-allowed",
  },
};
