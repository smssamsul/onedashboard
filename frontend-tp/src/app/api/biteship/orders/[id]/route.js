import { NextResponse } from "next/server";
import { biteshipFetch } from "@/lib/biteship-server";

/**
 * GET /api/biteship/orders/:id
 * Ambil detail order Biteship (termasuk status & info kurir).
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Order id wajib" }, { status: 400 });
    }

    const { ok, status, data } = await biteshipFetch(`/v1/orders/${encodeURIComponent(id)}`, {
      method: "GET",
    });
    return NextResponse.json(data, { status: ok ? 200 : status });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e.message || "Gagal mengambil order Biteship" },
      { status: 500 }
    );
  }
}
