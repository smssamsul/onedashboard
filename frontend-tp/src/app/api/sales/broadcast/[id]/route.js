import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// DELETE: Delete broadcast by ID
export async function DELETE(request, { params }) {
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

    // Hard delete dengan force=true agar benar-benar dihapus, bukan hanya ubah status
    const deleteUrl = `${BACKEND_URL}/api/sales/broadcast/${id}?force=true`;

    console.log(`🗑️ [BROADCAST-DELETE] Hard deleting broadcast: ${id}`);
    console.log(`🗑️ [BROADCAST-DELETE] Delete URL: ${deleteUrl}`);

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    console.log(`📥 [BROADCAST-DELETE] Response status: ${response.status}`);
    console.log(`📥 [BROADCAST-DELETE] Response text:`, text);

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return NextResponse.json({ success: false, message: "Invalid JSON response from backend" }, { status: 500 });
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [BROADCAST-DELETE] Error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
