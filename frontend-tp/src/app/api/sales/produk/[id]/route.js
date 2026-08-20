export const runtime = "nodejs";

import { NextResponse } from "next/server";
import FormData from "form-data";
import axios from "axios";
import { revalidatePath, revalidateTag } from "next/cache";

import { BACKEND_URL } from "@/config/env";

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

// Handle PUT request untuk update produk (sama seperti POST handler tapi dengan PUT method)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
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
    const contentType = request.headers.get("content-type") || "";

    let response;

    // Handle FormData request (sama seperti POST handler)
    if (contentType.includes("multipart/form-data")) {
      // Forward FormData langsung ke backend Laravel
      const incomingFormData = await request.formData();

      // DEBUG: Log incoming FormData
      const incomingEntries = [];
      const incomingJSON = {};

      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          incomingEntries.push({ key, type: "File", name: value.name, size: `${(value.size / 1024).toFixed(2)} KB` });
          incomingJSON[key] = {
            type: "File",
            name: value.name,
            size: `${(value.size / 1024).toFixed(2)} KB`,
            sizeBytes: value.size,
            mimeType: value.type
          };
        } else {
          const str = String(value);
          incomingEntries.push({ key, type: "String", value: str.length > 100 ? str.substring(0, 100) + "..." : str });

          // Try to parse JSON strings for better readability
          try {
            const parsed = JSON.parse(str);
            incomingJSON[key] = parsed;
          } catch {
            incomingJSON[key] = str.length > 200 ? str.substring(0, 200) + "..." : str;
          }
        }
      }
      console.table(incomingEntries);

      // Tampilkan sebagai JSON yang readable

      // Verify kategori exists
      const kategoriValue = incomingFormData.get("kategori");

      if (!kategoriValue || kategoriValue === "" || kategoriValue === "null" || kategoriValue === "undefined") {
        console.error(`[ROUTE_UPDATE_PUT] ❌ KATEGORI TIDAK ADA ATAU INVALID!`);
        return NextResponse.json(
          {
            success: false,
            message: "Kategori wajib diisi",
            errors: { kategori: ["Kategori field is required"] },
            errorFields: ["kategori"],
            debug: {
              kategoriValue: kategoriValue,
              kategoriType: typeof kategoriValue,
              allKeys: Array.from(incomingFormData.keys())
            }
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // ============================
      // SIMPAN REQUEST DATA KE OBJECT DULU (untuk debugging)
      // ============================
      const requestDataToLog = {
        timestamp: new Date().toISOString(),
        productId: id,
        incomingFormData: {}
      };

      // Convert incoming FormData ke object untuk logging
      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          requestDataToLog.incomingFormData[key] = {
            type: "File",
            name: value.name,
            size: value.size,
            sizeKB: `${(value.size / 1024).toFixed(2)} KB`,
            mimeType: value.type
          };
        } else {
          const strValue = String(value);
          try {
            const parsed = JSON.parse(strValue);
            requestDataToLog.incomingFormData[key] = parsed;
          } catch {
            requestDataToLog.incomingFormData[key] = strValue.length > 200 ? strValue.substring(0, 200) + "..." : strValue;
          }
        }
      }


      // Create FormData untuk forward ke backend (menggunakan form-data package)
      const forwardFormData = new FormData();

      let appendedCount = 0;
      const appendedFields = [];

      // CRITICAL: Tambahkan _method=PUT PERTAMA untuk Laravel (Laravel membutuhkan ini untuk PUT dengan FormData)
      // Harus ditambahkan SEBELUM field lain untuk memastikan Laravel memproses sebagai PUT
      forwardFormData.append("_method", "PUT");
      appendedCount++;
      appendedFields.push({ key: "_method", type: "String", value: "PUT" });

      // Forward all entries ke backend - SIMPLE APPROACH
      // IMPORTANT: Collect all entries first to ensure we don't miss any
      const allEntries = [];
      for (const [key, value] of incomingFormData.entries()) {
        allEntries.push({ key, value });
      }


      // Forward all entries in order
      for (const { key, value } of allEntries) {
        if (value instanceof File) {
          // Convert File to Buffer untuk form-data package
          const arrayBuffer = await value.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Append dengan options yang benar
          forwardFormData.append(key, buffer, {
            filename: value.name,
            contentType: value.type || "application/octet-stream",
          });
          appendedCount++;
          appendedFields.push({ key, type: "File", name: value.name, size: buffer.length });
        } else {
          // Forward string values as-is - CRITICAL: Always send, even if empty
          const strValue = String(value);
          forwardFormData.append(key, strValue);
          appendedCount++;
          appendedFields.push({ key, type: "String", value: strValue.length > 50 ? strValue.substring(0, 50) + "..." : strValue });
          // Log critical fields for debugging
          if (['nama', 'kode', 'url', 'kategori', 'harga_asli', 'harga_coret', 'deskripsi', 'video', 'assign'].includes(key)) {
          }
        }
      }


      // CRITICAL: Verify critical fields are in appendedFields
      const hasKode = appendedFields.some(f => f.key === "kode");
      const hasNama = appendedFields.some(f => f.key === "nama");
      const hasKategori = appendedFields.some(f => f.key === "kategori");
      const hasUrl = appendedFields.some(f => f.key === "url");


      if (!hasKode) {
        console.error(`[ROUTE_UPDATE_PUT] ❌ KODE FIELD MISSING IN FORWARD FORMDATA!`);
      }
      if (!hasNama) {
        console.error(`[ROUTE_UPDATE_PUT] ❌ NAMA FIELD MISSING IN FORWARD FORMDATA!`);
      }
      if (!hasKategori) {
        console.error(`[ROUTE_UPDATE_PUT] ❌ KATEGORI FIELD MISSING IN FORWARD FORMDATA!`);
      }

      // Verify data di incomingFormData sebelum forward
      const verifyKategori = incomingFormData.get("kategori");
      const verifyNama = incomingFormData.get("nama");
      const verifyKode = incomingFormData.get("kode");
      const verifyUrl = incomingFormData.get("url");
      const verifyAssign = incomingFormData.get("assign");
      const verifyHeader = incomingFormData.get("header");
      const verifyVideo = incomingFormData.get("video");


      // Parse video untuk logging
      if (verifyVideo) {
        try {
          const videoParsed = JSON.parse(String(verifyVideo));
        } catch (e) {
        }
      }

      if (!verifyKategori || !verifyNama) {
        console.error(`[ROUTE_UPDATE_PUT] ❌ MISSING CRITICAL FIELDS IN INCOMING!`);
        return NextResponse.json(
          {
            success: false,
            message: "Data tidak lengkap",
            errors: {
              kategori: !verifyKategori ? ["Kategori tidak ditemukan"] : [],
              nama: !verifyNama ? ["Nama tidak ditemukan"] : [],
            },
            debug: {
              kategori: verifyKategori ? "OK" : "MISSING",
              nama: verifyNama ? "OK" : "MISSING",
              allKeys: Array.from(incomingFormData.keys())
            }
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // CRITICAL: Verify data di forwardFormData sebelum kirim ke backend
      // Note: form-data package tidak support .get(), jadi kita perlu iterate untuk verify
      let forwardKode = null;
      let forwardNama = null;
      let forwardKategori = null;
      let forwardUrl = null;

      // Iterate through forwardFormData to verify critical fields
      // Note: form-data package tidak punya .entries() yang bisa di-iterate, jadi kita track saat append
      // Tapi kita sudah append semua dari incomingFormData, jadi seharusnya sudah ada
      // Untuk memastikan, kita log semua field yang sudah di-append
      appendedFields.forEach(f => {
        if (f.key === "kode") forwardKode = f.value;
        if (f.key === "nama") forwardNama = f.value;
        if (f.key === "kategori") forwardKategori = f.value;
        if (f.key === "url") forwardUrl = f.value;
      });


      if (!forwardKategori || !forwardNama) {
        console.error(`[ROUTE_UPDATE_PUT] ❌ CRITICAL FIELDS MISSING IN FORWARD FORMDATA!`);
        console.error(`[ROUTE_UPDATE_PUT] This means data will not be sent to backend correctly!`);
      } else {
      }

      // Get headers untuk FormData (PENTING: harus dipanggil sebelum fetch)
      const formDataHeaders = forwardFormData.getHeaders();


      // CRITICAL: Summary of critical fields being sent
      const summaryKodeValue = appendedFields.find(f => f.key === "kode")?.value;
      const summaryNamaValue = appendedFields.find(f => f.key === "nama")?.value;
      const summaryKategoriValue = appendedFields.find(f => f.key === "kategori")?.value;
      const summaryUrlValue = appendedFields.find(f => f.key === "url")?.value;


      // Log video field
      const summaryVideoValue = appendedFields.find(f => f.key === "video")?.value;
      if (summaryVideoValue) {
        try {
          const videoParsed = JSON.parse(String(summaryVideoValue));
        } catch (e) {
        }
      }


      // Forward ke backend Laravel dengan FormData menggunakan axios POST + _method=PUT
      // Laravel membutuhkan POST dengan _method=PUT untuk FormData multipart requests
      try {
        // CRITICAL: Log final FormData before sending
        const criticalFields = ['nama', 'kode', 'url', 'kategori', 'harga_asli', 'harga_coret', 'deskripsi', 'video', 'assign', '_method'];
        for (const field of criticalFields) {
          // form-data package tidak support .get(), jadi kita cek dari appendedFields
          const fieldEntry = appendedFields.find(f => f.key === field);
          if (fieldEntry) {
            const strValue = String(fieldEntry.value || '');
          } else {
          }
        }

        // CRITICAL: Verify _method=PUT is in appendedFields before sending
        const hasMethod = appendedFields.some(f => f.key === "_method" && f.value === "PUT");
        if (!hasMethod) {
          console.error(`[ROUTE_UPDATE_PUT] ❌ CRITICAL: _method=PUT NOT FOUND IN appendedFields!`);
          console.error(`[ROUTE_UPDATE_PUT] Appended fields:`, appendedFields.map(f => `${f.key}=${f.value}`).join(", "));
          // Force append _method=PUT again
          forwardFormData.append("_method", "PUT");
        } else {
        }

        // Forward dengan axios yang lebih kompatibel dengan form-data package
        // SAMA PERSIS dengan route POST, hanya endpoint dan _method yang berbeda

        // Convert form-data ke stream untuk fetch (SAMA dengan route POST)
        const formDataStream = forwardFormData;

        // Get headers - PENTING: jangan override content-type
        const headers = {
          ...formDataHeaders, // Ini sudah include content-type dengan boundary
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Remove content-length jika ada (biar form-data handle sendiri) - SAMA dengan route POST
        delete headers["content-length"];


        // CRITICAL: Log that we're sending _method=PUT

        // CRITICAL: Verify FormData has data before sending

        // Axios lebih kompatibel dengan form-data package (SAMA PERSIS dengan route POST)
        const axiosResponse = await axios.post(
          `${BACKEND_URL}/api/sales/produk/${id}`,
          formDataStream, // form-data package (SAMA dengan route POST)
          {
            headers: {
              ...formDataHeaders,
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        );

        // Convert axios response ke format yang compatible
        response = {
          ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          headers: new Headers(axiosResponse.headers),
          text: async () => JSON.stringify(axiosResponse.data),
          json: async () => axiosResponse.data,
        };


        // Log response data untuk verify apakah backend menerima data dengan benar
        try {
          const responseData = await axiosResponse.data;

          // Compare sent vs received

        } catch (logError) {
          console.error(`[ROUTE_UPDATE_PUT] Error logging response:`, logError);
        }
      } catch (axiosError) {
        console.error(`[ROUTE_UPDATE_PUT] ❌ Axios error:`, axiosError);

        // Handle axios error response
        if (axiosError.response) {
          // Backend responded with error
          response = {
            ok: false,
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            headers: new Headers(axiosError.response.headers),
            json: async () => axiosError.response.data,
            text: async () => JSON.stringify(axiosError.response.data),
          };
        } else if (axiosError.request) {
          // Request sent but no response
          console.error(`[ROUTE_UPDATE_PUT] ❌ No response from backend`);
          return NextResponse.json(
            {
              success: false,
              message: "Tidak ada response dari backend",
              error: axiosError.message,
            },
            { status: 500, headers: corsHeaders }
          );
        } else {
          // Error setting up request
          console.error(`[ROUTE_UPDATE_PUT] ❌ Request setup error:`, axiosError.message);
          throw axiosError;
        }
      }

    } else {
      // Handle JSON request (untuk backward compatibility)
      const reqBody = await request.json();


      // Forward JSON ke backend dengan PUT
      response = await fetch(`${BACKEND_URL}/api/sales/produk/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reqBody),
      });
    }

    // Handle response
    let data;
    try {
      // Jika response sudah punya method json(), gunakan itu
      if (typeof response.json === "function") {
        data = await response.json();
      } else {
        // Fallback: parse dari text
        const responseText = await response.text();
        data = JSON.parse(responseText);
      }

      // Log response untuk debugging

      // Jika success dan ada data, pastikan data adalah array
      if (data?.success && data?.data) {
        // Jika data bukan array, wrap dalam array
        if (!Array.isArray(data.data)) {
          data.data = [data.data];
        }
      }
    } catch (parseError) {
      console.error(`[ROUTE_UPDATE_PUT] ❌ Failed to parse response:`, parseError);
      return NextResponse.json(
        {
          success: false,
          message: "Backend error: Response bukan JSON",
          error: parseError.message,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      // Extract errors dengan detail
      console.error(`[ROUTE_UPDATE_PUT] ========== BACKEND ERROR RESPONSE (ID: ${id}) ==========`);
      console.error(`Status:`, response.status);
      console.error(`Response data:`, JSON.stringify(data, null, 2));

      let extractedErrors = {};
      let extractedErrorFields = [];

      // Method 1: Check data.errors
      if (data?.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0) {
        extractedErrors = data.errors;
        extractedErrorFields = Object.keys(data.errors);
        console.error(`Errors found in data.errors:`, extractedErrors);
      }
      // Method 2: Check data.data.errors
      else if (data?.data?.errors && typeof data.data.errors === "object") {
        extractedErrors = data.data.errors;
        extractedErrorFields = Object.keys(data.data.errors);
        console.error(`Errors found in data.data.errors:`, extractedErrors);
      }
      // Method 3: Parse from message
      else if (data?.message) {
        console.error(`Parsing errors from message:`, data.message);
        const message = data.message;

        // Extract field names from message
        const fieldPatterns = [
          /The\s+(\w+)\s+field\s+is\s+required/gi,
          /(\w+)\s+field\s+is\s+required/gi,
          /(\w+)\s+is\s+required/gi,
        ];

        for (const pattern of fieldPatterns) {
          const matches = message.matchAll(pattern);
          for (const match of matches) {
            const fieldName = match[1]?.toLowerCase();
            if (fieldName && !extractedErrorFields.includes(fieldName)) {
              extractedErrorFields.push(fieldName);
              extractedErrors[fieldName] = ["Field ini wajib diisi"];
            }
          }
        }

        // Check for "and X more errors"
        const moreErrorsMatch = message.match(/and\s+(\d+)\s+more\s+errors?/i);
        if (moreErrorsMatch) {
          console.error(`⚠️ Ada ${moreErrorsMatch[1]} error lainnya yang tidak terdeteksi`);
        }
      }

      console.error(`Extracted errors:`, extractedErrors);
      console.error(`Extracted error fields:`, extractedErrorFields);
      console.error(`[ROUTE_UPDATE_PUT] ===========================================`);

      // Build detailed error message
      let detailedMessage = data?.message || "Gagal memperbarui produk";
      if (extractedErrorFields.length > 0) {
        detailedMessage += `\n\n📋 Field yang error (${extractedErrorFields.length}):`;
        for (const field of extractedErrorFields) {
          const errors = Array.isArray(extractedErrors[field])
            ? extractedErrors[field]
            : [extractedErrors[field] || "Field ini wajib diisi"];
          errors.forEach((err) => {
            detailedMessage += `\n  ❌ ${field}: ${err}`;
          });
        }
      } else {
        detailedMessage += "\n\n⚠️ Detail error tidak tersedia dari backend.";
      }

      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal memperbarui produk",
          detailedMessage: detailedMessage,
          errors: extractedErrors,
          errorFields: extractedErrorFields,
          debug: {
            status: response.status,
            backendResponse: data,
            extractedErrors: extractedErrors,
            extractedErrorFields: extractedErrorFields,
          }
        },
        { status: response.status }
      );
    }

    // Success response - return sesuai format yang diharapkan
    if (data.success && data.data) {
      // Pastikan data adalah array
      const responseData = Array.isArray(data.data) ? data.data : [data.data];


      // ✅ FIX: Invalidate cache for the product page
      try {
        const product = responseData[0];
        const kode = product?.kode || product?.url?.replace(/^\//, '');
        if (kode) {
          revalidatePath(`/product/${kode}`);
          revalidatePath(`/product/${kode}`, 'page');
          revalidatePath("/sales/products");
          revalidatePath("/api/sales/produk");
          revalidatePath(`/api/landing/${kode}`);
          revalidateTag(`product-${kode}`);
        }
      } catch (revalidateError) {
        console.error(`[ROUTE_UPDATE_PUT] Revalidation failed:`, revalidateError);
      }

      return NextResponse.json({
        success: true,
        message: data.message || "Produk berhasil diperbarui",
        data: responseData,
      });
    }

    // Fallback jika format berbeda
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error(`❌ [PUT_PRODUK_UPDATE] Error:`, error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat memperbarui produk",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle POST untuk update produk (sama seperti POST /api/sales/produk tapi dengan id)
export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
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
    const contentType = request.headers.get("content-type") || "";

    let response;

    // Handle FormData request (sama seperti POST /api/sales/produk)
    if (contentType.includes("multipart/form-data")) {
      // Forward FormData langsung ke backend Laravel
      const incomingFormData = await request.formData();

      // DEBUG: Log incoming FormData
      const incomingEntries = [];
      const incomingJSON = {};

      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          incomingEntries.push({ key, type: "File", name: value.name, size: `${(value.size / 1024).toFixed(2)} KB` });
          incomingJSON[key] = {
            type: "File",
            name: value.name,
            size: `${(value.size / 1024).toFixed(2)} KB`,
            sizeBytes: value.size,
            mimeType: value.type
          };
        } else {
          const str = String(value);
          incomingEntries.push({ key, type: "String", value: str.length > 100 ? str.substring(0, 100) + "..." : str });

          // Try to parse JSON strings for better readability
          try {
            const parsed = JSON.parse(str);
            incomingJSON[key] = parsed;
          } catch {
            incomingJSON[key] = str.length > 200 ? str.substring(0, 200) + "..." : str;
          }
        }
      }
      console.table(incomingEntries);

      // Tampilkan sebagai JSON yang readable

      // Verify kategori exists
      const kategoriValue = incomingFormData.get("kategori");

      if (!kategoriValue || kategoriValue === "" || kategoriValue === "null" || kategoriValue === "undefined") {
        console.error(`[ROUTE_UPDATE] ❌ KATEGORI TIDAK ADA ATAU INVALID!`);
        return NextResponse.json(
          {
            success: false,
            message: "Kategori wajib diisi",
            errors: { kategori: ["Kategori field is required"] },
            errorFields: ["kategori"],
            debug: {
              kategoriValue: kategoriValue,
              kategoriType: typeof kategoriValue,
              allKeys: Array.from(incomingFormData.keys())
            }
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // ============================
      // SIMPAN REQUEST DATA KE OBJECT DULU (untuk debugging)
      // ============================
      const requestDataToLog = {
        timestamp: new Date().toISOString(),
        productId: id,
        incomingFormData: {}
      };

      // Convert incoming FormData ke object untuk logging
      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          requestDataToLog.incomingFormData[key] = {
            type: "File",
            name: value.name,
            size: value.size,
            sizeKB: `${(value.size / 1024).toFixed(2)} KB`,
            mimeType: value.type
          };
        } else {
          const strValue = String(value);
          try {
            const parsed = JSON.parse(strValue);
            requestDataToLog.incomingFormData[key] = parsed;
          } catch {
            requestDataToLog.incomingFormData[key] = strValue.length > 200 ? strValue.substring(0, 200) + "..." : strValue;
          }
        }
      }


      // Create FormData untuk forward ke backend (menggunakan form-data package)
      const forwardFormData = new FormData();

      let appendedCount = 0;
      const appendedFields = [];

      // Forward all entries ke backend - SIMPLE APPROACH
      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          // Convert File to Buffer untuk form-data package
          const arrayBuffer = await value.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Append dengan options yang benar
          forwardFormData.append(key, buffer, {
            filename: value.name,
            contentType: value.type || "application/octet-stream",
          });
          appendedCount++;
          appendedFields.push({ key, type: "File", name: value.name, size: buffer.length });
        } else {
          // Forward string values as-is
          const strValue = String(value);
          forwardFormData.append(key, strValue);
          appendedCount++;
          appendedFields.push({ key, type: "String", value: strValue.length > 50 ? strValue.substring(0, 50) + "..." : strValue });
        }
      }


      // Verify data di incomingFormData sebelum forward
      const verifyKategori = incomingFormData.get("kategori");
      const verifyNama = incomingFormData.get("nama");
      const verifyAssign = incomingFormData.get("assign");
      const verifyHeader = incomingFormData.get("header");


      if (!verifyKategori || !verifyNama) {
        console.error(`[ROUTE_UPDATE] ❌ MISSING CRITICAL FIELDS IN INCOMING!`);
        return NextResponse.json(
          {
            success: false,
            message: "Data tidak lengkap",
            errors: {
              kategori: !verifyKategori ? ["Kategori tidak ditemukan"] : [],
              nama: !verifyNama ? ["Nama tidak ditemukan"] : [],
            },
            debug: {
              kategori: verifyKategori ? "OK" : "MISSING",
              nama: verifyNama ? "OK" : "MISSING",
              allKeys: Array.from(incomingFormData.keys())
            }
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Get headers untuk FormData (PENTING: harus dipanggil sebelum fetch)
      const formDataHeaders = forwardFormData.getHeaders();


      // Forward ke backend Laravel dengan FormData menggunakan axios POST (untuk FormData, Laravel biasanya butuh POST dengan _method=PUT)
      try {
        const axiosResponse = await axios.post(
          `${BACKEND_URL}/api/sales/produk/${id}`,
          forwardFormData,
          {
            headers: {
              ...formDataHeaders,
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          }
        );

        // Convert axios response ke format yang compatible
        response = {
          ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          headers: new Headers(axiosResponse.headers),
          text: async () => JSON.stringify(axiosResponse.data),
          json: async () => axiosResponse.data,
        };

      } catch (axiosError) {
        console.error(`[ROUTE_UPDATE] ❌ Axios error:`, axiosError);

        // Handle axios error response
        if (axiosError.response) {
          // Backend responded with error
          response = {
            ok: false,
            status: axiosError.response.status,
            statusText: axiosError.response.statusText,
            headers: new Headers(axiosError.response.headers),
            json: async () => axiosError.response.data,
            text: async () => JSON.stringify(axiosError.response.data),
          };
        } else if (axiosError.request) {
          // Request sent but no response
          console.error(`[ROUTE_UPDATE] ❌ No response from backend`);
          return NextResponse.json(
            {
              success: false,
              message: "Tidak ada response dari backend",
              error: axiosError.message,
            },
            { status: 500, headers: corsHeaders }
          );
        } else {
          // Error setting up request
          console.error(`[ROUTE_UPDATE] ❌ Request setup error:`, axiosError.message);
          throw axiosError;
        }
      }

    } else {
      // Handle JSON request (untuk backward compatibility)
      const reqBody = await request.json();


      // Forward JSON ke backend
      response = await fetch(`${BACKEND_URL}/api/sales/produk/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reqBody),
      });
    }

    // Handle response
    let data;
    try {
      // Jika response sudah punya method json(), gunakan itu
      if (typeof response.json === "function") {
        data = await response.json();
      } else {
        // Fallback: parse dari text
        const responseText = await response.text();
        data = JSON.parse(responseText);
      }

      // Log response untuk debugging

      // Jika success dan ada data, pastikan data adalah array
      if (data?.success && data?.data) {
        // Jika data bukan array, wrap dalam array
        if (!Array.isArray(data.data)) {
          data.data = [data.data];
        }
      }
    } catch (parseError) {
      console.error(`[ROUTE_UPDATE] ❌ Failed to parse response:`, parseError);
      return NextResponse.json(
        {
          success: false,
          message: "Backend error: Response bukan JSON",
          error: parseError.message,
          status: response.status,
        },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      // Extract errors dengan detail
      console.error(`[ROUTE_UPDATE] ========== BACKEND ERROR RESPONSE (ID: ${id}) ==========`);
      console.error(`Status:`, response.status);
      console.error(`Response data:`, JSON.stringify(data, null, 2));

      let extractedErrors = {};
      let extractedErrorFields = [];

      // Method 1: Check data.errors
      if (data?.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0) {
        extractedErrors = data.errors;
        extractedErrorFields = Object.keys(data.errors);
        console.error(`Errors found in data.errors:`, extractedErrors);
      }
      // Method 2: Check data.data.errors
      else if (data?.data?.errors && typeof data.data.errors === "object") {
        extractedErrors = data.data.errors;
        extractedErrorFields = Object.keys(data.data.errors);
        console.error(`Errors found in data.data.errors:`, extractedErrors);
      }
      // Method 3: Parse from message
      else if (data?.message) {
        console.error(`Parsing errors from message:`, data.message);
        const message = data.message;

        // Extract field names from message
        const fieldPatterns = [
          /The\s+(\w+)\s+field\s+is\s+required/gi,
          /(\w+)\s+field\s+is\s+required/gi,
          /(\w+)\s+is\s+required/gi,
        ];

        for (const pattern of fieldPatterns) {
          const matches = message.matchAll(pattern);
          for (const match of matches) {
            const fieldName = match[1]?.toLowerCase();
            if (fieldName && !extractedErrorFields.includes(fieldName)) {
              extractedErrorFields.push(fieldName);
              extractedErrors[fieldName] = ["Field ini wajib diisi"];
            }
          }
        }

        // Check for "and X more errors"
        const moreErrorsMatch = message.match(/and\s+(\d+)\s+more\s+errors?/i);
        if (moreErrorsMatch) {
          console.error(`⚠️ Ada ${moreErrorsMatch[1]} error lainnya yang tidak terdeteksi`);
        }
      }

      console.error(`Extracted errors:`, extractedErrors);
      console.error(`Extracted error fields:`, extractedErrorFields);
      console.error(`[ROUTE_UPDATE] ===========================================`);

      // Build detailed error message
      let detailedMessage = data?.message || "Gagal memperbarui produk";
      if (extractedErrorFields.length > 0) {
        detailedMessage += `\n\n📋 Field yang error (${extractedErrorFields.length}):`;
        for (const field of extractedErrorFields) {
          const errors = Array.isArray(extractedErrors[field])
            ? extractedErrors[field]
            : [extractedErrors[field] || "Field ini wajib diisi"];
          errors.forEach((err) => {
            detailedMessage += `\n  ❌ ${field}: ${err}`;
          });
        }
      } else {
        detailedMessage += "\n\n⚠️ Detail error tidak tersedia dari backend.";
      }

      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal memperbarui produk",
          detailedMessage: detailedMessage,
          errors: extractedErrors,
          errorFields: extractedErrorFields,
          debug: {
            status: response.status,
            backendResponse: data,
            extractedErrors: extractedErrors,
            extractedErrorFields: extractedErrorFields,
          }
        },
        { status: response.status }
      );
    }

    // Success response - return sesuai format yang diharapkan
    if (data.success && data.data) {
      // Pastikan data adalah array
      const responseData = Array.isArray(data.data) ? data.data : [data.data];


      // ✅ FIX: Invalidate cache for the product page
      try {
        const product = responseData[0];
        const kode = product?.kode || product?.url?.replace(/^\//, '');
        if (kode) {
          revalidatePath(`/product/${kode}`);
          revalidatePath(`/product/${kode}`, 'page');
          revalidatePath("/sales/products");
          revalidatePath("/api/sales/produk");
          revalidatePath(`/api/landing/${kode}`);
          revalidateTag(`product-${kode}`);
        }
      } catch (revalidateError) {
        console.error(`[ROUTE_UPDATE] Revalidation failed:`, revalidateError);
      }

      return NextResponse.json({
        success: true,
        message: data.message || "Produk berhasil diperbarui",
        data: responseData,
      });
    }

    // Fallback jika format berbeda
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error(`❌ [POST_PRODUK_UPDATE] Error:`, error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat memperbarui produk",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || "";

    const response = await fetch(`${BACKEND_URL}/api/sales/produk/${id}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Produk tidak ditemukan",
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    return NextResponse.json(data, { status: response.status, headers: corsHeaders });
  } catch (error) {
    console.error("[PRODUK GET] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data produk",
        error: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Get query params to check for force delete
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get("force") === "true";


    // Coba DELETE dengan parameter force untuk hard delete
    const deleteUrl = forceDelete
      ? `${BACKEND_URL}/api/sales/produk/${id}?force=true`
      : `${BACKEND_URL}/api/sales/produk/${id}`;

    const response = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // Juga kirim force di body untuk backend yang menerima dari body
      body: JSON.stringify({ force: forceDelete }),
    });

    const data = await response.json().catch(() => ({}));


    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal menghapus produk",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ...data,
      success: true,
      message: data?.message || "Produk berhasil dihapus permanen"
    }, { status: response.status });
  } catch (error) {
    console.error("[PRODUK DELETE] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menghapus produk",
        error: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
