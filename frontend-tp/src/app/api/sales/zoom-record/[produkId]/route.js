import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

export async function GET(request, { params }) {
  try {
    const { produkId } = await params;
    const id = Number(produkId);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, message: "ID produk tidak valid" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const res = await fetch(`${BACKEND_URL}/api/sales/zoom-record/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // 404 dianggap kosong
      if (res.status === 404) {
        return NextResponse.json(
          { success: true, message: "Belum ada record untuk produk ini", data: [] },
          { status: 200, headers: corsHeaders }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil data record zoom",
          error: data?.error || data,
        },
        { status: res.status, headers: corsHeaders }
      );
    }

    return NextResponse.json(data, { status: res.status, headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan" },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

