/**
 * Server-only helper untuk memanggil Biteship REST API.
 * @see https://biteship.com/id/docs/api
 */

const BITESHIP_BASE = "https://api.biteship.com";

export function getBiteshipApiKey() {
  const key = process.env.BITESHIP_API_KEY?.trim();
  if (!key) {
    throw new Error("BITESHIP_API_KEY belum di-set di environment");
  }
  return key;
}

export function biteshipHeaders(includeJsonContentType = true) {
  const h = {
    authorization: getBiteshipApiKey(),
    accept: "application/json",
  };
  if (includeJsonContentType) {
    h["content-type"] = "application/json";
  }
  return h;
}

/**
 * @param {string} path - contoh: /v1/rates/couriers
 * @param {{ method?: string, body?: object }} options
 */
export async function biteshipFetch(path, options = {}) {
  const { method = "GET", body } = options;
  const url = `${BITESHIP_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const init = {
    method,
    headers: biteshipHeaders(method !== "GET"),
  };
  if (body != null && method !== "GET") {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}
