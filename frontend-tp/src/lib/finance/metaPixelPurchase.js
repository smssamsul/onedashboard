/**
 * Meta Pixel Purchase setelah approve finance — load fbevents.js jika belum ada
 * (dashboard finance tidak memuat pixel seperti halaman produk).
 */

function normalizeFbPixelIds(fbPixel) {
  if (!fbPixel) return [];
  const raw = Array.isArray(fbPixel) ? fbPixel : [];
  return raw
    .map((x) => {
      if (x == null) return null;
      if (typeof x === "object") {
        return x.id ?? x.pixel_id ?? x.value ?? null;
      }
      return x;
    })
    .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
    .map((v) => String(v).trim());
}

function productEnablesPurchaseEvent(eventFbPixel) {
  if (!eventFbPixel) return false;
  const list = Array.isArray(eventFbPixel) ? eventFbPixel : [];
  return list.some((item) => {
    const name = item?.event ?? item?.name ?? item;
    return String(name).replace(/\s+/g, "") === "Purchase";
  });
}

function loadFbeventsScript(callback) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  
  // Inisialisasi antrean fbq standar FB Pixel jika belum ada
  if (!window.fbq) {
    window.fbq = function() {
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = window.fbq;
    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = '2.0';
    window.fbq.queue = [];
  }

  const existing = document.getElementById("fb-pixel-finance-loader");
  if (existing) {
    // fbq sudah dibuat di atas, jadi aman langsung callback
    callback();
    return;
  }
  
  const s = document.createElement("script");
  s.id = "fb-pixel-finance-loader";
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  const first = document.getElementsByTagName("script")[0];
  if (first && first.parentNode) {
    first.parentNode.insertBefore(s, first);
  } else {
    document.head.appendChild(s);
  }
  
  // Panggil callback segera karena fbq sudah berupa antrean (queue)
  callback();
}

/**
 * @param {object} opts
 * @param {object} opts.produk — dari API finance: fb_pixel diisi backend dari landing page → settings
 *   (bukan kolom produk.fb_pixel); event_fb_pixel tetap dari produk (untuk mengaktifkan event Purchase).
 * @param {number} opts.value — nilai purchase (amount disetujui)
 * @param {string} [opts.currency='IDR']
 * @param {string|number} [opts.orderId]
 * @returns {boolean} true jika event Purchase dikirim
 */
export function trackFinanceApprovedPurchase({ produk, value, currency = "IDR", orderId }) {
  if (typeof window === "undefined") return false;

  const pixelIds = normalizeFbPixelIds(produk?.fb_pixel);
  if (!pixelIds.length) {
    console.log("[FB PIXEL Finance] Lewati: tidak ada pixel di pengaturan landing page", produk?.id);
    return false;
  }

  if (!productEnablesPurchaseEvent(produk?.event_fb_pixel)) {
    console.log("[FB PIXEL Finance] Lewati: event Purchase tidak aktif di produk", produk?.id);
    return false;
  }

  const numValue = Number(value);
  const safeValue = Number.isFinite(numValue) ? numValue : 0;

  loadFbeventsScript(() => {
    if (typeof window.fbq !== "function") {
      console.warn("[FB PIXEL Finance] fbq tidak tersedia setelah load script");
      return;
    }
    if (!window.__fbFinancePixelInited) {
      window.__fbFinancePixelInited = new Set();
    }
    pixelIds.forEach((pid) => {
      try {
        if (!window.__fbFinancePixelInited.has(pid)) {
          window.fbq("init", pid);
          window.__fbFinancePixelInited.add(pid);
        }
      } catch (e) {
        console.error("[FB PIXEL Finance] init gagal", pid, e);
      }
    });

    const params = {
      content_ids: produk?.id != null ? [String(produk.id)] : [],
      content_type: "product",
      content_name: produk?.nama || "Product",
      content_category: produk?.kategori_rel?.nama || undefined,
      value: safeValue,
      currency,
    };
    if (orderId != null && orderId !== "") {
      params.order_id = String(orderId);
    }

    try {
      window.fbq("track", "Purchase", params);
      console.log("[FB PIXEL Finance] Purchase terkirim", params);
    } catch (e) {
      console.error("[FB PIXEL Finance] track Purchase gagal", e);
    }
  });

  return true;
}
