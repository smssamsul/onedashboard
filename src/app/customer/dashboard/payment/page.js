"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import CustomerLayout from "@/components/customer/CustomerLayout";
import { getCustomerSession } from "@/lib/customerAuth";
import { fetchCustomerDashboard } from "@/lib/customerDashboard";
import "@/styles/customer/cstdashboard.css";

export default function PaymentPage() {
  const router = useRouter();
  const [unpaidOrders, setUnpaidOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasHistory, setHasHistory] = useState(false);
  const [error, setError] = useState("");
  const [customerInfo, setCustomerInfo] = useState(null);

  const formatCurrency = (value) => {
    if (!value) return "Rp 0";
    const numberValue = Number(String(value).replace(/\D/g, ""));
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(numberValue || 0);
  };

  const formatOrderId = (orderId) => {
    if (!orderId) return "-";
    return `#${String(orderId).padStart(6, "0")}`;
  };

  const loadUnpaidOrders = useCallback(async () => {
    const session = getCustomerSession();

    if (!session.token) {
      router.replace("/customer");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await fetchCustomerDashboard(session.token);

      // Simpan customer info untuk digunakan saat pembayaran
      if (data?.customer) {
        setCustomerInfo(data.customer);
      }

      // Kumpulkan semua order dari berbagai sumber
      const allOrders = [
        ...(data?.orders_aktif || []),
        ...(data?.orders_pending || []),
        ...(data?.order_proses || []),
        ...(data?.orders_proses || []),
      ];

      // Filter untuk menghindari duplikat berdasarkan ID
      const uniqueOrders = allOrders.filter((order, index, self) =>
        index === self.findIndex((o) => o.id === order.id)
      );

      // Filter order yang status_pembayaran belum 2 (belum terbayar)
      const unpaidOrdersList = uniqueOrders.filter((order) => {
        const statusPembayaran = order.status_pembayaran || order.status_pembayaran_id;
        return statusPembayaran !== 2 && statusPembayaran !== "2";
      });

      // Ambil data order dari localStorage (dari verify-order) untuk melengkapi data
      const storedOrderData = localStorage.getItem("customer_order_data");
      let localStorageOrderData = null;
      if (storedOrderData) {
        try {
          localStorageOrderData = JSON.parse(storedOrderData);
          console.log("[PAYMENT] Order data from localStorage:", localStorageOrderData);
        } catch (e) {
          console.error("[PAYMENT] Error parsing stored order data:", e);
        }
      }

      // Format orders untuk ditampilkan
      const formattedOrders = unpaidOrdersList.map((order) => {
        // Cek apakah order ini sesuai dengan order dari localStorage (berdasarkan orderId)
        const isMatchingOrder = localStorageOrderData &&
          (String(localStorageOrderData.orderId) === String(order.id));

        // PRIORITAS: 1. API (DB), 2. LocalStorage, 3. Manual (default)
        const paymentMethod = (order.metode_bayar || (isMatchingOrder ? localStorageOrderData.paymentMethod : null) || "manual").toLowerCase();

        return {
          id: order.id,
          orderId: order.id, // Gunakan ID asli dari DB
          productName: order.produk_nama || (isMatchingOrder ? localStorageOrderData.productName : "Produk Tanpa Nama"),
          totalHarga: order.total_harga || order.total_harga_formatted || (isMatchingOrder ? localStorageOrderData.totalHarga : "0"),
          status: "Menunggu Pembayaran",
          paymentMethod: paymentMethod,
          tanggalOrder: order.tanggal_order || "-",
          statusPembayaran: order.status_pembayaran || order.status_pembayaran_id,
          // Simpan data lengkap untuk Midtrans
          nama: order.nama || (isMatchingOrder ? localStorageOrderData?.nama : "") || data?.customer?.nama || data?.customer?.nama_lengkap || session?.user?.nama || "",
          email: order.email || (isMatchingOrder ? localStorageOrderData?.email : "") || data?.customer?.email || session?.user?.email || "",
          downPayment: order.down_payment || (isMatchingOrder ? localStorageOrderData?.downPayment : ""),
          rawOrder: order,
        };
      });

      setUnpaidOrders(formattedOrders);
      setHasHistory(uniqueOrders.length > 0);

      // Hapus data dari localStorage jika semua order sudah terbayar
      // atau jika order dari localStorage sudah tidak ada di unpaid orders
      if (localStorageOrderData && unpaidOrdersList.length > 0) {
        const orderStillUnpaid = unpaidOrdersList.some(order =>
          order.id === localStorageOrderData.orderId ||
          String(order.id) === String(localStorageOrderData.orderId)
        );

        if (!orderStillUnpaid) {
          // Order sudah terbayar, hapus data dari localStorage
          console.log("[PAYMENT] Order sudah terbayar, removing from localStorage");
          localStorage.removeItem("customer_order_data");
          localStorage.removeItem("pending_order");
        }
      } else if (unpaidOrdersList.length === 0 && localStorageOrderData) {
        // Tidak ada unpaid orders, hapus data
        console.log("[PAYMENT] No unpaid orders, removing from localStorage");
        localStorage.removeItem("customer_order_data");
        localStorage.removeItem("pending_order");
      }
    } catch (error) {
      console.error("[PAYMENT] Failed to load unpaid orders:", error);
      setError(error.message || "Gagal memuat data pembayaran.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadUnpaidOrders();
  }, [loadUnpaidOrders]);

  const handleContinuePayment = async (order) => {
    // Ambil paymentMethod dari objek order (yang sudah di-map dengan prioritas API)
    const paymentMethod = String(order.paymentMethod || "manual").toLowerCase();
    const { productName, totalHarga, nama, email, orderId } = order;

    console.log("[PAYMENT_PAGE] Processing Payment:", { orderId, paymentMethod, productName });

    // Jika metode pembayaran adalah E-Payment (ewallet, cc, va, midtrans)
    const isEpayment = ["ewallet", "cc", "va", "midtrans"].includes(paymentMethod);

    if (isEpayment) {
      const session = getCustomerSession();
      const finalNama = nama || customerInfo?.nama || customerInfo?.nama_lengkap || session?.user?.nama || "";
      const finalEmail = email || customerInfo?.email || session?.user?.email || "";

      if (!finalNama || !finalEmail) {
        toast.error("Data profil tidak lengkap untuk pembayaran online.");
        return;
      }

      let amount = 0;
      if (typeof totalHarga === "string") {
        amount = parseInt(totalHarga.replace(/\D/g, ""), 10) || 0;
      } else {
        amount = parseInt(totalHarga, 10) || 0;
      }

      if (amount <= 0) {
        toast.error("Jumlah pembayaran tidak valid.");
        return;
      }

      try {
        setLoading(true);

        // Tentukan endpoint berdasarkan metode pembayaran
        let endpoint = "/api/midtrans/create-snap-va";
        if (paymentMethod === "ewallet") {
          endpoint = "/api/midtrans/create-snap-ewallet";
        } else if (paymentMethod === "cc") {
          endpoint = "/api/midtrans/create-snap-cc";
        }

        console.log("[PAYMENT_PAGE] Triggering API:", endpoint);

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: finalNama,
            email: finalEmail,
            amount,
            product_name: productName,
            order_id: orderId,
          }),
        });

        const data = await response.json();

        if (data.success && data.redirect_url) {
          // Simpan order IDs untuk tracking
          sessionStorage.setItem("midtrans_order_id", String(orderId));
          if (data.order_id) {
            // Unique ID dari backend
            sessionStorage.setItem("midtrans_order_id_midtrans", data.order_id);
          }
          if (data.snap_token) {
            sessionStorage.setItem("midtrans_snap_token", data.snap_token);
          }

          toast.success(`Membuka pembayaran ${paymentMethod.toUpperCase()}...`);
          window.open(data.redirect_url, "_blank");
        } else {
          toast.error(data.message || "Gagal membuat sesi pembayaran online.");
          // Fallback manual
          router.push(`/payment?product=${encodeURIComponent(productName)}&harga=${amount}&via=manual&order_id=${orderId}&sumber=dashboard`);
        }
      } catch (error) {
        console.error("[PAYMENT_PAGE] Error initiating payment:", error);
        toast.error("Gagal terhubung ke gerbang pembayaran.");
      } finally {
        setLoading(false);
      }
    } else {
      // Manual Transfer
      const amountValue = typeof totalHarga === "string"
        ? totalHarga.replace(/\D/g, "")
        : totalHarga;

      console.log("[PAYMENT_PAGE] Redirecting to Manual Transfer");
      router.push(`/payment?product=${encodeURIComponent(productName)}&harga=${amountValue || "0"}&via=manual&order_id=${orderId || ""}&sumber=dashboard`);
    }
  };

  return (
    <CustomerLayout>
      <div className="customer-dashboard">
        <div className="payment-page-header">
          <h1>Pembayaran</h1>
          <p>Lengkapi pembayaran untuk order yang belum dibayar</p>
        </div>

        {loading && (
          <div className="payment-loading">
            <div className="loading-spinner"></div>
            <p>Memuat data pembayaran...</p>
          </div>
        )}

        {error && (
          <div className="payment-error">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && unpaidOrders.length === 0 && (
          <div className="payment-empty">
            <div className="payment-empty__icon" style={{
              color: hasHistory ? '#16a34a' : '#6b7280',
              backgroundColor: hasHistory ? '#dcfce7' : '#f3f4f6'
            }}>
              {hasHistory ? (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.7088 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              )}
            </div>
            <h2>{hasHistory ? "Semua pembayaran sudah selesai" : "Belum Ada Transaksi"}</h2>
            <p>{hasHistory ? "Tidak ada order yang menunggu pembayaran saat ini." : "Anda belum melakukan transaksi apapun."}</p>
            {!hasHistory && (
              <button
                onClick={() => router.push('/')}
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.95rem'
                }}
              >
                Lihat Katalog Produk
              </button>
            )}
          </div>
        )}

        {!loading && !error && unpaidOrders.length > 0 && (
          <div className="payment-orders-list">
            {unpaidOrders.map((order) => (
              <div key={order.id} className="payment-order-card">
                <div className="payment-order-card__header">
                  <div className="payment-order-card__info">
                    <h3>{order.productName}</h3>
                    <p className="payment-order-card__order-id">
                      {formatOrderId(order.orderId)}
                    </p>
                  </div>
                  <span className="payment-order-card__status">
                    {order.status}
                  </span>
                </div>

                <div className="payment-order-card__body">
                  <div className="payment-order-card__detail">
                    <span className="payment-order-card__label">Total Harga</span>
                    <span className="payment-order-card__value">
                      {formatCurrency(order.totalHarga)}
                    </span>
                  </div>
                  <div className="payment-order-card__detail">
                    <span className="payment-order-card__label">Tanggal Order</span>
                    <span className="payment-order-card__value">
                      {order.tanggalOrder}
                    </span>
                  </div>
                </div>

                <div className="payment-order-card__footer">
                  <button
                    className="payment-order-card__button"
                    onClick={() => handleContinuePayment(order)}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner" style={{
                          width: '16px',
                          height: '16px',
                          marginRight: '8px',
                          display: 'inline-block'
                        }}></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px' }}>
                          <path d="M4.16667 10H15.8333M15.8333 10L11.6667 5.83333M15.8333 10L11.6667 14.1667" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Lanjutkan Pembayaran
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </CustomerLayout>
  );
}

