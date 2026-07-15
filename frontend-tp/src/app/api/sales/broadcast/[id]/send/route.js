import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// POST: Send broadcast by ID
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "Broadcast ID is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    console.log(`📤 [BROADCAST-SEND] Sending broadcast: ${id}`);

    const response = await fetch(`${BACKEND_URL}/api/sales/broadcast/${id}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    console.log(`📥 [BROADCAST-SEND] Response status: ${response.status}`);
    console.log(`📥 [BROADCAST-SEND] Response text:`, text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid JSON response from backend" }, { status: 500 });
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [BROADCAST-SEND] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
