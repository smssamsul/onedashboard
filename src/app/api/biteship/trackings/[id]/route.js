import { NextResponse } from "next/server";
import { biteshipFetch } from "@/lib/biteship-server";

/**
 * GET /api/biteship/trackings/:id
 * id = tracking_id dari response order (courier.tracking_id).
 * @see https://biteship.com/en/docs/api/trackings/retrieve
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Tracking id wajib" }, { status: 400 });
    }

    const { ok, status, data } = await biteshipFetch(`/v1/trackings/${encodeURIComponent(id)}`, {
      method: "GET",
    });
    return NextResponse.json(data, { status: ok ? 200 : status });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e.message || "Gagal mengambil tracking" },
      { status: 500 }
    );
  }
}
