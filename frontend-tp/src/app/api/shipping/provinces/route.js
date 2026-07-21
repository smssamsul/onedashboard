import { NextResponse } from "next/server";

/**
 * Endpoint: GET /api/shipping/provinces
 *
 * Sumber wilayah: wilayah.id (static JSON, tanpa API key).
 * @see https://wilayah.id/
 *
 * Response normalized untuk dropdown:
 * [{ id: "11", name: "ACEH" }, ...]
 */
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS });
}

export async function GET() {
  try {
    const url = "https://wilayah.id/api/provinces.json";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    const rows = Array.isArray(json?.data) ? json.data : [];

    const data = rows
      .map((x) => ({ id: String(x.code || ""), name: String(x.name || "") }))
      .filter((x) => x.id && x.name);

    return NextResponse.json(
      { success: true, message: "Berhasil mengambil data provinsi", data },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error("[SHIPPING_PROVINCES]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan", data: [] },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  }
}
