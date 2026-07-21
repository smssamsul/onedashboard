import { NextResponse } from "next/server";

/**
 * Endpoint: GET /api/shipping/districts?city_id=xxxx
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
    const cityId = (searchParams.get("city_id") || "").trim();

    if (!cityId) {
      return NextResponse.json(
        { success: false, message: "city_id wajib diisi", data: [] },
        { status: 200, headers: RESPONSE_HEADERS }
      );
    }

    const url = `https://wilayah.id/api/districts/${encodeURIComponent(cityId)}.json`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));
    const rows = Array.isArray(json?.data) ? json.data : [];

    // Normalisasi agar kompatibel dengan UI lama (district_id).
    const data = rows
      .map((x) => {
        const code = String(x.code || "");
        return {
          id: code,
          district_id: code,
          name: String(x.name || ""),
          city_id: cityId,
        };
      })
      .filter((x) => x.id && x.name);

    return NextResponse.json(
      { success: true, message: "Berhasil mengambil data kecamatan", data },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error("[SHIPPING_DISTRICTS]", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan", data: [] },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  }
}
