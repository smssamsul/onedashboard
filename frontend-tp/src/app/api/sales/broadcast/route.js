import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// GET: List broadcasts
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    const response = await fetch(`${BACKEND_URL}/api/sales/broadcast`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid JSON response" }, { status: 500 });
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [BROADCAST-GET] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Create new broadcast
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();

    // Validate required fields
    if (!body.nama || !body.pesan) {
      return NextResponse.json(
        { success: false, message: "Nama dan pesan wajib diisi" },
        { status: 400 }
      );
    }

    // Final validation: jika tipe excel, excel_data harus ada
    if (body.target?.tipe === "excel") {
      if (!body.target.excel_data || body.target.excel_data.length === 0) {
        return NextResponse.json(
          { success: false, message: "Upload file Excel terlebih dahulu" },
          { status: 400 }
        );
      }
    }

    // Teruskan body apa adanya - frontend (normalizeBroadcastPayload) sudah
    // menormalisasi seluruh payload termasuk target. JANGAN susun ulang
    // `target` field-by-field di sini seperti sebelumnya: whitelist manual itu
    // pernah ketinggalan sender_sales_id (dan status_target/exclude_alumni/
    // tanggal_dari/tanggal_sampai/pengaturan pacing) sehingga field itu selalu
    // hilang sebelum sampai ke backend, walau sudah benar dipilih di form -
    // insiden broadcast Excel gagal terus 2026-09-29.
    const response = await fetch(`${BACKEND_URL}/api/sales/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid JSON response from backend" }, { status: 500 });
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [BROADCAST-POST] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
