import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

// GET handler - untuk mendapatkan webinar berdasarkan ID produk
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID produk tidak ditemukan" },
        { status: 400, headers: corsHeaders }
      );
    }

    const produkId = Number(id);
    if (Number.isNaN(produkId)) {
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

    console.log("🔍 [WEBINAR GET] Fetching webinar for product:", produkId);
    console.log("🔍 [WEBINAR GET] Backend URL:", `${BACKEND_URL}/api/sales/webinar/${produkId}`);

    const res = await fetch(`${BACKEND_URL}/api/sales/webinar/${produkId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("🔍 [WEBINAR GET] Backend response status:", res.status);

    const data = await res.json().catch((err) => {
      console.error("❌ [WEBINAR GET] JSON parse error:", err);
      return {};
    });

    console.log("🔍 [WEBINAR GET] Backend response data:", data);

    if (!res.ok) {
      // Jika 404, berarti belum ada webinar untuk produk ini (bukan error)
      if (res.status === 404) {
        return NextResponse.json(
          {
            success: false,
            message: "Belum ada webinar untuk produk ini",
            data: [],
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil data webinar",
          error: data?.error || data,
        },
        { status: res.status, headers: corsHeaders }
      );
    }

    return NextResponse.json(data, { status: res.status, headers: corsHeaders });
  } catch (error) {
    console.error("❌ [WEBINAR GET] API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke server webinar",
        error: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST handler - untuk update webinar berdasarkan ID webinar
// Menggunakan POST karena backend tidak mendukung PUT method
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "ID webinar tidak ditemukan" },
        { status: 400, headers: corsHeaders }
      );
    }

    const webinarId = Number(id);
    if (Number.isNaN(webinarId)) {
      return NextResponse.json(
        { success: false, message: "ID webinar tidak valid" },
        { status: 400, headers: corsHeaders }
      );
    }

    const body = await request.json();

    const topic = body.topic ? String(body.topic).trim() : "";
    const start_time = body.start_time ? String(body.start_time).trim() : "";
    const duration = Number(body.duration) || 60;
    const waiting_room = Boolean(body.waiting_room);
    const host_video = Boolean(body.host_video);
    const participant_video = Boolean(body.participant_video);
    const mute_upon_entry = Boolean(body.mute_upon_entry);
    const join_before_host = Boolean(body.join_before_host);

    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Topic webinar wajib diisi" },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!start_time) {
      return NextResponse.json(
        { success: false, message: "Start time wajib diisi" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Payload sesuai dokumentasi: semua field boolean dan format yang benar
    const payload = {
      topic: topic,
      start_time: start_time, // Format: "2024-12-25 14:00:00"
      duration: duration, // dalam menit (integer)
      waiting_room: waiting_room, // Boolean
      host_video: host_video, // Boolean
      participant_video: participant_video, // Boolean
      mute_upon_entry: mute_upon_entry, // Boolean
      join_before_host: join_before_host, // Boolean
    };
    
    // Validasi payload sesuai dokumentasi
    console.log("🔍 [WEBINAR POST] Validated payload:", payload);

    // Get authorization token from request
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    console.log("🔍 [WEBINAR POST] ========== UPDATE WEBINAR ==========");
    console.log("🔍 [WEBINAR POST] Webinar ID:", webinarId);
    console.log("🔍 [WEBINAR POST] Backend URL:", `${BACKEND_URL}/api/sales/webinar/${webinarId}`);
    console.log("🔍 [WEBINAR POST] Payload:", JSON.stringify(payload, null, 2));
    console.log("🔍 [WEBINAR POST] Request method: POST (update)");

    // Menggunakan POST karena backend tidak mendukung PUT method
    const res = await fetch(`${BACKEND_URL}/api/sales/webinar/${webinarId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    console.log("🔍 [WEBINAR POST] Backend response status:", res.status);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Handle specific error: MethodNotAllowedHttpException
      const errorMessage = data?.message || data?.error || "Gagal mengupdate link Zoom";
      
      // Error handling untuk berbagai jenis error
      console.error("❌ [WEBINAR POST] Backend error:", errorMessage);
      
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          error: data?.error || data,
        },
        { status: res.status, headers: corsHeaders }
      );
    }

    console.log("✅ [WEBINAR POST] Success - Response:", data);
    return NextResponse.json(data, { status: res.status, headers: corsHeaders });
  } catch (error) {
    console.error("❌ [WEBINAR POST] API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke server webinar",
        error: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handler untuk update webinar - menggunakan POST dengan _method=PUT di body jika diperlukan
// Atau langsung POST jika backend mendukung POST untuk update
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

