"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import "@/styles/sales/orders.css";
import "@/styles/sales/orders-page.css";
import { createPortal } from "react-dom";

// Use Next.js proxy to avoid CORS
const BASE_URL = "/api";

const STATUS_PEMBAYARAN_MAP = {
  0: { label: "Unpaid", class: "unpaid" },
  null: { label: "Unpaid", class: "unpaid" },
  1: { label: "Waiting Approval", class: "pending" },
  2: { label: "Paid", class: "paid" },
  3: { label: "Rejected", class: "rejected" },
  4: { label: "Partial Payment", class: "partial" },
};

const STATUS_ORDER_MAP = {
  "1": { label: "Pending", class: "pending" },
  "2": { label: "Processing", class: "success" },
  "3": { label: "Failed", class: "failed" },
  "4": { label: "Completed", class: "completed" },
  "N": { label: "Deleted", class: "deleted" },
};

// Helper function to clean order data
const cleanOrderData = (orderData) => {
  if (!orderData) return {};

  const cleaned = { ...orderData };

  // Ensure customer is an ID, not an object
  if (cleaned.customer && typeof cleaned.customer === "object") {
    cleaned.customer = cleaned.customer.id || cleaned.customer_rel?.id || null;
  }

  // Ensure produk is an ID, not an object
  if (cleaned.produk && typeof cleaned.produk === "object") {
    cleaned.produk = cleaned.produk.id || cleaned.produk_rel?.id || null;
  }

  return cleaned;
};

