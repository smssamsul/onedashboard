"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

export default function WorkshopPage() {
  const params = useParams();
  const router = useRouter();
  const { id_produk } = params;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Down Payment hardcode
  const DOWN_PAYMENT_AMOUNT = 2000000;

  // Form state
  const [formData, setFormData] = useState({
    nama: "",
    wa: "",
    email: "",
    alamat: "",
  });

  // Fetch produk berdasarkan ID
  useEffect(() => {
    async function fetchProduct() {
      if (!id_produk) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/sales/produk/${id_produk}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Produk tidak ditemukan");
        }

        // Handle response yang bisa berupa array atau object
        let productData = null;
        if (Array.isArray(result.data)) {
          productData = result.data.length > 0 ? result.data[0] : null;
        } else if (result.data && typeof result.data === "object") {
          productData = result.data;
        }

        if (!productData) {
          throw new Error("Data produk tidak ditemukan");
        }

        setProduct(productData);
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error(error.message || "Gagal memuat data produk");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id_produk]);

  // Handle form change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle submit order
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Validasi form
    if (!formData.nama.trim()) {
      toast.error("Nama wajib diisi");
      setSubmitting(false);
      return;
    }
    if (!formData.wa.trim()) {
      toast.error("Nomor WhatsApp wajib diisi");
      setSubmitting(false);
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email wajib diisi");
      setSubmitting(false);
      return;
    }
    if (!formData.alamat.trim()) {
      toast.error("Alamat wajib diisi");
      setSubmitting(false);
      return;
    }

    if (!product) {
      toast.error("Data produk tidak ditemukan");
      setSubmitting(false);
      return;
    }

    try {
      // Format harga produk
      const hargaProduk = product.harga || "0";
      const totalHarga = String(parseInt(hargaProduk) || 0);

      // Build payload untuk order
      const payload = {
        nama: formData.nama.trim(),
        wa: formData.wa.trim(),
        email: formData.email.trim(),
        alamat: formData.alamat.trim(),
        produk: parseInt(id_produk, 10),
        harga: hargaProduk,
        ongkir: "0", // Workshop tidak perlu ongkir
        total_harga: totalHarga,
        metode_bayar: "manual", // Default manual untuk workshop
        sumber: "workshop",
        down_payment: String(DOWN_PAYMENT_AMOUNT),
        status_pembayaran: 4, // Status DP (Down Payment)
      };

      console.log("📤 [WORKSHOP] Submitting order:", payload);

      // Submit order ke API
      const response = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal membuat order");
      }

      const orderId = result.data?.id || result.data?.order_id || result.order_id;

      if (!orderId) {
        throw new Error("Order ID tidak ditemukan dalam response");
      }

      console.log("✅ [WORKSHOP] Order created:", orderId);

      // Simpan data order ke localStorage untuk payment page
      const orderData = {
        orderId: String(orderId),
        productName: product.nama || "Produk Workshop",
        totalHarga: totalHarga,
        downPayment: String(DOWN_PAYMENT_AMOUNT),
        paymentMethod: "manual",
        sumber: "workshop",
        nama: formData.nama,
        email: formData.email,
      };

      localStorage.setItem("pending_order", JSON.stringify(orderData));

      toast.success("Order berhasil dibuat! Mengarahkan ke halaman pembayaran...");

      // Redirect ke payment page dengan down payment
      const query = new URLSearchParams({
        product: product.nama || "Produk Workshop",
        harga: totalHarga,
        via: "manual",
        sumber: "workshop",
        down_payment: String(DOWN_PAYMENT_AMOUNT),
        order_id: String(orderId),
      });

      setTimeout(() => {
        window.location.href = `https://app.ternakproperti.com/payment?${query.toString()}`;
      }, 1000);
    } catch (error) {
      console.error("❌ [WORKSHOP] Error:", error);
      toast.error(error.message || "Terjadi kesalahan saat membuat order");
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

  return (
    <div style={styles.container}>
      <div style={styles.formWrapper}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>Form Pemesanan Workshop</h1>
          <p style={styles.subtitle}>Isi form di bawah ini untuk melanjutkan pemesanan</p>
        </div>

        {/* Product Info */}
        <div style={styles.productCard}>
          <h2 style={styles.productName}>{product.nama || "Produk Workshop"}</h2>
          <p style={styles.productPrice}>
            Harga: Rp {Number(product.harga || 0).toLocaleString("id-ID")}
          </p>
        </div>

        {/* Form Pemesanan */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Data Pemesanan</h3>

            <div style={styles.field}>
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
              <label style={styles.label}>
                Email <span style={styles.required}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="nama@email.com"
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                Alamat Lengkap <span style={styles.required}>*</span>
              </label>
              <textarea
                name="alamat"
                value={formData.alamat}
                onChange={handleChange}
                placeholder="Masukkan alamat lengkap"
                rows={4}
                style={styles.textarea}
                required
              />
            </div>
          </div>

          {/* Form Down Payment */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionTitle}>Pembayaran Down Payment</h3>
            <div style={styles.downPaymentCard}>
              <div style={styles.downPaymentInfo}>
                <p style={styles.downPaymentLabel}>Jumlah Down Payment</p>
                <p style={styles.downPaymentAmount}>
                  Rp {DOWN_PAYMENT_AMOUNT.toLocaleString("id-ID")}
                </p>
                <p style={styles.downPaymentNote}>
                  Setelah order dibuat, Anda akan diarahkan ke halaman pembayaran untuk melakukan transfer down payment.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.submitButton,
              ...(submitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {submitting ? "Memproses..." : "Buat Order & Lanjutkan Pembayaran"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Styles
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
    marginBottom: "32px",
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
  productCard: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "24px",
  },
  productName: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "8px",
  },
  productPrice: {
    fontSize: "18px",
    color: "#059669",
    fontWeight: "600",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  formSection: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: "8px",
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
    transition: "border-color 0.2s",
  },
  textarea: {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "6px",
    fontSize: "16px",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    transition: "border-color 0.2s",
  },
  downPaymentCard: {
    backgroundColor: "#fef3c7",
    border: "2px solid #f59e0b",
    borderRadius: "8px",
    padding: "20px",
  },
  downPaymentInfo: {
    textAlign: "center",
  },
  downPaymentLabel: {
    fontSize: "14px",
    color: "#92400e",
    fontWeight: "500",
    marginBottom: "8px",
  },
  downPaymentAmount: {
    fontSize: "24px",
    color: "#92400e",
    fontWeight: "700",
    marginBottom: "12px",
  },
  downPaymentNote: {
    fontSize: "14px",
    color: "#92400e",
    lineHeight: "1.5",
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
    transition: "background-color 0.2s",
    marginTop: "8px",
  },
  submitButtonDisabled: {
    backgroundColor: "#d1d5db",
    cursor: "not-allowed",
  },
};

