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

    console.log("📤 [BROADCAST-POST] Request body from frontend:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.nama || !body.pesan) {
      return NextResponse.json(
        { success: false, message: "Nama dan pesan wajib diisi" },
        { status: 400 }
      );
    }

    // Validate produk is present and not empty — ONLY for filter type, skip for excel
    const isExcelType = body.target?.tipe === "excel" || body.target?.excel_data;
    if (!isExcelType) {
      if (!body.target?.produk || !Array.isArray(body.target.produk) || body.target.produk.length === 0) {
        // produk kosong berarti semua produk (no filter), ini valid
        // validasi ini hanya perlu jika backend membutuhkan produk wajib
      }
    }

    // Prepare request body for backend
    // Frontend sudah mengirim payload yang sudah dinormalisasi, jadi kita hanya perlu memastikan format benar
    const requestBody = {
      nama: String(body.nama).trim(),
      pesan: String(body.pesan).trim(),
      langsung_kirim: Boolean(body.langsung_kirim),
      tanggal_kirim: body.tanggal_kirim || null,
      target: {
        // Produk: array of integers (kosong = semua produk)
        produk: Array.isArray(body.target.produk)
          ? body.target.produk.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)
          : [],
        // Sertakan tipe dan excel_data jika ada
        ...(body.target?.tipe ? { tipe: body.target.tipe } : {}),
        ...(body.target?.excel_data ? { excel_data: body.target.excel_data } : {}),
      },
    };

    // Only include status_order if it exists and is not empty (optional - string)
    // Use explicit check to handle edge cases
    const so = body.target?.status_order;
    if (so !== null && so !== undefined && so !== "") {
      let statusValue = null;
      
      if (typeof so === "string" && so.trim()) {
        statusValue = so.trim();
      } else if (Array.isArray(so) && so.length > 0) {
        // If array provided, take first element
        statusValue = String(so[0]).trim();
      } else {
        // Handle other types - convert to string
        statusValue = String(so).trim();
      }
      
      // Only include if we have a valid non-empty string
      if (statusValue !== null && statusValue !== undefined && statusValue !== "") {
        requestBody.target.status_order = statusValue;
      }
      // If empty string after trim, don't include it
    }

    // Only include status_pembayaran if it exists and is not empty (optional)
    // Convert 0 to null (Unpaid uses null, not 0)
    const sp = body.target?.status_pembayaran;
    if (sp !== null && sp !== undefined && sp !== "") {
      let statusValue = null;
      
      // Convert 0 or "0" to null (Unpaid)
      if (sp === 0 || sp === "0") {
        statusValue = null;
      } else if (typeof sp === "string" && sp.trim()) {
        statusValue = sp.trim();
      } else if (Array.isArray(sp) && sp.length > 0) {
        // If array provided, take first element
        const firstVal = sp[0];
        if (firstVal === 0 || firstVal === "0") {
          statusValue = null;
        } else {
          statusValue = String(firstVal).trim();
        }
      } else {
        // Handle other types - convert to string
        statusValue = String(sp).trim();
      }
      
      // Include null for Unpaid, or other valid non-empty string values
      if (statusValue === null) {
        requestBody.target.status_pembayaran = null;
      } else if (statusValue !== undefined && statusValue !== "") {
        requestBody.target.status_pembayaran = statusValue;
      }
      // If empty string or undefined, don't include it
    }

    // Final validation: jika tipe excel, excel_data harus ada
    if (requestBody.target?.tipe === "excel") {
      if (!requestBody.target.excel_data || requestBody.target.excel_data.length === 0) {
        return NextResponse.json(
          { success: false, message: "Upload file Excel terlebih dahulu" },
          { status: 400 }
        );
      }
    }

    console.log("📤 [BROADCAST-POST] Final request body to backend:", JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${BACKEND_URL}/api/sales/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    console.log("📥 [BROADCAST-POST] Response status:", response.status);
    console.log("📥 [BROADCAST-POST] Response text:", text);

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
