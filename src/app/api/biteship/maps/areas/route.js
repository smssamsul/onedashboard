import { NextResponse } from "next/server";
import { biteshipFetch } from "@/lib/biteship-server";

/**
 * GET /api/biteship/maps/areas?input=...
 * Proxy ke Biteship Maps API (search area).
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const input = (searchParams.get("input") || "").trim();
    if (!input || input.length < 2) {
      return NextResponse.json(
        { success: false, message: "Parameter input wajib (min 2 karakter)" },
        { status: 400 }
      );
    }

    const type = (searchParams.get("type") || "single").trim();
    const q = encodeURIComponent(input);
    const path = `/v1/maps/areas?countries=ID&input=${q}&type=${encodeURIComponent(type)}`;

    const { ok, status, data } = await biteshipFetch(path, { method: "GET" });
    return NextResponse.json(data, { status: ok ? 200 : status });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e.message || "Gagal memanggil Biteship" },
      { status: 500 }
    );
  }
}