export default function UpdateOrders({ order, onClose, onSave }) {
  const router = useRouter();
  const [updatedOrder, setUpdatedOrder] = useState(order ? cleanOrderData(order) : {});
  const [showKonfirmasiModal, setShowKonfirmasiModal] = useState(false);
  const [bukti, setBukti] = useState(
    order?.bukti_pembayaran
      ? { name: order.bukti_pembayaran, existing: true, url: order.bukti_pembayaran }
      : null
  );
  const [metodeBayar, setMetodeBayar] = useState(order?.metode_bayar ?? "");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isDP, setIsDP] = useState(false);
  const [amount, setAmount] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    if (order) {
      setUpdatedOrder(cleanOrderData(order));
      setBukti(
        order.bukti_pembayaran
          ? { name: order.bukti_pembayaran, existing: true, url: order.bukti_pembayaran }
          : null
      );
      setMetodeBayar(order.metode_bayar ?? "");
      setErrorMsg("");
      setIsDP(false);
      setAmount("");
    }
  }, [order]);

  // === Format currency helper ===
  const formatCurrency = (value) => {
    if (!value && value !== 0) return "";
    const numValue = typeof value === "string" ? value.replace(/,/g, "") : value;
    const num = Number(numValue);
    if (isNaN(num)) return "";
    return num.toLocaleString("id-ID");
  };

  // === Parse currency to number ===
  const parseCurrency = (value) => {
    if (!value && value !== 0) return 0;
    if (value === "" || value === null || value === undefined) return 0;
    // Remove all non-numeric characters (commas, spaces, etc)
    const numValue = typeof value === "string" ? value.replace(/\D/g, "") : String(value).replace(/\D/g, "");
    if (!numValue || numValue === "") return 0;
    const num = Number(numValue);
    return isNaN(num) ? 0 : num;
  };

  // Handle amount change with auto-format
  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Remove all non-numeric characters
    const numericValue = value.replace(/\D/g, "");
    // Format with thousand separator if has value
    const formattedValue = numericValue ? formatCurrency(numericValue) : "";
    setAmount(formattedValue);
  };

  // Update amount ketika isDP atau total_harga berubah
  useEffect(() => {
    if (!isDP) {
      // Jika bukan DP, amount otomatis dari total_harga (formatted)
      const totalHarga = updatedOrder.total_harga || order?.total_harga || 0;
      setAmount(totalHarga > 0 ? formatCurrency(totalHarga) : "");
    }
    // Jika DP, biarkan user input manual (tidak diubah otomatis)
  }, [isDP, updatedOrder.total_harga, order?.total_harga]);

  const computedStatus = () => {
    // Gunakan status_pembayaran dari order jika ada, jika tidak hitung dari bukti
    const statusPembayaran = updatedOrder.status_pembayaran ?? order?.status_pembayaran;
    if (statusPembayaran !== null && statusPembayaran !== undefined) {
      // Handle string "4" atau number 4
      const statusNum = Number(statusPembayaran);
      if (!isNaN(statusNum)) {
        return statusNum;
      }
    }
    // Fallback: hitung dari bukti pembayaran atau order_payment_rel
    const waktuPembayaran = getWaktuPembayaran(updatedOrder || order);
    if (
      updatedOrder.bukti_pembayaran &&
      (waktuPembayaran || updatedOrder.waktu_pembayaran) &&
      updatedOrder.bukti_pembayaran !== ""
    )
      return 1;
    return 0;
  };

  // Cek apakah masih bisa konfirmasi pembayaran
  const canConfirmPayment = () => {
    const statusPembayaran = computedStatus();
    const totalHarga = Number(updatedOrder.total_harga || order?.total_harga || 0);
    const totalPaid = Number(updatedOrder.total_paid || order?.total_paid || 0);
    const remaining = updatedOrder.remaining !== undefined && updatedOrder.remaining !== null
      ? Number(updatedOrder.remaining)
      : (totalHarga - totalPaid);

    // Jika status 2 (Paid), button di-nonaktifkan
    if (statusPembayaran === 2) {
      return false;
    }

    // Jika status DP (4), bisa konfirmasi BERKALI-KALI selama remaining > 0 atau total_paid < total_harga
    if (statusPembayaran === 4) {
      return remaining > 0 && totalPaid < totalHarga;
    }

    // Untuk status lainnya (0, 1, 3), bisa konfirmasi
    // Status 0 = Unpaid (bisa konfirmasi)
    // Status 1 = Menunggu (bisa konfirmasi lagi jika reject)
    // Status 3 = Ditolak (bisa konfirmasi lagi)
    return true;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedOrder((prev) => ({ ...prev, [name]: value }));
    setErrorMsg("");
  };

  const handleKonfirmasiFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setBukti({ name: file.name, file, existing: false, url: previewUrl });
    }
  };

  // Helper untuk mengambil waktu_pembayaran dari order_payment_rel
  const getWaktuPembayaran = (orderData) => {
    // Jika sudah ada di level order, gunakan itu
    if (orderData?.waktu_pembayaran) {
      return orderData.waktu_pembayaran;
    }
    // Ambil dari order_payment_rel jika ada
    if (orderData?.order_payment_rel && Array.isArray(orderData.order_payment_rel) && orderData.order_payment_rel.length > 0) {
      // Cari payment yang statusnya approved (status "2") terlebih dahulu
      const approvedPayment = orderData.order_payment_rel.find(p => String(p.status).trim() === "2");
      if (approvedPayment && approvedPayment.create_at) {
        const date = new Date(approvedPayment.create_at);
        const pad = (n) => n.toString().padStart(2, "0");
        return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      }
      // Jika tidak ada yang approved, ambil yang terbaru
      const latestPayment = orderData.order_payment_rel.sort((a, b) => {
        const dateA = new Date(a.create_at || 0);
        const dateB = new Date(b.create_at || 0);
        return dateB - dateA;
      })[0];
      if (latestPayment && latestPayment.create_at) {
        const date = new Date(latestPayment.create_at);
        const pad = (n) => n.toString().padStart(2, "0");
        return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
      }
    }
    return null;
  };

  const getPaymentStatus = (orderData) => {
    // Cek dari order_payment_rel jika ada
    if (orderData?.order_payment_rel && Array.isArray(orderData.order_payment_rel) && orderData.order_payment_rel.length > 0) {
      const hasApprovedPayment = orderData.order_payment_rel.some(p => String(p.status).trim() === "2");
      if (hasApprovedPayment) {
        return 1; // Paid
      }
      const hasPendingPayment = orderData.order_payment_rel.some(p => String(p.status).trim() === "1");
      if (hasPendingPayment) {
        return 1; // Menunggu
      }
    }
    // Fallback ke logika lama
    if (orderData.bukti_pembayaran && orderData.waktu_pembayaran && orderData.metode_bayar) return 1;
    return Number(orderData.status_pembayaran) || 0;
  };

  const handleKonfirmasiSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!order?.id) return setErrorMsg("Order ID tidak valid.");
    if (!bukti?.file) return setErrorMsg("Harap upload bukti pembayaran baru.");
    if (!metodeBayar) return setErrorMsg("Isi metode pembayaran terlebih dahulu.");
    const amountValue = parseCurrency(amount);
    if (!amount || amountValue <= 0) return setErrorMsg("Jumlah pembayaran harus diisi dan lebih dari 0.");

    // Validasi untuk DP: amount tidak boleh melebihi remaining
    const statusPembayaran = computedStatus();
    if (statusPembayaran === 4) {
      const totalHarga = Number(updatedOrder.total_harga || order?.total_harga || 0);
      const totalPaid = Number(updatedOrder.total_paid || order?.total_paid || 0);
      const remaining = totalHarga - totalPaid;

      if (amountValue > remaining) {
        return setErrorMsg(`Jumlah pembayaran tidak boleh melebihi sisa yang harus dibayar (Rp ${remaining.toLocaleString("id-ID")})`);
      }
    }

    setSubmitting(true);

    try {
      // Format waktu: dd-mm-yyyy HH:mm:ss
      const now = new Date();
      const pad = (n) => n.toString().padStart(2, "0");
      const waktuPembayaran = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      // Build FormData sesuai API spec
      const formData = new FormData();

      // Pastikan semua field dikirim dengan benar
      // Backend mengharapkan field name sesuai dengan database column
      if (bukti?.file) {
        formData.append("bukti_pembayaran", bukti.file);
      }

      // Pastikan waktu_pembayaran selalu dikirim (tidak boleh null atau empty)
      if (waktuPembayaran && waktuPembayaran.trim() !== "") {
        formData.append("waktu_pembayaran", waktuPembayaran);
      } else {
        console.error("❌ [KONFIRMASI] waktu_pembayaran kosong atau tidak valid!");
      }

      // Backend mengharapkan metode_bayar (bukan metode_pembayaran) sesuai dengan database column
      if (metodeBayar && metodeBayar.trim() !== "") {
        formData.append("metode_bayar", metodeBayar); // Gunakan metode_bayar sesuai database
        formData.append("metode_pembayaran", metodeBayar); // Juga kirim metode_pembayaran untuk kompatibilitas
      }

      formData.append("amount", String(amountValue));

      // Log untuk debugging - pastikan semua field ada
      console.log("🔍 [KONFIRMASI] ========== REQUEST DATA ==========");
      console.log("🔍 [KONFIRMASI] waktu_pembayaran:", waktuPembayaran);
      console.log("🔍 [KONFIRMASI] metode_pembayaran:", metodeBayar);
      console.log("🔍 [KONFIRMASI] amount:", amountValue);
      console.log("🔍 [KONFIRMASI] bukti_pembayaran:", bukti?.file ? `[File] ${bukti.file.name} (${bukti.file.size} bytes)` : "TIDAK ADA");
      console.log("🔍 [KONFIRMASI] FormData entries:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ✅ ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ✅ ${key}: ${value}`);
        }
      }
      console.log("🔍 [KONFIRMASI] ====================================");

      const token = localStorage.getItem("token");
      const url = `${BASE_URL}/sales/order-konfirmasi/${order.id}`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      // Cek sukses: bisa dari success field, atau dari message yang mengandung "Sukses"
      const isSuccess = res.ok && (
        data.success === true ||
        (data.message && data.message.toLowerCase().includes("sukses"))
      );

      if (!isSuccess) {
        const errMsg = data?.message || data?.error || "Gagal konfirmasi pembayaran";
        setSubmitting(false);
        return setErrorMsg(errMsg);
      }

      // Response sukses sesuai API spec
      const konfirmasiOrder = data.data || data;

      // Update local state dengan data dari backend
      const newTotalPaid = konfirmasiOrder.total_paid !== undefined ? konfirmasiOrder.total_paid : (order.total_paid || 0);
      const totalHarga = Number(updatedOrder.total_harga || order?.total_harga || 0);
      const newRemaining = konfirmasiOrder.remaining !== undefined
        ? Number(konfirmasiOrder.remaining)
        : (totalHarga - newTotalPaid);
      const isFullyPaid = newTotalPaid >= totalHarga;

      // LOGIKA STATUS PEMBAYARAN setelah konfirmasi pembayaran:
      // - Jika sudah lunas (total_paid >= total_harga), set ke 2 (Paid)
      // - Jika masih ada remaining (total_paid < total_harga), set ke 4 (DP)
      // - Status pembayaran di page.js harus tetap 4 (DP) sampai remaining = 0
      // - Perubahan status payment individual (approve/reject) hanya mempengaruhi paymentHistoryModal.js, bukan page.js
      let newStatusPembayaran;

      if (isFullyPaid) {
        // Jika sudah lunas, set ke 2 (Paid)
        newStatusPembayaran = 2;
      } else if (newRemaining > 0 || newTotalPaid < totalHarga) {
        // Jika masih ada remaining, set ke 4 (DP)
        // Ini berlaku untuk konfirmasi pertama kali (dari Unpaid) maupun konfirmasi lanjutan
        newStatusPembayaran = 4;
      } else {
        // Fallback: gunakan status yang sudah ada
        newStatusPembayaran = statusPembayaran;
      }

      const finalOrder = {
        ...order,
        ...konfirmasiOrder,
        // Pastikan field-field ini terisi
        bukti_pembayaran: konfirmasiOrder.bukti_pembayaran || bukti.name,
        waktu_pembayaran: konfirmasiOrder.waktu_pembayaran || waktuPembayaran,
        metode_bayar: konfirmasiOrder.metode_bayar || metodeBayar,
        status_pembayaran: newStatusPembayaran,
        status_order: order.status_order || "1", // Tetap Proses (1), tidak berubah saat konfirmasi pembayaran
        // Update total_paid dan remaining dari response
        total_paid: newTotalPaid,
        remaining: newRemaining,
      };

      setUpdatedOrder(finalOrder);

      // Update parent component
      onSave(finalOrder);
      setShowKonfirmasiModal(false);

      // Reset form untuk pembayaran berikutnya
      // Untuk status 4 (DP) yang belum lunas, reset bukti dan amount agar bisa konfirmasi lagi
      if (statusPembayaran === 4 && !isFullyPaid) {
        // Untuk DP yang belum lunas, reset bukti dan amount untuk pembayaran berikutnya
        // Amount dibiarkan kosong agar user bisa input manual
        setBukti(null);
        setAmount("");
        setIsDP(true);
      } else {
        // Jika sudah lunas atau bukan DP, reset semua
        setBukti((prev) => ({
          ...prev,
          existing: true,
          url: konfirmasiOrder.bukti_pembayaran || bukti.name
        }));
        setAmount("");
        setIsDP(false);
      }

      // Tampilkan toast sukses
      const successMessage = isFullyPaid
        ? "Pembayaran berhasil dikonfirmasi! Order sudah lunas."
        : `Pembayaran berhasil dikonfirmasi! Sisa yang harus dibayar: Rp ${newRemaining.toLocaleString("id-ID")}`;

      setErrorMsg("");
      // Success handled by onSave callback

      // Tutup modal dan redirect ke halaman orders setelah delay
      // Button akan tetap muncul ketika user buka modal edit lagi untuk status 4 yang masih ada remaining
      setTimeout(() => {
        onClose();
        // Redirect ke halaman orders
        router.push("/sales/orders");
      }, 1200);
    } catch (err) {
      console.error("[KONFIRMASI] Error:", err);
      setErrorMsg("Terjadi kesalahan saat konfirmasi pembayaran.");
      setSubmitting(false);

      setErrorMsg("Gagal mengkonfirmasi pembayaran.");
    }
  };


  const handleSubmitUpdate = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      // Pastikan semua field yang diperlukan dikirim sesuai API spec
      const payload = {
        alamat: updatedOrder.alamat ?? order?.alamat ?? "",
        harga: String(updatedOrder.harga ?? order?.harga ?? ""),
        ongkir: String(updatedOrder.ongkir ?? order?.ongkir ?? ""),
        total_harga: String(updatedOrder.total_harga ?? order?.total_harga ?? ""),
        waktu_pembayaran: getWaktuPembayaran(updatedOrder || order) || updatedOrder?.waktu_pembayaran || order?.waktu_pembayaran || null,
        bukti_pembayaran: updatedOrder.bukti_pembayaran ?? order?.bukti_pembayaran ?? null,
        metode_bayar: metodeBayar || order?.metode_bayar || null,
        sumber: updatedOrder.sumber ?? order?.sumber ?? "",
      };

      // Log untuk debugging
      console.log("🔍 [UPDATE ORDER] Payload yang dikirim:", payload);

      const res = await fetch(`${BASE_URL}/sales/order/${order.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      const newOrder = json.data;   // ⬅️ full data

      onSave(newOrder);             // ⬅️ langsung update parent
      onClose();
    } catch (err) {
      console.error("❌ [UPDATE ORDER] Error:", err);
    }
  };

  const handleReject = async () => {
    if (!order?.id) return;

    setSubmitting(true);
    setErrorMsg("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${BASE_URL}/sales/order/${order.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      const json = await res.json();
      if (res.ok && json.success) {
        onSave(json.data || { ...order, status_order: "3" });
        onClose();
      } else {
        setErrorMsg(json.message || "Gagal menolak pesanan");
      }
    } catch (err) {
      console.error("❌ [REJECT ORDER] Error:", err);
      setErrorMsg("Terjadi kesalahan saat menolak pesanan.");
    } finally {
      setSubmitting(false);
    }
  };



  // Helper untuk build URL gambar via proxy
  const buildImageUrl = (path) => {
    if (!path) return null;
    const cleanPath = path.replace(/^\/?(storage\/)?/, "");
    return `/api/image?path=${encodeURIComponent(cleanPath)}`;
  };

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-card" style={{ width: "min(960px, 95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <div className="modal-header">
            <h2>Update Pesanan #{order?.id}</h2>
            <button className="modal-close" onClick={onClose} type="button" aria-label="Tutup modal">
              <i className="pi pi-times" />
            </button>
          </div>

          {/* Body */}
          <form className="modal-body" onSubmit={handleSubmitUpdate} style={{ overflowY: "auto", flex: 1 }}>
            <div className="update-orders-grid">
              {/* KOLOM KIRI - Informasi Order */}
              <div className="update-orders-section">
                <h4 className="detail-section-title">Informasi Order</h4>

                <div className="detail-list">
                  <div className="detail-item">
                    <span className="detail-label">Customer</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">
                      {order.customer_rel?.nama ||
                        (typeof order.customer === "object" ? order.customer?.nama : String(order.customer || "-")) ||
                        "-"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">WhatsApp</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{order.customer_rel?.wa || "-"}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Produk</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">
                      {order.produk_rel?.nama ||
                        (typeof order.produk === "object" ? order.produk?.nama : String(order.produk || "-")) ||
                        "-"}
                    </span>
                  </div>
                  {order.bundling_rel && (
                    <div className="detail-item">
                      <span className="detail-label">Paket Bundling</span>
                      <span className="detail-colon">:</span>
                      <span className="detail-value">{order.bundling_rel.nama}</span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Tanggal</span>
                    <span className="detail-colon">:</span>
                    <span className="detail-value">{order.tanggal || "-"}</span>
                  </div>
                </div>

                <div className="detail-section-divider"></div>

                <label className="form-field">
                  <span className="field-label">Alamat Pengiriman</span>
                  <textarea
                    name="alamat"
                    rows="3"
                    className="field-input"
                    value={updatedOrder.alamat ?? order.alamat ?? ""}
                    onChange={handleChange}
                    placeholder="Masukkan alamat lengkap"
                  />
                </label>

                <label className="form-field">
                  <span className="field-label">Sumber Order</span>
                  <select
                    name="sumber"
                    className="field-input"
                    value={updatedOrder.sumber ?? order.sumber ?? ""}
                    onChange={handleChange}
                  >
                    <option value="">Pilih sumber</option>
                    <option value="website">Website</option>
                    <option value="instagram">Instagram</option>
                    <option value="tiktok">TikTok</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sales">Sales</option>
                    <option value="event">Event</option>
                    <option value="zoom">Zoom</option>
                    <option value="offline">Offline</option>
                  </select>
                </label>
              </div>

              {/* KOLOM KANAN - Pembayaran */}
              <div className="update-orders-section">
                <h4 className="detail-section-title">Detail Pembayaran</h4>

                <div className="price-grid">
                  <label className="form-field">
                    <span className="field-label">Harga Produk</span>
                    <div className="field-input-wrapper">
                      <span className="input-prefix">Rp</span>
                      <input
                        type="number"
                        name="harga"
                        className="field-input field-input--readonly"
                        value={updatedOrder.harga ?? order.harga ?? ""}
                        disabled
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span className="field-label">Ongkir</span>
                    <div className="field-input-wrapper">
                      <span className="input-prefix">Rp</span>
                      <input
                        type="number"
                        name="ongkir"
                        className="field-input"
                        value={updatedOrder.ongkir ?? order.ongkir ?? ""}
                        onChange={handleChange}
                      />
                    </div>
                  </label>
                </div>

                <label className="form-field">
                  <span className="field-label">Total Harga</span>
                  <div className="field-input-wrapper">
                    <span className="input-prefix">Rp</span>
                    <input
                      type="number"
                      name="total_harga"
                      className="field-input field-input--highlight"
                      value={updatedOrder.total_harga ?? order.total_harga ?? ""}
                      onChange={handleChange}
                    />
                  </div>
                </label>

                <label className="form-field">
                  <span className="field-label">Metode Pembayaran</span>
                  <input
                    type="text"
                    className="field-input"
                    value={metodeBayar}
                    onChange={(e) => setMetodeBayar(e.target.value)}
                    placeholder="Contoh: Transfer BCA, QRIS, dll"
                  />
                </label>

                {/* Waktu Pembayaran - hanya tampil jika sudah ada */}
                {(() => {
                  const waktuPembayaran = getWaktuPembayaran(updatedOrder || order);
                  return waktuPembayaran ? (
                    <label className="form-field">
                      <span className="field-label">Waktu Pembayaran</span>
                      <input
                        type="text"
                        className="field-input field-input--readonly"
                        value={waktuPembayaran}
                        readOnly
                        disabled
                      />
                    </label>
                  ) : null;
                })()}

                {/* Total Paid & Remaining - hanya tampil jika status pembayaran = 4 (DP) */}
                {computedStatus() === 4 && (
                  <div style={{ marginBottom: "16px", padding: "16px", background: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 600, color: "#111827" }}>Detail Pembayaran DP</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#6b7280" }}>Total Paid:</span>
                        <strong style={{ color: "#059669" }}>
                          Rp{" "}
                          {Number(
                            updatedOrder.total_paid ?? order?.total_paid ?? 0
                          ).toLocaleString("id-ID")}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#6b7280" }}>Remaining:</span>
                        <strong style={{ color: "#dc2626" }}>
                          Rp{" "}
                          {Number(
                            updatedOrder.remaining ??
                            order?.remaining ??
                            (Number(updatedOrder.total_harga ?? order?.total_harga ?? 0) -
                              Number(updatedOrder.total_paid ?? order?.total_paid ?? 0))
                          ).toLocaleString("id-ID")}
                        </strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Button Konfirmasi Pembayaran */}
                <button
                  type="button"
                  className="btn-konfirmasi"
                  disabled={!metodeBayar}
                  onClick={() => {
                    const statusPembayaran = computedStatus();
                    const totalHarga =
                      updatedOrder.total_harga || order?.total_harga || 0;

                    // DP (status 4) → input manual
                    if (statusPembayaran === 4) {
                      setAmount("");
                      setIsDP(true);
                    } else {
                      // selain DP → auto isi total
                      setAmount(totalHarga > 0 ? formatCurrency(totalHarga) : "");
                      setIsDP(false);
                    }

                    // 🔥 APAPUN STATUSNYA, MODAL HARUS BUKA
                    setShowKonfirmasiModal(true);
                  }}
                  style={{
                    width: "100%",
                    marginBottom: "16px",
                  }}
                >
                  <i className="pi pi-check-circle" />
                  {computedStatus() === 4
                    ? "Konfirmasi Pembayaran Lanjutan"
                    : "Konfirmasi Pembayaran"}
                </button>


                {/* Bukti Pembayaran Preview */}
                {bukti && (
                  <div className="bukti-preview">
                    <span className="field-label">Bukti Pembayaran</span>
                    <div className="bukti-image-wrapper">
                      <img
                        src={bukti.url.startsWith("blob:") ? bukti.url : buildImageUrl(bukti.url)}
                        alt="Bukti Pembayaran"
                        className="bukti-image"
                        onError={(e) => {
                          e.target.style.display = "none";
                          console.error("Gagal memuat gambar bukti");
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {errorMsg && (
              <div className="orders-error orders-error--inline">⚠️ {errorMsg}</div>
            )}

            {/* Footer */}
            <div className="modal-footer" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="btn-reject"
                  disabled={submitting}
                >
                  {submitting ? "Memproses..." : "Reject Order"}
                </button>
                <button type="submit" className="btn-save" disabled={submitting}>
                  {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Inline Styles */}
      <style jsx>{`
        .update-orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 24px;
          margin-bottom: 20px;
        }

        .update-orders-section {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 20px;
        }

        .section-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .section-icon {
          font-size: 24px;
        }

        .section-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .section-header p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #6b7280;
        }

        .info-card {
          background: #f9fafb;
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 13px;
          color: #6b7280;
        }

        .info-value {
          font-size: 14px;
          font-weight: 500;
          color: #111827;
          text-align: right;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 16px;
        }

        .field-label {
          font-size: 13px;
          font-weight: 500;
          color: #374151;
        }

        .field-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .field-input:focus {
          outline: none;
          border-color: #ff6c00;
          box-shadow: 0 0 0 3px rgba(255, 108, 0, 0.15);
        }

        .field-input--readonly {
          background: #f3f4f6;
          cursor: not-allowed;
          color: #6b7280;
        }

        .field-input--highlight {
          background: #eef2ff;
          border-color: #818cf8;
          font-weight: 600;
          color: #4338ca;
        }

        .field-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-prefix {
          position: absolute;
          left: 12px;
          color: #6b7280;
          font-size: 14px;
        }

        .field-input-wrapper .field-input {
          padding-left: 36px;
        }

        .price-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .payment-status-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        .payment-status-card.paid {
          background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
          border: 1px solid #6ee7b7;
        }

        .payment-status-card.unpaid {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 1px solid #fcd34d;
        }

        .status-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .status-label {
          font-size: 12px;
          color: #6b7280;
        }

        .status-badge {
          font-size: 14px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 6px;
        }

        .badge-paid {
          background: #10b981;
          color: white;
        }

        .badge-dp {
          background: #ff6c00;
          color: white;
        }

        .badge-unpaid {
          background: #f59e0b;
          color: white;
        }

        .btn-konfirmasi {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 16px;
          background: #ff6c00;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-konfirmasi:hover:not(:disabled) {
          background: #c85400;
        }

        .btn-konfirmasi:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .status-confirmed {
          font-size: 13px;
          color: #059669;
          font-weight: 500;
        }

        .bukti-preview {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bukti-image-wrapper {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          text-align: center;
        }

        .bukti-image {
          max-width: 100%;
          max-height: 180px;
          border-radius: 8px;
          object-fit: contain;
        }

        .btn-reject {
          padding: 10px 20px;
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-reject:hover:not(:disabled) {
          background: #fecaca;
          color: #b91c1c;
        }

        .btn-reject:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .update-orders-grid {
            grid-template-columns: 1fr;
          }

          .price-grid {
            grid-template-columns: 1fr;
          }

          .payment-status-card {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
        }
      `}</style>

      {/* Modal Konfirmasi Pembayaran */}
      {showKonfirmasiModal && (
        <div className="orders-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowKonfirmasiModal(false)}>
          <div className="konfirmasi-modal">
            <div className="konfirmasi-header">
              <div className="konfirmasi-icon">💳</div>
              <div>
                <h3>Konfirmasi Pembayaran</h3>
                <p>Upload bukti pembayaran untuk order #{order?.id}</p>
              </div>
              <button
                className="konfirmasi-close"
                onClick={() => setShowKonfirmasiModal(false)}
                type="button"
              >
                <i className="pi pi-times" />
              </button>
            </div>

            <form onSubmit={handleKonfirmasiSubmit} className="konfirmasi-form">
              <div className="upload-area">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleKonfirmasiFileChange}
                  id="bukti-upload"
                  className="upload-input"
                />
                <label htmlFor="bukti-upload" className="upload-label">
                  {bukti?.url ? (
                    <img src={bukti.url} alt="Preview" className="upload-preview" />
                  ) : (
                    <>
                      <span className="upload-icon">📷</span>
                      <span className="upload-text">Klik untuk upload bukti pembayaran</span>
                      <span className="upload-hint">PNG, JPG maksimal 5MB</span>
                    </>
                  )}
                </label>
              </div>

              <div className="konfirmasi-info">
                <div className="konfirmasi-info-row">
                  <span>Metode Pembayaran</span>
                  <strong>{metodeBayar || "-"}</strong>
                </div>
                <div className="konfirmasi-info-row">
                  <span>Total Order</span>
                  <strong>Rp {Number(updatedOrder.total_harga || order.total_harga || 0).toLocaleString("id-ID")}</strong>
                </div>
              </div>

              {/* Input Amount */}
              <label className="form-field">
                <span className="field-label">
                  💰 Jumlah Pembayaran {isDP && <span className="dp-badge">(DP)</span>}
                </span>
                <div className="money-input">
                  <span className="money-prefix">Rp</span>
                  <input
                    type="text"
                    className="money-input-field"
                    value={amount}
                    onChange={handleAmountChange}
                    disabled={!isDP}
                    placeholder={isDP ? "Masukkan jumlah DP" : "Jumlah pembayaran"}
                    required
                  />
                </div>
                {!isDP && (
                  <span className="field-hint">Jumlah otomatis sesuai total order (tidak dapat diubah)</span>
                )}
                {isDP && (
                  <span className="field-hint">
                    Masukkan jumlah pembayaran DP (maksimal: Rp{" "}
                    {Number(
                      (Number(updatedOrder.total_harga ?? order?.total_harga ?? 0) -
                        Number(updatedOrder.total_paid ?? order?.total_paid ?? 0))
                    ).toLocaleString("id-ID")}
                    )
                  </span>
                )}
              </label>

              {errorMsg && (
                <div className="konfirmasi-error">⚠️ {errorMsg}</div>
              )}

              <div className="konfirmasi-footer">
                <button
                  type="button"
                  className="orders-btn orders-btn--ghost"
                  onClick={() => setShowKonfirmasiModal(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="orders-btn orders-btn--success"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <i className="pi pi-spin pi-spinner" style={{ marginRight: 6 }} />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <i className="pi pi-check" style={{ marginRight: 6 }} />
                      Konfirmasi Pembayaran
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Reject Confirmation */}
      {showRejectModal && (
        <div className="orders-modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="konfirmasi-modal">
            <div className="konfirmasi-header" style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" }}>
              <div className="konfirmasi-icon">⚠️</div>
              <div>
                <h3>Konfirmasi Reject</h3>
                <p>Apakah Anda yakin ingin menolak pesanan ini?</p>
              </div>
              <button
                className="konfirmasi-close"
                onClick={() => setShowRejectModal(false)}
                type="button"
              >
                <i className="pi pi-times" />
              </button>
            </div>

            <div className="konfirmasi-form">
              <p style={{ fontSize: "14px", color: "#4b5563", marginBottom: "20px", textAlign: "center" }}>
                Tindakan ini tidak dapat dibatalkan. Status order akan berubah menjadi <strong>Rejected</strong>.
              </p>

              <div className="konfirmasi-footer">
                <button
                  type="button"
                  className="orders-btn orders-btn--ghost"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="orders-btn"
                  style={{
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: "500",
                    cursor: "pointer"
                  }}
                  onClick={handleReject}
                  disabled={submitting}
                >
                  {submitting ? "Memproses..." : "Ya, Tolak Pesanan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi Modal Styles */}
      <style jsx>{`
        .konfirmasi-modal {
          background: white;
          border-radius: 20px;
          width: min(480px, 95vw);
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          overflow: hidden;
        }

        .konfirmasi-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 20px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .konfirmasi-icon {
          font-size: 32px;
        }

        .konfirmasi-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .konfirmasi-header p {
          margin: 4px 0 0;
          font-size: 13px;
          opacity: 0.9;
        }

        .konfirmasi-close {
          margin-left: auto;
          background: rgba(255,255,255,0.2);
          border: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .konfirmasi-close:hover {
          background: rgba(255,255,255,0.3);
        }

        .konfirmasi-form {
          padding: 24px;
        }

        .upload-area {
          margin-bottom: 20px;
        }

        .upload-input {
          display: none;
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 160px;
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          background: #f9fafb;
          cursor: pointer;
          transition: all 0.2s;
          overflow: hidden;
        }

        .upload-label:hover {
          border-color: #ff6c00;
          background: rgba(255, 108, 0, 0.05);
        }

        .upload-preview {
          max-width: 100%;
          max-height: 200px;
          object-fit: contain;
        }

        .upload-icon {
          font-size: 40px;
          margin-bottom: 8px;
        }

        .upload-text {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .upload-hint {
          font-size: 12px;
          color: #9ca3af;
          margin-top: 4px;
        }

        .konfirmasi-info {
          background: #f9fafb;
          border-radius: 10px;
          padding: 14px;
          margin-bottom: 20px;
        }

        .konfirmasi-info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }

        .konfirmasi-info-row:last-child {
          border-bottom: none;
        }

        .konfirmasi-info-row span {
          font-size: 13px;
          color: #6b7280;
        }

        .konfirmasi-info-row strong {
          font-size: 14px;
          color: #111827;
        }

        .konfirmasi-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 16px;
        }

        .konfirmasi-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .orders-btn--success {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.2s;
        }

        .orders-btn--success:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .dp-checkbox-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .dp-checkbox-wrapper:hover {
          background: #f3f4f6;
          border-color: #d1d5db;
        }

        .dp-checkbox {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #ff6c00;
        }

        .dp-checkbox-label {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          user-select: none;
        }

        .dp-badge {
          display: inline-block;
          padding: 2px 8px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          margin-left: 6px;
        }

        .field-hint {
          font-size: 12px;
          color: #6b7280;
          margin-top: 4px;
        }

        .modal-overlay {
          z-index: 11000 !important;
        }

        .orders-modal-overlay {
          z-index: 12000 !important;
        }

        .field-input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          color: #6b7280;
        }

        .konfirmasi-form .form-field {
          margin-bottom: 16px;
        }

        .konfirmasi-form .field-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .konfirmasi-form .input-prefix {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #1f2937;
          font-size: 16px;
          font-weight: 700;
          z-index: 2;
          line-height: 1;
          pointer-events: none;
        }

        .konfirmasi-form .field-input-wrapper .field-input {
          padding-left: 50px;
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid #d1d5db;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          transition: all 0.2s;
          background: #ffffff;
          line-height: 1.5;
        }

        .konfirmasi-form .field-input-wrapper .field-input:focus {
          outline: none;
          border-color: #ff6c00;
          box-shadow: 0 0 0 3px rgba(255, 108, 0, 0.15);
        }
      `}</style>
    </>
  );
}
