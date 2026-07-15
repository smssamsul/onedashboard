import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function POST(request) {
  try {
    const body = await request.json();
    const id_produk = Number(body.id_produk);
    const link = body.link ? String(body.link).trim() : "";

    if (!id_produk || Number.isNaN(id_produk)) {
      return NextResponse.json(
        { success: false, message: "ID produk tidak valid" },
        { status: 400 }
      );
    }
    if (!link) {
      return NextResponse.json(
        { success: false, message: "Link wajib diisi" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const res = await fetch(`${BACKEND_URL}/api/sales/zoom-record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id_produk, link }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal menyimpan link record zoom",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke server",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

