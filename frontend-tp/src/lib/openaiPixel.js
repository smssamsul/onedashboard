"use client";

/**
 * Pixel iklan ChatGPT (OpenAI Ads Measurement Pixel).
 * Docs: https://developers.openai.com/ads/measurement-pixel
 *
 * Pixel ID-nya diatur di menu "Pixel ChatGPT" (/sales/setting/pixel-chatgpt)
 * dan dikirim backend sebagai `openai_pixel_ids` di data produk / order publik.
 *
 * Tiap event dikirim 2 jalur dengan event_id yang sama (supaya di-dedup
 * OpenAI): pixel browser (oaiq) + Conversions API lewat backend
 * (POST /api/openai-pixel/event), yang sekaligus mencatat ke Log Pixel.
 */

const SDK_URL = "https://bzrcdn.openai.com/sdk/oaiq.min.js";

/**
 * OpenAI minta amount integer dalam satuan minor mata uang (IDR = x100).
 * Harus sama dengan OpenaiConversionService::AMOUNT_MULTIPLIER di backend.
 */
export const AMOUNT_MULTIPLIER = 100;

let initializedPixelId = null;

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.$?*|{}()[\]\\/+^]/g, "\\$&") + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Pasang SDK & init pixel. SDK OpenAI hanya didokumentasikan untuk satu
 * pixel per halaman, jadi yang di-init di browser cuma pixel pertama;
 * pixel lain (kalau ada) tetap menerima event lewat Conversions API.
 */
export function initOpenAiPixel(pixelIds) {
  if (typeof window === "undefined") return false;
  const ids = (pixelIds || []).filter(Boolean);
  if (ids.length === 0) return false;
  if (initializedPixelId) return true;

  try {
    (function (w, d, s, u) {
      if (w.oaiq) return;
      const q = function () {
        q.q.push(arguments);
      };
      q.q = [];
      w.oaiq = q;
      const js = d.createElement(s);
      js.async = true;
      js.src = u;
      const f = d.getElementsByTagName(s)[0];
      f.parentNode.insertBefore(js, f);
    })(window, document, "script", SDK_URL);

    window.oaiq("init", { pixelId: String(ids[0]) });
    initializedPixelId = String(ids[0]);
    return true;
  } catch (e) {
    console.error("[CHATGPT PIXEL] Gagal init:", e);
    return false;
  }
}

/**
 * Kirim satu event ke pixel browser + Conversions API (backend).
 *
 * @param {string[]} pixelIds  openai_pixel_ids dari data produk/order
 * @param {string} eventType   page_viewed | contents_viewed | checkout_started | lead_created | order_created
 * @param {object} opts
 * @param {number} opts.produkId
 * @param {number} [opts.orderId]    wajib untuk order_created
 * @param {string} [opts.eventId]    default acak; order_created selalu "order-{orderId}"
 * @param {string} [opts.nama]       nama produk
 * @param {number} [opts.nilai]      nilai dalam Rupiah (untuk checkout_started / order_created)
 */
export function trackOpenAiEvent(pixelIds, eventType, opts = {}) {
  if (typeof window === "undefined") return;
  const ids = (pixelIds || []).filter(Boolean);
  if (ids.length === 0 || !opts.produkId) return;

  const eventId =
    eventType === "order_created" && opts.orderId
      ? `order-${opts.orderId}`
      : opts.eventId || `${eventType}-${opts.produkId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const contents = [
    { id: String(opts.produkId), name: opts.nama || "Produk", content_type: "product", quantity: 1 },
  ];
  let data;
  if (eventType === "lead_created") {
    data = { type: "customer_action" };
  } else if (eventType === "page_viewed") {
    data = { type: "contents", contents };
  } else {
    const nilai = Number(opts.nilai) || 0;
    data = { type: "contents", contents };
    if (nilai > 0) {
      data.amount = Math.round(nilai * AMOUNT_MULTIPLIER);
      data.currency = "IDR";
    }
  }

  let browserOk = false;
  if (initOpenAiPixel(ids)) {
    try {
      window.oaiq("measure", eventType, data, { event_id: eventId });
      browserOk = true;
    } catch (e) {
      console.error("[CHATGPT PIXEL] Gagal measure:", eventType, e);
    }
  }

  // Server-side (Conversions API) untuk semua pixel yang berlaku + catat di Log Pixel.
  // oppref: dari URL iklan (pixel menyimpannya di cookie __oppref); obref: id browser.
  const oppref = new URLSearchParams(window.location.search).get("oppref") || readCookie("__oppref");
  const obref = readCookie("__obref");
  ids.forEach((pixelId) => {
    fetch("/api/openai-pixel/event", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      keepalive: true,
      body: JSON.stringify({
        pixel_id: pixelId,
        event_type: eventType,
        event_id: eventId,
        produk_id: opts.produkId,
        order_id: opts.orderId || null,
        oppref: oppref || null,
        obref: obref || null,
        source_url: window.location.href.slice(0, 2000),
        browser_ok: browserOk && String(pixelId) === initializedPixelId,
      }),
    }).catch(() => {});
  });
}
