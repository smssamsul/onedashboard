import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const contentType = request.headers.get("content-type") || "";

    console.log(`🔍 [ORDER-KONFIRMASI] Confirming payment for order: ${id}`);

    let response;

    if (contentType.includes("multipart/form-data")) {
      // Handle FormData (file upload)
      const formData = await request.formData();
      
      // Create new FormData to forward
      const forwardFormData = new FormData();
      
      // Log and forward all fields - PASTIKAN SEMUA FIELD DI-FORWARD
      console.log(`🔍 [ORDER-KONFIRMASI] ========== MENERIMA FORM DATA ==========`);
      const allFields = [];
      for (const [key, value] of formData.entries()) {
        allFields.push({ key, value, type: value instanceof File ? 'File' : typeof value });
        if (value instanceof File && value.size > 0) {
          console.log(`  📎 ${key}: [File] ${value.name} (${value.size} bytes)`);
          // Forward file
          const arrayBuffer = await value.arrayBuffer();
          const file = new File([arrayBuffer], value.name, { type: value.type });
          forwardFormData.append(key, file);
          console.log(`  ✅ ${key} di-forward sebagai File`);
        } else if (typeof value === "string") {
          console.log(`  📝 ${key}: ${value}`);
          forwardFormData.append(key, value);
          console.log(`  ✅ ${key} di-forward sebagai String`);
        } else {
          // Handle other types (number, etc)
          console.log(`  📝 ${key}: ${String(value)}`);
          forwardFormData.append(key, String(value));
          console.log(`  ✅ ${key} di-forward sebagai String`);
        }
      }
      console.log(`🔍 [ORDER-KONFIRMASI] Total fields diterima: ${allFields.length}`);
      console.log(`🔍 [ORDER-KONFIRMASI] =========================================`);
      
      // Verify waktu_pembayaran is included dan pastikan di-forward
      const waktuPembayaranValue = formData.get("waktu_pembayaran");
      const metodePembayaranValue = formData.get("metode_pembayaran");
      const metodeBayarValue = formData.get("metode_bayar"); // Backend mungkin mengharapkan metode_bayar
      const amountValue = formData.get("amount");
      const buktiPembayaranValue = formData.get("bukti_pembayaran");
      
      console.log(`🔍 [ORDER-KONFIRMASI] ========== VERIFIKASI DATA ==========`);
      console.log(`🔍 [ORDER-KONFIRMASI] waktu_pembayaran dari FormData:`, waktuPembayaranValue);
      console.log(`🔍 [ORDER-KONFIRMASI] metode_pembayaran dari FormData:`, metodePembayaranValue);
      console.log(`🔍 [ORDER-KONFIRMASI] metode_bayar dari FormData:`, metodeBayarValue);
      console.log(`🔍 [ORDER-KONFIRMASI] amount dari FormData:`, amountValue);
      console.log(`🔍 [ORDER-KONFIRMASI] bukti_pembayaran dari FormData:`, buktiPembayaranValue instanceof File ? `[File] ${buktiPembayaranValue.name}` : buktiPembayaranValue);
      
      if (waktuPembayaranValue) {
        console.log(`✅ [ORDER-KONFIRMASI] waktu_pembayaran ditemukan: ${waktuPembayaranValue}`);
        // Pastikan waktu_pembayaran di-forward dengan benar
        if (!forwardFormData.has("waktu_pembayaran")) {
          console.log(`⚠️ [ORDER-KONFIRMASI] waktu_pembayaran tidak ada di forwardFormData, menambahkan...`);
          forwardFormData.append("waktu_pembayaran", String(waktuPembayaranValue));
        } else {
          console.log(`✅ [ORDER-KONFIRMASI] waktu_pembayaran sudah ada di forwardFormData`);
        }
      } else {
        console.warn(`❌ [ORDER-KONFIRMASI] waktu_pembayaran TIDAK ditemukan di FormData!`);
      }
      
      // Pastikan semua field penting di-forward
      // Backend mengharapkan metode_bayar (bukan metode_pembayaran) sesuai dengan database column
      const metodeValue = metodeBayarValue || metodePembayaranValue;
      if (metodeValue) {
        // Kirim kedua field untuk kompatibilitas - backend mungkin mengharapkan metode_bayar
        if (!forwardFormData.has("metode_bayar")) {
          forwardFormData.append("metode_bayar", String(metodeValue));
          console.log(`✅ [ORDER-KONFIRMASI] metode_bayar ditambahkan: ${metodeValue}`);
        }
        if (!forwardFormData.has("metode_pembayaran")) {
          forwardFormData.append("metode_pembayaran", String(metodeValue));
          console.log(`✅ [ORDER-KONFIRMASI] metode_pembayaran ditambahkan: ${metodeValue}`);
        }
      }
      if (amountValue && !forwardFormData.has("amount")) {
        forwardFormData.append("amount", String(amountValue));
      }
      
      // Log semua field yang akan di-forward untuk verifikasi
      console.log(`🔍 [ORDER-KONFIRMASI] ========== FORWARD DATA KE BACKEND ==========`);
      for (const [key, value] of forwardFormData.entries()) {
        if (value instanceof File) {
          console.log(`  ✅ ${key}: [File] ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ✅ ${key}: ${value}`);
        }
      }
      console.log(`🔍 [ORDER-KONFIRMASI] ==============================================`);

      // Forward to backend
      response = await fetch(`${BACKEND_URL}/api/sales/order-konfirmasi/${id}`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: forwardFormData,
      });
    } else {
      // Handle JSON
      const body = await request.json();
      
      console.log(`🔍 [ORDER-KONFIRMASI] JSON body:`, body);

      response = await fetch(`${BACKEND_URL}/api/sales/order-konfirmasi/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    }

    console.log(`🔍 [ORDER-KONFIRMASI] Backend response status:`, response.status);

    // Handle response
    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error(`❌ [ORDER-KONFIRMASI] Non-JSON response:`, responseText.substring(0, 500));
      return NextResponse.json(
        {
          success: false,
          message: "Backend error: Response bukan JSON",
          raw_response: responseText.substring(0, 200),
        },
        { status: response.status || 500 }
      );
    }

    console.log(`🔍 [ORDER-KONFIRMASI] Backend response:`, data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal konfirmasi pembayaran",
          error: data?.error || data,
        },
        { status: response.status }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: data?.message || "Konfirmasi Pembayaran Sukses",
      data: data?.data || data,
    });
  } catch (error) {
    console.error(`❌ [ORDER-KONFIRMASI] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal konfirmasi pembayaran",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}

