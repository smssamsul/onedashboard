/**
 * Meta Pixel Purchase saat sales upload bukti pembayaran.
 * Reuse pola loader seperti finance, tapi dipanggil dari area sales.
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
    window.fbq = function () {
      window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments);
    };
    if (!window._fbq) window._fbq = window.fbq;
    window.fbq.push = window.fbq;
    window.fbq.loaded = true;
    window.fbq.version = '2.0';
    window.fbq.queue = [];
  }

  const existing = document.getElementById("fb-pixel-sales-loader");
  if (existing) {
    // fbq sudah dibuat di atas, jadi aman langsung callback
    callback();
    return;
  }

  const s = document.createElement("script");
  s.id = "fb-pixel-sales-loader";
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
 * @param {object} opts.produk - butuh: fb_pixel (array ids dari landing settings) + event_fb_pixel (aktifkan Purchase)
 * @param {number} opts.value
 * @param {string} [opts.currency='IDR']
 * @param {string|number} [opts.orderId]
 * @returns {boolean}
 */
export function trackSalesUploadedPaymentPurchase({ produk, value, currency = "IDR", orderId }) {
  if (typeof window === "undefined") return false;

  const pixelIds = normalizeFbPixelIds(produk?.fb_pixel);
  if (!pixelIds.length) {
    console.log("[FB PIXEL Sales] Lewati: tidak ada pixel di pengaturan landing page", produk?.id);
    return false;
  }

  // if (!productEnablesPurchaseEvent(produk?.event_fb_pixel)) {
  //   console.log("[FB PIXEL Sales] Lewati: event Purchase tidak aktif di produk", produk?.id);
  //   return false;
  // }

  const numValue = Number(value);
  const safeValue = Number.isFinite(numValue) ? numValue : 0;

  loadFbeventsScript(() => {
    if (typeof window.fbq !== "function") {
      console.warn("[FB PIXEL Sales] fbq tidak tersedia setelah load script");
      return;
    }
    if (!window.__fbSalesPixelInited) {
      window.__fbSalesPixelInited = new Set();
    }
    pixelIds.forEach((pid) => {
      try {
        if (!window.__fbSalesPixelInited.has(pid)) {
          window.fbq("init", pid);
          window.__fbSalesPixelInited.add(pid);
        }
      } catch (e) {
        console.error("[FB PIXEL Sales] init gagal", pid, e);
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
      console.log("[FB PIXEL Sales] Purchase terkirim", params);
    } catch (e) {
      console.error("[FB PIXEL Sales] track Purchase gagal", e);
    }
  });

  return true;
}

