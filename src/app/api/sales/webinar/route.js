import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function POST(request) {
  try {
    const body = await request.json();

    const produk = Number(body.produk);
    const topic = body.topic ? String(body.topic).trim() : "";
    const start_time = body.start_time ? String(body.start_time).trim() : "";
    const duration = Number(body.duration) || 60;
    const waiting_room = Boolean(body.waiting_room);
    const host_video = Boolean(body.host_video);
    const participant_video = Boolean(body.participant_video);
    const mute_upon_entry = Boolean(body.mute_upon_entry);
    const join_before_host = Boolean(body.join_before_host);

    if (!produk || Number.isNaN(produk)) {
      return NextResponse.json(
        { success: false, message: "ID produk tidak valid" },
        { status: 400 }
      );
    }
    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Topic webinar wajib diisi" },
        { status: 400 }
      );
    }
    if (!start_time) {
      return NextResponse.json(
        { success: false, message: "Start time wajib diisi" },
        { status: 400 }
      );
    }

    const payload = {
      produk,
      topic,
      start_time,
      duration,
      waiting_room,
      host_video,
      participant_video,
      mute_upon_entry,
      join_before_host,
    };

    // Get authorization token from request
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    console.log("🔍 [WEBINAR POST] Creating webinar with payload:", payload);
    console.log("🔍 [WEBINAR POST] Backend URL:", `${BACKEND_URL}/api/sales/webinar`);

    const res = await fetch(`${BACKEND_URL}/api/sales/webinar`, {
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
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal membuat link Zoom",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("❌ [WEBINAR POST] API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke server webinar",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

