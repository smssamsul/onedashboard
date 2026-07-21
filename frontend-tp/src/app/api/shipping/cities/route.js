import { NextResponse } from "next/server";

/**
 * Endpoint: GET /api/shipping/cities?province_id=xx
 *
 * Sumber wilayah: wilayah.id
 * @see https://wilayah.id/
 */
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, must-revalidate",
  "Access-Control-Allow-Origin": "*",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceId = (searchParams.get("province_id") || "").trim();

    if (!provinceId) {
      return NextResponse.json(
        { success: false, message: "province_id wajib diisi", data: [] },
        { status: 200, headers: RESPONSE_HEADERS }
      );
    }

    const url = `https://wilayah.id/api/regencies/${encodeURIComponent(provinceId)}.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    const rows = Array.isArray(json?.data) ? json.data : [];

    const data = rows
      .map((x) => ({
        id: String(x.code || ""),
        name: String(x.name || ""),
        province_id: provinceId,
      }))
      .filter((x) => x.id && x.name);

    return NextResponse.json(
      { success: true, message: "Berhasil mengambil data kabupaten/kota", data },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error("[SHIPPING_CITIES]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan", data: [] },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  }
}
