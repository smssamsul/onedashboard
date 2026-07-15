"use client";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { toast } from "react-hot-toast";

import { getCustomerSession } from "@/lib/customerAuth";
import { fetchCustomerDashboard } from "@/lib/customerDashboard";
import { trackSalesUploadedPaymentPurchase } from "@/lib/sales/metaPixelPurchase";

// --- ICONS (Professional SVGs) ---
const Icons = {
  CheckCircle: () => (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Copy: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2v1" />
    </svg>
  ),
  WhatsApp: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  ),
  Lock: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
};

function BankTransferPageContent() {
  const params = useSearchParams();
  const product = params.get("product");
  const harga = params.get("harga");
  const downPaymentFromQuery = params.get("down_payment");
  const orderIdFromQuery = params.get("order_id");

  const [downPayment, setDownPayment] = useState(downPaymentFromQuery || "");
  const [orderId, setOrderId] = useState(orderIdFromQuery || "");
  const [isWorkshop, setIsWorkshop] = useState(false);

  // New States for Status Handling
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [serverOrderData, setServerOrderData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [customerData, setCustomerData] = useState(null);
  const [loadingMidtrans, setLoadingMidtrans] = useState(false);

  // States untuk WA Sales PIC & Template Followup
  const [salesPicWa, setSalesPicWa] = useState(null);
  const [salesPicNama, setSalesPicNama] = useState(null);
  const [templateFollup, setTemplateFollup] = useState(null);
  const [orderPublicData, setOrderPublicData] = useState(null);

  // State countdown auto-redirect WA
  const [waCountdown, setWaCountdown] = useState(null); // null = belum mulai
  const [waDataReady, setWaDataReady] = useState(false); // true setelah fetch selesai

  // Cek status order dari server
  useEffect(() => {
    const checkOrderStatus = async () => {
      const session = getCustomerSession();
      if (!session.token || !orderId) return;

      setCheckingStatus(true);
      try {
        const dashboardData = await fetchCustomerDashboard(session.token);

        // Cari order di semua list yang mungkin
        const allOrders = [
          ...(dashboardData?.orders_aktif || []),
          ...(dashboardData?.orders_pending || []),
          ...(dashboardData?.order_proses || []),
          ...(dashboardData?.orders_proses || []),
          ...(dashboardData?.orders || [])
        ];

        const foundOrder = allOrders.find(o =>
          String(o.id) === String(orderId)
        );

        if (foundOrder) {
          setServerOrderData(foundOrder);
        }
      } catch (err) {
        console.error("[PAYMENT] Failed to check status:", err);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (orderId) {
      checkOrderStatus();
    }
  }, [orderId]);

  // Cek dari localStorage sebagai fallback
  useEffect(() => {
    const storedOrder = localStorage.getItem("pending_order");
    const storedCustomerData = localStorage.getItem("customer_order_data");

    if (storedCustomerData) {
      try {
        const data = JSON.parse(storedCustomerData);
        setPaymentMethod(data.paymentMethod || "");
        setCustomerData(data);
      } catch (e) {
        console.error("[PAYMENT] Error parsing customer_order_data:", e);
      }
    }

    if (orderIdFromQuery) {
      setOrderId(orderIdFromQuery);
    } else if (storedOrder) {
      try {
        const orderData = JSON.parse(storedOrder);
        if (orderData.orderId) {
          setOrderId(orderData.orderId);
        }
      } catch (e) {
        console.error("[PAYMENT] Error parsing stored order:", e);
      }
    }

    if (downPaymentFromQuery) {
      setDownPayment(downPaymentFromQuery);
      setIsWorkshop(true);
    } else if (storedOrder) {
      try {
        const orderData = JSON.parse(storedOrder);
        if (orderData.downPayment) {
          setDownPayment(orderData.downPayment);
          setIsWorkshop(true);
        }
      } catch (e) {
        console.error("[PAYMENT] Error parsing stored order:", e);
      }
    }
  }, [downPaymentFromQuery, orderIdFromQuery]);

  // Load Midtrans Snap Script
  useEffect(() => {
    if (paymentMethod && paymentMethod !== "manual") {
      const isProduction = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
      const snapScript = isProduction
        ? "https://app.midtrans.com/snap/snap.js"
        : "https://app.sandbox.midtrans.com/snap/snap.js";
      const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "SB-Mid-client-v9Kjzq0WcEjk4-W7";

      if (!document.querySelector(`script[src="${snapScript}"]`)) {
        const script = document.createElement("script");
        script.src = snapScript;
        script.setAttribute("data-client-key", clientKey);
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [paymentMethod]);

  // === Fetch Sales PIC WA & Template Followup untuk redirect WA ===
  useEffect(() => {
    if (!orderId) return;
    // Skip jika test mode (orderId format TEST-xxxxx)
    const isTestOrder = String(orderId).startsWith("TEST-");
    if (isTestOrder) {
      setWaDataReady(true); // tetap aktifkan countdown untuk testing
      return;
    }
    const fetchSalesPicData = async () => {
      try {
        const res = await fetch(`/api/public-order/${orderId}`);
        if (!res.ok) return;
        const result = await res.json();
        if (result.success) {
          setOrderPublicData(result.data);
          if (result.sales_pic_wa) setSalesPicWa(result.sales_pic_wa);
          if (result.sales_pic_nama) setSalesPicNama(result.sales_pic_nama);
          if (result.template_follup_payment) setTemplateFollup(result.template_follup_payment);
        }
      } catch (e) {
        console.error("[PAYMENT] Gagal fetch sales pic WA:", e);
      } finally {
        setWaDataReady(true); // fetch selesai, mulai countdown
      }
    };
    fetchSalesPicData();
  }, [orderId]);

  // === Auto-redirect ke WA setelah countdown 3 detik (hanya bank transfer) ===
  useEffect(() => {
    const isBankTransfer = paymentMethod === "manual" || !paymentMethod;
    if (!waDataReady || !isBankTransfer) return;

    setWaCountdown(3);
    const interval = setInterval(() => {
      setWaCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [waDataReady, paymentMethod]);

  // === Trigger redirect saat countdown = 0 ===
  useEffect(() => {
    if (waCountdown !== 0) return;
    // Build URL inline (menghindari masalah urutan definisi fungsi)
    const adminWaFallback = "6281389892503";
    const targetWA = (salesPicWa || adminWaFallback).replace(/[^0-9]/g, "");
    const nama = orderPublicData?.customer_rel?.nama || "";
    const produk = orderPublicData?.produk_rel?.nama || "";
    const nominal = Number(isWorkshop ? downPayment : harga || 0).toLocaleString("id-ID");
    const kodeOrder = orderPublicData?.kode_order || orderId || "";
    let message;
    if (templateFollup?.text) {
      let text = templateFollup.text;
      text = text.replace(/\{\{?nama_customer\}?\}|\{nama\}|\[nama\]/gi, nama);
      text = text.replace(/\{\{?customer_name\}?\}|\{customer\}/gi, nama);
      text = text.replace(/\{\{?nama_produk\}?\}|\{produk\}|\[produk\]/gi, produk);
      text = text.replace(/\{\{?product_name\}?\}|\{product\}/gi, produk);
      text = text.replace(/\{\{?nominal\}?\}|\{harga\}|\{total\}|\[nominal\]/gi, `Rp ${nominal}`);
      text = text.replace(/\{\{?order_id\}?\}|\{kode_order\}|\[order_id\]/gi, kodeOrder);
      text = text.replace(/\{\{?order_total\}?\}/gi, `Rp ${nominal}`);
      message = text;
    } else {
      let text = "hallo saya sudah daftar {{product_name}} ya kak mohon info lebih lanjut nya";
      text = text.replace(/\{\{?nama_produk\}?\}|\{produk\}|\[produk\]/gi, produk);
      text = text.replace(/\{\{?product_name\}?\}|\{product\}/gi, produk);
      message = text;
    }
    window.location.href = `https://wa.me/${targetWA}?text=${encodeURIComponent(message)}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waCountdown]);

  // Facebook Pixel Purchase Event - Trigger langsung saat load dengan mengambil pixel ID & events dari backend berdasarkan produk
  useEffect(() => {
    if (!orderId) return;


    let isMounted = true;

    const loadFbeventsScript = (callback) => {
      if (typeof window === "undefined" || typeof document === "undefined") return;
      if (!window.fbq) {
        window.fbq = function () {
          window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
        };
        if (!window._fbq) window._fbq = window.fbq;
        window.fbq.push = window.fbq;
        window.fbq.loaded = true;
        window.fbq.version = '2.0';
        window.fbq.queue = [];
      }
      const existing = document.getElementById("fb-pixel-payment-loader");
      if (existing) {
        callback();
        return;
      }
      const s = document.createElement("script");
      s.id = "fb-pixel-payment-loader";
      s.async = true;
      s.src = "https://connect.facebook.net/en_US/fbevents.js";
      const first = document.getElementsByTagName("script")[0];
      if (first && first.parentNode) {
        first.parentNode.insertBefore(s, first);
      } else {
        document.head.appendChild(s);
      }
      callback();
    };

      const fetchOrderAndTrack = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hargaFromQuery = searchParams.get("harga") || harga;
        const sumberFromQuery = searchParams.get("sumber");

        // Skip jika dari dashboard
        if (sumberFromQuery === "dashboard") {
          console.log("[FB PIXEL] Accessed from dashboard - skip tracking");
          return;
        }

        // Skip jika test mode (tidak ada order nyata di DB)
        const isTestOrder = String(orderId).startsWith("TEST-");
        if (isTestOrder) {
          console.log("[FB PIXEL] Test mode - skip fetch public order");
          return;
        }

        console.log("[FB PIXEL] Fetching order data for pixel tracking. Order ID:", orderId);
        const res = await fetch(`/api/public-order/${orderId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch order from public API");
        }
        const result = await res.json();
        if (result.success && result.data && isMounted) {
          const orderData = result.data;
          const produk = orderData.produk_rel;

          if (produk && produk.fb_pixel && Array.isArray(produk.fb_pixel) && produk.fb_pixel.length > 0) {
            console.log("[FB PIXEL] Found pixel configuration from backend:", produk.fb_pixel);

            const finalValue = parseFloat(hargaFromQuery) || parseFloat(orderData.total_harga) || 0;

            loadFbeventsScript(() => {
              if (typeof window.fbq !== "function") {
                console.warn("[FB PIXEL] fbq tidak tersedia setelah load script");
                return;
              }
              if (!window.__fbSalesPixelInited) {
                window.__fbSalesPixelInited = new Set();
              }

              produk.fb_pixel.forEach((pixelItem) => {
                const pid = pixelItem.pixel_id;
                if (!pid) return;

                // Init pixel if not done yet
                try {
                  if (!window.__fbSalesPixelInited.has(pid)) {
                    window.fbq("init", pid);
                    window.__fbSalesPixelInited.add(pid);
                    console.log("[FB PIXEL] Init pixel ID:", pid);
                  }
                } catch (e) {
                  console.error("[FB PIXEL] Init failed for:", pid, e);
                }

                // Di halaman payment (penyelesaian transaksi), kita HANYA ingin men-trigger event 'Purchase'.
                // Semua event bawaan landing page builder (seperti ViewContent) diabaikan di sini agar statistik konversi tetap bersih.
                const eventsToTrack = [{ name: "Purchase", params: {} }];

                eventsToTrack.forEach((event) => {
                  const eventName = event.name || event.event || "Purchase";
                  const eventParams = {
                    content_ids: produk.id != null ? [String(produk.id)] : [],
                    content_type: "product",
                    content_name: produk.nama || "Product",
                    value: finalValue,
                    currency: "IDR",
                    order_id: orderData.kode_order || String(orderId),
                    ...event.params
                  };

                  try {
                    window.fbq("track", eventName, eventParams);
                    console.log(`[FB PIXEL] Event "${eventName}" tracked on pixel ${pid}`, eventParams);

                    // Log log crosscheck ke backend
                    fetch('/api/pixel-log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        order_id: orderData.id,
                        produk_id: produk.id,
                        pixel_id: pid,
                        event_name: eventName,
                        source: 'payment_page',
                        status: '1',
                        payload: eventParams
                      })
                    }).catch(e => console.error('[FB PIXEL LOG] Failed to send crosscheck log:', e));

                  } catch (err) {
                    console.error(`[FB PIXEL] Failed to track event "${eventName}" on pixel ${pid}:`, err);

                    fetch('/api/pixel-log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        order_id: orderData.id,
                        produk_id: produk.id,
                        pixel_id: pid,
                        event_name: eventName,
                        source: 'payment_page',
                        status: '0',
                        payload: { error: err.message, params: eventParams }
                      })
                    }).catch(e => console.error('[FB PIXEL LOG] Failed to send failure crosscheck log:', e));
                  }
                });
              });
            });
          } else {
            console.log("[FB PIXEL] No pixel configuration found for this product.");
          }
        }
      } catch (e) {
        console.error("[FB PIXEL] Error in fetching/tracking:", e);
      }
    };

    fetchOrderAndTrack();
    return () => {
      isMounted = false;
    };
  }, [orderId, harga]);

  // Update isWorkshop setiap kali downPayment berubah
  useEffect(() => {
    if (downPayment && parseFloat(downPayment) > 0) {
      setIsWorkshop(true);
    } else {
      setIsWorkshop(false);
    }
  }, [downPayment]);

  const displayAmount = Number((isWorkshop ? downPayment : harga) || 0);

  const rekeningBCA = {
    bank: "BCA",
    logo: "/assets/bca.png",
    nomor: "7615798878",
    atasNama: "PT Dukung Dunia Akademi",
  };

  const adminWA = "6281389892503";

  // === Helper: format pesan dari template followup ===
  const buildWaMessage = () => {
    const nama = orderPublicData?.customer_rel?.nama || customerData?.nama || "";
    const produk = orderPublicData?.produk_rel?.nama || customerData?.productName || "";
    const nominal = Number(isWorkshop ? downPayment : harga || 0).toLocaleString("id-ID");
    const kodeOrder = orderPublicData?.kode_order || orderId || "";

    if (templateFollup?.text) {
      let text = templateFollup.text;
      // Replace variabel umum
      text = text.replace(/\{\{?nama_customer\}?\}|\{nama\}|\[nama\]/gi, nama);
      text = text.replace(/\{\{?customer_name\}?\}|\{customer\}/gi, nama);
      text = text.replace(/\{\{?nama_produk\}?\}|\{produk\}|\[produk\]/gi, produk);
      text = text.replace(/\{\{?product_name\}?\}|\{product\}/gi, produk);
      text = text.replace(/\{\{?nominal\}?\}|\{harga\}|\{total\}|\[nominal\]/gi, `Rp ${nominal}`);
      text = text.replace(/\{\{?order_id\}?\}|\{kode_order\}|\[order_id\]/gi, kodeOrder);
      text = text.replace(/\{\{?order_total\}?\}/gi, `Rp ${nominal}`);
      return text;
    }

    // Default message jika tidak ada template
    let text = "hallo saya sudah daftar {{product_name}} ya kak mohon info lebih lanjut nya";
    text = text.replace(/\{\{?nama_produk\}?\}|\{produk\}|\[produk\]/gi, produk);
    text = text.replace(/\{\{?product_name\}?\}|\{product\}/gi, produk);
    return text;
  };

  const handleKonfirmasiWA = () => {
    const targetWA = salesPicWa || adminWA;
    const message = encodeURIComponent(buildWaMessage());
    window.location.href = `https://wa.me/${targetWA.replace(/[^0-9]/g, "")}?text=${message}`;
  };

  const handleBantuanWA = () => {
    const message = encodeURIComponent(
      `Halo, saya butuh bantuan terkait pembayaran pesanan saya:\n` +
      `Order ID: ${orderId}\n` +
      `Nominal: Rp ${Number(isWorkshop ? downPayment : harga).toLocaleString("id-ID")}`
    );
    window.location.href = `https://wa.me/${adminWA}?text=${message}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Nomor rekening disalin!");
    }).catch(() => toast.error("Gagal menyalin"));
  };

  const copyAmount = (amount) => {
    navigator.clipboard.writeText(amount).then(() => {
      toast.success("Nominal disalin!");
    }).catch(() => toast.error("Gagal menyalin"));
  };

  const handleLanjutkanPembayaran = async () => {
    if (!customerData) return;

    setLoadingMidtrans(true);
    try {
      const endpoint = paymentMethod === "cc" ? "create-snap-cc" :
        paymentMethod === "ewallet" ? "create-snap-ewallet" :
          "create-snap-va";

      const res = await fetch(`/api/midtrans/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerData.nama,
          email: customerData.email,
          amount: customerData.totalHarga,
          product_name: customerData.productName,
          order_id: customerData.orderId,
        }),
      });

      const data = await res.json();
      if (data.success && data.snap_token) {
        window.snap.pay(data.snap_token, {
          onSuccess: function (result) {
            toast.success("Pembayaran berhasil!");
            window.location.href = "/customer/dashboard";
          },
          onPending: function (result) {
            toast.success("Menunggu pembayaran...");
            window.location.href = "/customer/dashboard";
          },
          onError: function (result) {
            toast.error("Pembayaran gagal!");
          },
          onClose: function () {
            toast.error("Popup ditutup.");
          }
        });
      } else {
        toast.error(data.message || "Gagal mendapatkan token pembayaran");
      }
    } catch (err) {
      console.error("Error Midtrans", err);
      toast.error("Terjadi kesalahan");
    } finally {
      setLoadingMidtrans(false);
    }
  };

  // --- RENDER HELPERS ---

  return (
    <div className="saas-payment-page">
      <div className="saas-container">

        {/* Main Success Container */}
        <div className="success-wrapper">
          <div className="success-icon-container">
            <Icons.CheckCircle />
          </div>

          <h1 className="saas-title">Terima Kasih Atas Pesanan Anda!</h1>
          <p className="saas-subtitle">
            {paymentMethod === "manual" || !paymentMethod
              ? "Satu langkah lagi! Silakan selesaikan pembayaran Anda dengan mentransfer dana ke nomor rekening di bawah ini."
              : "Satu langkah lagi! Silakan klik tombol di bawah untuk melanjutkan pembayaran."}
          </p>

          <div className="payment-card">
            {/* Amount Section */}
            <div className="amount-section">
              <span className="amount-label">Total Pembayaran {isWorkshop && "(Down Payment)"}</span>
              <div className="amount-value-wrapper">
                <div className="amount-value">
                  <span className="currency">Rp</span>
                  {displayAmount.toLocaleString("id-ID")}
                </div>
                <button className="icon-btn-large" onClick={() => copyAmount(displayAmount.toString())} title="Salin Nominal">
                  <Icons.Copy />
                </button>
              </div>
              {orderId && <div className="order-ref">Order ID: <strong>{orderId}</strong></div>}
            </div>

            {paymentMethod === "manual" || !paymentMethod ? (
              <>
                {/* Bank Details Section */}
                <div className="bank-section">
                  <div className="secure-header">
                    <span className="secure-badge"><Icons.Lock /> Transaksi Aman</span>
                  </div>

                  <div className="bank-account-box">
                    <div className="bank-logo-area">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={rekeningBCA.logo} alt="BCA" className="bank-logo-img" />
                    </div>
                    <div className="bank-info-area">
                      <div className="bank-account-name">{rekeningBCA.bank} a.n. {rekeningBCA.atasNama}</div>
                      <div className="bank-account-number-wrapper">
                        <div className="bank-account-number">{rekeningBCA.nomor}</div>
                        <button className="copy-btn-text" onClick={() => copyToClipboard(rekeningBCA.nomor)}>
                          <Icons.Copy /> Salin Norek
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instruction Steps */}
                <div className="instructions-area">
                  <div className="instruction-step">
                    <span className="step-num">1</span>
                    <p>Buka aplikasi mobile banking atau ATM Anda.</p>
                  </div>
                  <div className="instruction-step">
                    <span className="step-num">2</span>
                    <p>Transfer sejumlah nominal di atas ke nomor rekening yang tertera.</p>
                  </div>
                  <div className="instruction-step">
                    <span className="step-num">3</span>
                    <p>Simpan bukti transfer. Pembayaran Anda akan dicek dan produk / layanan akan segera diproses.</p>
                  </div>
                </div>

                {/* === Countdown Auto-Redirect WA Banner === */}
                {waCountdown !== null && waCountdown > 0 && (
                  <div style={{
                    margin: '0',
                    padding: '1.25rem 1.5rem',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                    borderTop: '1px solid #bbf7d0',
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '32px', height: '32px', background: '#16a34a',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, animation: 'wa-ping 1s ease-in-out infinite'
                        }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                            <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.99.574 3.844 1.568 5.399L2 22l4.759-1.548C8.23 21.406 10.07 22 12 22c5.523 0 10-4.477 10-10S17.522 2 12 2z" />
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#15803d', fontSize: '0.9rem', lineHeight: 1.2 }}>
                            Mengalihkan ke WhatsApp...
                          </div>
                          <div style={{ color: '#16a34a', fontSize: '0.78rem', opacity: 0.85 }}>
                            {salesPicNama ? `ke ${salesPicNama} (Sales PIC)` : 'Konfirmasi pembayaran otomatis'}
                          </div>
                        </div>
                      </div>
                      {/* Countdown Badge */}
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: '#16a34a', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1.3rem',
                        boxShadow: '0 0 0 4px rgba(22,163,74,0.2)',
                        flexShrink: 0,
                        transition: 'all 0.3s ease'
                      }}>
                        {waCountdown}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      height: '6px', background: '#bbf7d0', borderRadius: '99px', overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #16a34a, #4ade80)',
                        borderRadius: '99px',
                        width: `${(waCountdown / 3) * 100}%`,
                        transition: 'width 1s linear'
                      }} />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
                      <button
                        onClick={handleKonfirmasiWA}
                        style={{
                          flex: 1, padding: '0.5rem', background: '#16a34a', color: 'white',
                          border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        Buka Sekarang
                      </button>
                      <button
                        onClick={() => setWaCountdown(null)}
                        style={{
                          padding: '0.5rem 1rem', background: 'transparent', color: '#64748b',
                          border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600,
                          fontSize: '0.82rem', cursor: 'pointer'
                        }}
                      >
                        Lewati
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="midtrans-section" style={{ padding: "2rem", textAlign: "center" }}>
                {/* <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>
                  Metode pembayaran: <strong>{paymentMethod.toUpperCase()}</strong>
                </p> */}
                <button
                  className="btn-primary"
                  onClick={handleLanjutkanPembayaran}
                  disabled={loadingMidtrans}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    background: "#2563eb",
                    color: "white",
                    borderRadius: "12px",
                    fontWeight: "600",
                    cursor: loadingMidtrans ? "not-allowed" : "pointer",
                    opacity: loadingMidtrans ? 0.7 : 1,
                    border: "none"
                  }}
                >
                  {loadingMidtrans ? "Memproses..." : "Lanjutkan Pembayaran"}
                </button>
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={() => window.location.href = "/customer/dashboard"}>
              Cek Status Pesanan di Dashboard
            </button>

            {/* Tombol WA Konfirmasi - hanya tampil jika bank transfer */}
            {(paymentMethod === "manual" || !paymentMethod) && (
              <button
                type="button"
                id="btn-konfirmasi-wa-sales"
                onClick={handleKonfirmasiWA}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '1rem 1.5rem',
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(22, 163, 74, 0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(22, 163, 74, 0.35)'; }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                  <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.99.574 3.844 1.568 5.399L2 22l4.759-1.548C8.23 21.406 10.07 22 12 22c5.523 0 10-4.477 10-10S17.522 2 12 2z" />
                </svg>
                <span>
                  Konfirmasi Pembayaran via WhatsApp
                  {salesPicNama && (
                    <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.85, fontWeight: 400 }}>
                      ke {salesPicNama} (Sales PIC)
                    </span>
                  )}
                </span>
                {/* Pulse animation */}
                <span style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.7)',
                  animation: 'pulse-dot 1.5s ease-in-out infinite'
                }} />
              </button>
            )}

            <button type="button" className="btn-text" onClick={handleBantuanWA}>
              <span className="whatsApp-icon"><Icons.WhatsApp /></span>
              Butuh Bantuan? Hubungi WhatsApp
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* --- RESET & VARS --- */
        .saas-payment-page {
          min-height: 100vh;
          background-color: #f8fafc;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #0f172a;
          display: flex;
          justify-content: center;
          padding: 3rem 1rem;
        }

        .saas-container {
          width: 100%;
          max-width: 600px;
        }

        .success-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .success-icon-container {
          margin-bottom: 1.5rem;
          animation: scaleIn 0.5s ease-out;
        }

        @keyframes scaleIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .saas-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.025em;
          margin: 0 0 0.75rem 0;
        }

        .saas-subtitle {
          color: #64748b;
          font-size: 1.05rem;
          line-height: 1.5;
          margin-bottom: 2rem;
          max-width: 480px;
        }

        /* --- CARDS --- */
        .payment-card {
          background: #ffffff;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
          width: 100%;
          overflow: hidden;
          margin-bottom: 2rem;
          text-align: left;
        }

        /* --- AMOUNT SECTION --- */
        .amount-section {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          color: #ffffff;
          padding: 2.5rem 2rem;
          text-align: center;
        }
        
        .amount-label {
          display: block;
          font-size: 0.95rem;
          opacity: 0.8;
          font-weight: 500;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .amount-value-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 1rem;
        }

        .amount-value {
          font-size: 3rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1;
        }

        .currency {
          font-size: 1.5rem;
          opacity: 0.7;
          margin-right: 6px;
          font-weight: 500;
          vertical-align: top;
        }

        .icon-btn-large {
          background: rgba(255, 255, 255, 0.15);
          border: none;
          cursor: pointer;
          color: #ffffff;
          padding: 8px;
          display: inline-flex;
          border-radius: 8px;
          transition: background 0.2s;
        }
        .icon-btn-large:hover { background: rgba(255, 255, 255, 0.3); }

        .order-ref {
          font-size: 0.9rem;
          opacity: 0.7;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.1);
        }

        /* --- BANK SECTION --- */
        .bank-section {
          padding: 2rem;
          background: #ffffff;
          border-bottom: 1px solid #f1f5f9;
        }

        .secure-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .secure-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          color: #10b981;
          font-weight: 600;
          background: #ecfdf5;
          padding: 6px 10px;
          border-radius: 6px;
        }
        
        .bank-account-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .bank-logo-area {
          width: 64px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-radius: 8px;
          padding: 4px;
          border: 1px solid #e2e8f0;
        }

        .bank-logo-img {
          max-width: 100%;
          max-height: 100%;
        }

        .bank-info-area {
          flex: 1;
        }

        .bank-account-name {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 4px;
        }

        .bank-account-number-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .bank-account-number {
          font-family: 'Courier New', monospace;
          font-weight: 700;
          font-size: 1.25rem;
          color: #0f172a;
          letter-spacing: 0.05em;
        }

        .copy-btn-text {
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .copy-btn-text:hover { background: #e2e8f0; color: #0f172a; }

        /* --- INSTRUCTIONS --- */
        .instructions-area {
          padding: 2rem;
          background: #fafafa;
        }

        .instruction-step {
          display: flex;
          gap: 16px;
          margin-bottom: 1.25rem;
        }
        .instruction-step:last-child {
          margin-bottom: 0;
        }

        .step-num {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: #e2e8f0;
          color: #475569;
          font-weight: 700;
          font-size: 0.85rem;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .instruction-step p {
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0;
          padding-top: 2px;
        }

        /* --- BUTTONS --- */
        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }

        .btn-secondary {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          display: block;
          text-align: center;
          width: 100%;
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .btn-secondary:hover {
          background: #f8fafc;
          border-color: #94a3b8;
          transform: translateY(-1px);
        }
        
        .btn-text {
          background: none;
          border: none;
          color: #16a34a;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.5rem;
          transition: opacity 0.2s;
        }
        .btn-text:hover { opacity: 0.8; }
        
        /* Mobile Adjustments */
        @media (max-width: 480px) {
          .amount-value { font-size: 2.25rem; }
          .bank-account-number-wrapper { flex-direction: column; align-items: flex-start; gap: 10px; }
          .bank-account-number { font-size: 1.1rem; }
        }

        /* Pulse dot animation for WA button */
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: translateY(-50%) scale(1); }
          50% { opacity: 0.4; transform: translateY(-50%) scale(1.4); }
        }

        /* WA ping animation for countdown icon */
        @keyframes wa-ping {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.5); }
          50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
        }
      `}</style>
    </div>
  );
}

// ✅ Wrap dengan Suspense untuk useSearchParams (Next.js requirement)
export default function BankTransferPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: '#64748b' }}>
        Loading Payment...
      </div>
    }>
      <BankTransferPageContent />
    </Suspense>
  );
}
