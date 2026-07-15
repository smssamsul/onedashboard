import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function DELETE(request, { params }) {
  try {
    const { id, index } = await params;
    
    if (!id || index === undefined) {
      return NextResponse.json(
        { success: false, message: "Product ID dan index testimoni wajib diisi" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    console.log(`[DELETE TESTIMONI] Product ID: ${id}, Index: ${index}`);

    const response = await fetch(`${BACKEND_URL}/api/sales/produk/${id}/testimoni/${index}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    console.log(`[DELETE TESTIMONI] Backend response:`, response.status, data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal menghapus testimoni",
          error: data?.error || data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "Testimoni berhasil dihapus",
      data: data?.data || data,
    });
  } catch (error) {
    console.error("[DELETE TESTIMONI] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menghapus testimoni",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

