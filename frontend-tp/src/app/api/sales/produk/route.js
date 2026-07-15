export const runtime = "nodejs";

import { NextResponse } from "next/server";
import FormData from "form-data";
import axios from "axios";
import { revalidatePath } from "next/cache";

import { BACKEND_URL } from "@/config/env";

// CORS headers helper
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

// Image compression settings
const IMAGE_CONFIG = {
  maxWidth: 1600,
  maxHeight: 1600,
  targetSizeKB: 300,
  initialQuality: 85,
  minQuality: 50,
  qualityStep: 5,
};

// Allowed file extensions
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"];

// MIME type mapping
const MIME_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

// Dynamic import sharp
let sharpModule = null;

const getSharp = async () => {
  if (sharpModule === null) {
    try {
      sharpModule = (await import("sharp")).default;
      console.log("✅ Sharp loaded successfully");
    } catch (err) {
      console.warn("⚠️ Sharp not available:", err.message);
      sharpModule = false;
    }
  }
  return sharpModule;
};

/**
 * Extract file extension from filename
 */
const getFileExtension = (filename) => {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : null;
};

/**
 * Validate file extension
 */
const isValidExtension = (extension) => {
  return extension && ALLOWED_EXTENSIONS.includes(extension.toLowerCase());
};

/**
 * Compress image buffer while maintaining original format
 */
const compressImage = async (buffer, extension, filename) => {
  const sharp = await getSharp();
  if (!sharp) {
    console.log(`  ⚠️ Sharp not available, skipping compression for ${filename}`);
    return null;
  }

  try {
    const targetSizeBytes = IMAGE_CONFIG.targetSizeKB * 1024;
    const originalSizeKB = (buffer.length / 1024).toFixed(2);

    console.log(`  📊 Original size: ${originalSizeKB} KB`);

    if (buffer.length <= targetSizeBytes) {
      console.log(`  ✅ File already under ${IMAGE_CONFIG.targetSizeKB}KB, skipping compression`);
      return buffer;
    }

    let quality = IMAGE_CONFIG.initialQuality;
    let compressedBuffer;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      attempts++;
      let sharpInstance = sharp(buffer);

      sharpInstance = sharpInstance.resize({
        width: IMAGE_CONFIG.maxWidth,
        height: IMAGE_CONFIG.maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      });

      if (extension === "png") {
        compressedBuffer = await sharpInstance
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
      } else {
        compressedBuffer = await sharpInstance
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
      }

      const sizeKB = (compressedBuffer.length / 1024).toFixed(2);
      console.log(`  🔄 Attempt ${attempts}: Quality ${quality} → ${sizeKB} KB`);

      if (compressedBuffer.length <= targetSizeBytes || attempts >= maxAttempts) {
        break;
      }

      quality = Math.max(quality - IMAGE_CONFIG.qualityStep, IMAGE_CONFIG.minQuality);

    } while (compressedBuffer.length > targetSizeBytes && quality >= IMAGE_CONFIG.minQuality && attempts < maxAttempts);

    const finalSizeKB = (compressedBuffer.length / 1024).toFixed(2);
    const reduction = Math.round((1 - compressedBuffer.length / buffer.length) * 100);

    console.log(`  ✅ Compressed: ${originalSizeKB} KB → ${finalSizeKB} KB (${reduction}% reduction, quality: ${quality})`);

    return compressedBuffer;
  } catch (err) {
    console.error(`  ❌ Compression failed for ${filename}:`, err.message);
    return null;
  }
};

/**
 * Utility: Convert File to base64 string
 */
const convertFileToBase64 = async (file) => {
  if (!file || !(file instanceof File) || file.size === 0) {
    return null;
  }

  try {
    const extension = getFileExtension(file.name);

    // Validate extension
    if (!isValidExtension(extension)) {
      console.error(`  ❌ Invalid file extension: ${extension}`);
      throw new Error(`File "${file.name}" has invalid extension. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Compress if it's an image
    if (file.type.startsWith("image/")) {
      console.log(`  🔄 Compressing ${file.name}...`);
      const compressedBuffer = await compressImage(buffer, extension, file.name);
      if (compressedBuffer) {
        buffer = compressedBuffer;
      }
    }

    // Convert to base64
    const base64 = buffer.toString("base64");
    const mimeType = file.type || MIME_TYPES[extension] || "image/jpeg";

    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`  ❌ Failed to convert file to base64: ${error.message}`);
    throw error;
  }
};

/**
 * Utility: Safe JSON parse with fallback
 */
const safeParseJSON = (input, fallback = null) => {
  if (input === null || input === undefined || input === "") {
    return fallback;
  }

  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return fallback;
    }
  }

  if (Array.isArray(input) || typeof input === "object") {
    return input;
  }

  return fallback;
};

/**
 * Utility: Normalize number value
 */
const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(num) ? null : num;
};

/**
 * Extract and structure payload from request body
 */
const extractPayload = async (reqBody) => {
  const payload = {
    kategori: normalizeNumber(reqBody.kategori),
    nama: typeof reqBody.nama === "string" ? reqBody.nama.trim() : "",
    kode: typeof reqBody.kode === "string" ? reqBody.kode.trim() : "",
    url: typeof reqBody.url === "string" ? reqBody.url.trim() : "",
    deskripsi: typeof reqBody.deskripsi === "string" ? reqBody.deskripsi : "",
    harga_asli: normalizeNumber(reqBody.harga_asli),
    harga_coret: normalizeNumber(reqBody.harga_coret),
    tanggal_event: typeof reqBody.tanggal_event === "string" ? reqBody.tanggal_event : null,
    landingpage: normalizeNumber(reqBody.landingpage),
    assign: [],
    list_point: [],
    custom_field: [],
    event_fb_pixel: [],
    fb_pixel: [],
    gtm: [],
    video: [],
    gambar: [],
    testimoni: [],
    header: null,
  };

  // Handle header (base64 string dengan prefix data:image atau tanpa prefix)
  // Hanya tambahkan jika ada dan tidak null
  if (reqBody.header && typeof reqBody.header === "string" && reqBody.header.trim() !== "") {
    // Jika sudah ada prefix data:image, gunakan langsung
    // Jika belum, tambahkan prefix
    let headerValue = reqBody.header.trim();
    if (!headerValue.startsWith("data:")) {
      // Jika tanpa prefix, tambahkan prefix default
      headerValue = `data:image/jpeg;base64,${headerValue}`;
    }
    payload.header = headerValue;
  }

  // Parse assign (can be string JSON array or already array)
  const assignParsed = safeParseJSON(reqBody.assign, []);
  payload.assign = Array.isArray(assignParsed) ? assignParsed.map(normalizeNumber).filter(n => n !== null) : [];

  // Parse list_point
  const listPointParsed = safeParseJSON(reqBody.list_point, []);
  if (Array.isArray(listPointParsed)) {
    payload.list_point = listPointParsed
      .filter(item => item && typeof item === "object")
      .map(item => ({
        nama: typeof item.nama === "string" ? item.nama.trim() : "",
        urutan: normalizeNumber(item.urutan) || 0,
      }));
  }

  // Parse custom_field
  const customFieldParsed = safeParseJSON(reqBody.custom_field, []);
  if (Array.isArray(customFieldParsed)) {
    payload.custom_field = customFieldParsed
      .filter(item => item && typeof item === "object")
      .map(item => ({
        nama_field: typeof item.nama_field === "string" ? item.nama_field.trim() : "",
        urutan: normalizeNumber(item.urutan) || 0,
      }));
  }

  // Parse event_fb_pixel
  const eventFbPixelParsed = safeParseJSON(reqBody.event_fb_pixel, []);
  if (Array.isArray(eventFbPixelParsed)) {
    payload.event_fb_pixel = eventFbPixelParsed
      .filter(item => item && typeof item === "object")
      .map(item => ({
        event: typeof item.event === "string" ? item.event.trim() : "",
      }));
  }

  // Parse fb_pixel
  const fbPixelParsed = safeParseJSON(reqBody.fb_pixel, []);
  payload.fb_pixel = Array.isArray(fbPixelParsed) ? fbPixelParsed.map(normalizeNumber).filter(n => n !== null) : [];

  // Parse gtm
  const gtmParsed = safeParseJSON(reqBody.gtm, []);
  payload.gtm = Array.isArray(gtmParsed) ? gtmParsed.map(normalizeNumber).filter(n => n !== null) : [];

  // Parse video (array of strings)
  const videoParsed = safeParseJSON(reqBody.video, []);
  payload.video = Array.isArray(videoParsed)
    ? videoParsed.filter(v => typeof v === "string" && v.trim() !== "").map(v => v.trim())
    : [];

  // Handle gambar (can be files or base64 strings)
  if (reqBody.gambar) {
    const gambarParsed = safeParseJSON(reqBody.gambar, []);
    if (Array.isArray(gambarParsed)) {
      for (const item of gambarParsed) {
        if (item instanceof File) {
          // Only convert if it's a File object (FormData)
          const base64 = await convertFileToBase64(item);
          if (base64) {
            payload.gambar.push({
              caption: typeof item.caption === "string" ? item.caption : "",
              path: base64,
            });
          }
        } else if (item && typeof item === "object") {
          // Already base64 string from JSON request, use directly
          payload.gambar.push({
            caption: typeof item.caption === "string" ? item.caption.trim() : "",
            path: typeof item.path === "string" && item.path.trim() !== "" ? item.path : null,
          });
        }
      }
    }
  }

  // Handle testimoni (can be files or base64 strings)
  if (reqBody.testimoni) {
    const testimoniParsed = safeParseJSON(reqBody.testimoni, []);
    if (Array.isArray(testimoniParsed)) {
      for (const item of testimoniParsed) {
        if (item && typeof item === "object") {
          let gambarBase64 = null;

          // If there's a file, convert it (FormData)
          if (item.gambar instanceof File) {
            gambarBase64 = await convertFileToBase64(item.gambar);
          } else if (typeof item.gambar === "string" && item.gambar.trim() !== "") {
            // Already base64 string from JSON request, use directly
            gambarBase64 = item.gambar;
          }

          payload.testimoni.push({
            nama: typeof item.nama === "string" ? item.nama.trim() : "",
            deskripsi: typeof item.deskripsi === "string" ? item.deskripsi.trim() : "",
            gambar: gambarBase64,
          });
        }
      }
    }
  }

  return payload;
};

/**
 * Validate required fields
 */
const validatePayload = (payload) => {
  const errors = [];

  if (payload.kategori === null || payload.kategori === undefined) {
    errors.push("kategori wajib diisi (number)");
  }

  if (!Array.isArray(payload.assign) || payload.assign.length === 0) {
    errors.push("assign wajib diisi (array)");
  }

  if (typeof payload.nama !== "string" || payload.nama.trim() === "") {
    errors.push("nama wajib diisi (string)");
  }

  if (typeof payload.url !== "string" || payload.url.trim() === "") {
    errors.push("url wajib diisi (string)");
  }

  if (typeof payload.kode !== "string" || payload.kode.trim() === "") {
    errors.push("kode wajib diisi (string)");
  }

  return errors;
};

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const forwardQuery = request.nextUrl?.search ?? "";
    const backendListUrl = `${BACKEND_URL}/api/sales/produk${forwardQuery}`;

    console.log("🟢 [GET_PRODUK] Fetching products...");
    console.log("🟢 [GET_PRODUK] Backend URL:", backendListUrl);

    const response = await fetch(backendListUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || "Gagal mengambil produk" },
        { status: response.status, headers: corsHeaders }
      );
    }

    // ✅ OPTIMASI PAYLOAD: Filter field yang HANYA dibutuhkan tabel
    // Mapping data untuk membuang field berat seperti landingpage, deskripsi, dll
    let optimizedData = [];

    if (data && Array.isArray(data.data)) {
      optimizedData = data.data.map(p => ({
        id: p.id,
        nama: p.nama,
        kode: p.kode,
        url: p.url,
        status: p.status,
        kategori_rel: p.kategori_rel,
        user_rel: p.user_rel,
        assign: p.assign,
        assign_rel: p.assign_rel,
        tanggal_event: p.tanggal_event,
        create_at: p.create_at,
        harga: p.harga,
        harga_asli: p.harga_asli,
        header: p.header,
        total_revenue: p.total_revenue,
        fee_trainer: p.fee_trainer,
        trainer_rel: p.trainer_rel,
        bundling_rel: p.bundling_rel,
        jadwal_rel: p.jadwal_rel || [],  // ✅ Tambah jadwal_rel
      }));
    }

    // Return filtered data
    return NextResponse.json({
      success: true,
      message: "Data produk berhasil diambil (Optimized)",
      data: optimizedData
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("❌ [GET_PRODUK] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat mengambil produk" },
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

export async function POST(request) {
  try {
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

    // Handle FormData request (sesuai dokumentasi Postman)
    if (contentType.includes("multipart/form-data")) {
      // Forward FormData langsung ke backend Laravel
      const incomingFormData = await request.formData();

      // DEBUG: Log incoming FormData
      console.log("[ROUTE] ========== INCOMING FORMDATA ==========");
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
      console.log("[ROUTE] ========== INCOMING FORMDATA AS JSON ==========");
      console.log(JSON.stringify(incomingJSON, null, 2));
      console.log("[ROUTE] ==============================================");

      // Verify kategori exists
      const kategoriValue = incomingFormData.get("kategori");
      console.log("[ROUTE] Kategori check:", {
        exists: kategoriValue !== null,
        value: kategoriValue,
        type: typeof kategoriValue,
        stringValue: String(kategoriValue)
      });

      if (!kategoriValue || kategoriValue === "" || kategoriValue === "null" || kategoriValue === "undefined") {
        console.error("[ROUTE] ❌ KATEGORI TIDAK ADA ATAU INVALID!");
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
      console.log("[ROUTE] ========== SAVING REQUEST DATA ==========");
      const requestDataToLog = {
        timestamp: new Date().toISOString(),
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

      console.log("[ROUTE] Request data object:", JSON.stringify(requestDataToLog, null, 2));
      console.log("[ROUTE] Fields count:", Object.keys(requestDataToLog.incomingFormData).length);
      console.log("[ROUTE] Fields:", Object.keys(requestDataToLog.incomingFormData));
      console.log("[ROUTE] ==========================================");

      // Create FormData untuk forward ke backend (menggunakan form-data package)
      const forwardFormData = new FormData();

      console.log("[ROUTE] ========== BUILDING FORWARD FORMDATA ==========");
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
          console.log(`[ROUTE] ✅ File appended: ${key} = ${value.name} (${(value.size / 1024).toFixed(2)} KB, buffer: ${buffer.length} bytes)`);
        } else {
          // Forward string values as-is
          const strValue = String(value);
          forwardFormData.append(key, strValue);
          appendedCount++;
          appendedFields.push({ key, type: "String", value: strValue.length > 50 ? strValue.substring(0, 50) + "..." : strValue });
          console.log(`[ROUTE] ✅ String appended: ${key} = ${strValue.length > 50 ? strValue.substring(0, 50) + "..." : strValue}`);
        }
      }

      console.log(`[ROUTE] Total appended: ${appendedCount} fields`);
      console.log("[ROUTE] Appended fields:", appendedFields.map(f => `${f.key} (${f.type})`).join(", "));
      console.log("[ROUTE] ==============================================");

      // Verify data di incomingFormData sebelum forward
      console.log("[ROUTE] ========== VERIFYING INCOMING DATA ==========");
      const verifyKategori = incomingFormData.get("kategori");
      const verifyNama = incomingFormData.get("nama");
      const verifyAssign = incomingFormData.get("assign");
      const verifyHeader = incomingFormData.get("header");

      console.log("Kategori:", verifyKategori ? String(verifyKategori) : "NULL");
      console.log("Nama:", verifyNama ? String(verifyNama) : "NULL");
      console.log("Assign:", verifyAssign ? String(verifyAssign) : "NULL");
      console.log("Header:", verifyHeader instanceof File ? `File(${verifyHeader.name}, ${(verifyHeader.size / 1024).toFixed(2)} KB)` : "NULL");

      if (!verifyKategori || !verifyNama || !verifyHeader) {
        console.error("[ROUTE] ❌ MISSING CRITICAL FIELDS IN INCOMING!");
        return NextResponse.json(
          {
            success: false,
            message: "Data tidak lengkap",
            errors: {
              kategori: !verifyKategori ? ["Kategori tidak ditemukan"] : [],
              nama: !verifyNama ? ["Nama tidak ditemukan"] : [],
              header: !verifyHeader ? ["Header tidak ditemukan"] : [],
            },
            debug: {
              kategori: verifyKategori ? "OK" : "MISSING",
              nama: verifyNama ? "OK" : "MISSING",
              header: verifyHeader ? "OK" : "MISSING",
              allKeys: Array.from(incomingFormData.keys())
            }
          },
          { status: 400, headers: corsHeaders }
        );
      }
      console.log("[ROUTE] ✅ All critical fields present in incoming");
      console.log("[ROUTE] ==============================================");

      // Get headers untuk FormData (PENTING: harus dipanggil sebelum fetch)
      const formDataHeaders = forwardFormData.getHeaders();

      console.log("[ROUTE] ========== REQUEST DETAILS ==========");
      console.log("URL:", `${BACKEND_URL}/api/sales/produk`);
      console.log("Method:", "POST");
      console.log("Content-Type:", formDataHeaders["content-type"]);
      console.log("Content-Length:", formDataHeaders["content-length"] || "not set");
      console.log("Token:", token.substring(0, 20) + "...");
      console.log("Total fields to send:", appendedCount);
      console.log("[ROUTE] ======================================");

      // Forward ke backend Laravel dengan FormData
      // PENTING: form-data package perlu digunakan dengan cara yang benar
      // Native fetch di Node.js tidak support form-data package langsung
      // Kita perlu convert ke stream atau menggunakan pendekatan lain

      try {
        // Convert form-data ke stream untuk fetch
        // form-data package memiliki method untuk get stream
        const formDataStream = forwardFormData;

        // Get headers - PENTING: jangan override content-type
        const headers = {
          ...formDataHeaders, // Ini sudah include content-type dengan boundary
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        };

        // Remove content-length jika ada (biar form-data handle sendiri)
        delete headers["content-length"];

        console.log("[ROUTE] Final headers:", {
          "content-type": headers["content-type"]?.substring(0, 50) + "...",
          "accept": headers["Accept"],
          "authorization": headers["Authorization"]?.substring(0, 30) + "...",
          "has-boundary": headers["content-type"]?.includes("boundary")
        });

        // Forward dengan axios yang lebih kompatibel dengan form-data package
        console.log("[ROUTE] Sending request to backend using axios...");

        // Axios lebih kompatibel dengan form-data package
        const axiosResponse = await axios.post(
          `${BACKEND_URL}/api/sales/produk`,
          formDataStream, // form-data package
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

        // Convert axios response ke format yang compatible dengan kode berikutnya
        response = {
          ok: axiosResponse.status >= 200 && axiosResponse.status < 300,
          status: axiosResponse.status,
          statusText: axiosResponse.statusText,
          headers: new Headers(axiosResponse.headers),
          text: async () => JSON.stringify(axiosResponse.data),
          json: async () => axiosResponse.data,
        };

        console.log("[ROUTE] ✅ Request sent successfully");
        console.log("[ROUTE] Backend response status:", response.status);
        console.log("[ROUTE] Backend response ok:", response.ok);
      } catch (axiosError) {
        console.error("[ROUTE] ❌ Axios error:", axiosError);

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
          console.error("[ROUTE] ❌ No response from backend");
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
          console.error("[ROUTE] ❌ Request setup error:", axiosError.message);
          throw axiosError;
        }
      }

    } else {
      // Handle JSON request (untuk backward compatibility dan format baru)
      const reqBody = await request.json();

      console.log("[ROUTE] ========== INCOMING JSON PAYLOAD ==========");
      console.log("Payload keys:", Object.keys(reqBody));
      console.log("[ROUTE] ============================================");

      // Check if this is the new format with landingpage array
      const isNewFormat = reqBody.landingpage && Array.isArray(reqBody.landingpage);

      let payloadToSend;

      if (isNewFormat) {
        // New format: langsung forward dengan struktur yang sesuai
        console.log("[ROUTE] Detected new JSON format with landingpage array");

        payloadToSend = {
          nama: reqBody.nama || "",
          kategori: String(reqBody.kategori || ""),
          kode: reqBody.kode || "",
          url: reqBody.url || "",
          harga: String(reqBody.harga || "0"),
          jenis_produk: reqBody.jenis_produk || "non-fisik",
          isBundling: reqBody.isBundling || false,
          bundling: reqBody.bundling ? JSON.stringify(reqBody.bundling) : JSON.stringify([]),
          tanggal_event: reqBody.tanggal_event || null,
          assign: reqBody.assign ? JSON.stringify(reqBody.assign) : JSON.stringify([]),
          status: String(reqBody.status || "1"),
          landingpage: JSON.stringify(reqBody.landingpage || []),
        };

        // Validate required fields
        if (!payloadToSend.nama || !payloadToSend.kategori || !payloadToSend.kode) {
          return NextResponse.json(
            {
              success: false,
              message: "Validation error: nama, kategori, dan kode wajib diisi",
              errors: {
                nama: !payloadToSend.nama ? ["Nama wajib diisi"] : [],
                kategori: !payloadToSend.kategori ? ["Kategori wajib diisi"] : [],
                kode: !payloadToSend.kode ? ["Kode wajib diisi"] : [],
              },
            },
            { status: 400, headers: corsHeaders }
          );
        }
      } else {
        // Old format: extract and structure payload
        const payload = await extractPayload(reqBody);

        // Validate payload
        const validationErrors = validatePayload(payload);

        if (validationErrors.length > 0) {
          return NextResponse.json(
            {
              success: false,
              message: "Validation error",
              errors: validationErrors,
            },
            { status: 400, headers: corsHeaders }
          );
        }

        // Convert payload untuk backend Laravel
        payloadToSend = {
          ...payload,
          assign: JSON.stringify(payload.assign || []),
          list_point: JSON.stringify(payload.list_point || []),
          custom_field: JSON.stringify(payload.custom_field || []),
          event_fb_pixel: JSON.stringify(payload.event_fb_pixel || []),
          fb_pixel: JSON.stringify(payload.fb_pixel || []),
          gtm: JSON.stringify(payload.gtm || []),
          video: JSON.stringify(payload.video || []),
          gambar: JSON.stringify(payload.gambar || []),
          testimoni: JSON.stringify(payload.testimoni || []),
        };

        if (payloadToSend.header === null || payloadToSend.header === undefined || payloadToSend.header === "") {
          delete payloadToSend.header;
        }

        payloadToSend.kategori = String(payloadToSend.kategori);
        // user_input tidak perlu dikirim, backend ambil dari auth()->user()->id
        payloadToSend.landingpage = String(payloadToSend.landingpage || "1");
        payloadToSend.harga_asli = String(payloadToSend.harga_asli || "0");
        payloadToSend.harga_coret = String(payloadToSend.harga_coret || "0");
      }

      console.log("[ROUTE] ========== PAYLOAD TO SEND ==========");
      console.log("Payload keys:", Object.keys(payloadToSend));
      console.log("[ROUTE] =====================================");

      // Send JSON to backend
      response = await fetch(`${BACKEND_URL}/api/sales/produk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadToSend),
      });
    }

    // Handle response
    let data;
    let responseText = null;
    try {
      // Jika response sudah punya method json(), gunakan itu
      if (typeof response.json === "function") {
        data = await response.json();
      } else {
        // Fallback: parse dari text
        responseText = await response.text();
        data = JSON.parse(responseText);
      }

      // Log response untuk debugging
      console.log("[ROUTE] Backend response:", {
        status: response.status,
        success: data?.success,
        message: data?.message,
        hasData: !!data?.data
      });

      // Jika success dan ada data, pastikan data adalah array
      if (data?.success && data?.data) {
        // Jika data bukan array, wrap dalam array
        if (!Array.isArray(data.data)) {
          data.data = [data.data];
          console.log("[ROUTE] ✅ Wrapped data in array");
        }
        console.log("[ROUTE] ✅ Data received:", Array.isArray(data.data) ? `Array(${data.data.length})` : "Not array");
      }
    } catch (parseError) {
      console.error("[ROUTE] ❌ Failed to parse response:", parseError);
      // Try to get response text for error logging
      try {
        if (!responseText && typeof response.text === "function") {
          responseText = await response.text();
        }
      } catch (e) {
        // Ignore
      }
      return NextResponse.json(
        {
          success: false,
          message: "Backend error: Response bukan JSON",
          error: parseError.message,
          status: response.status,
          rawResponse: responseText ? responseText.substring(0, 500) : null,
        },
        { status: response.status || 500, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      // Extract errors dengan detail
      console.error("[ROUTE] ========== BACKEND ERROR RESPONSE ==========");
      console.error("Status:", response.status);
      console.error("Response data:", JSON.stringify(data, null, 2));
      if (responseText) {
        console.error("Response text (raw):", responseText.substring(0, 500));
      }

      let extractedErrors = {};
      let extractedErrorFields = [];

      // Method 1: Check data.errors
      if (data?.errors && typeof data.errors === "object" && Object.keys(data.errors).length > 0) {
        extractedErrors = data.errors;
        extractedErrorFields = Object.keys(data.errors);
        console.error("Errors found in data.errors:", extractedErrors);
      }
      // Method 2: Check data.data.errors
      else if (data?.data?.errors && typeof data.data.errors === "object") {
        extractedErrors = data.data.errors;
        extractedErrorFields = Object.keys(data.data.errors);
        console.error("Errors found in data.data.errors:", extractedErrors);
      }
      // Method 3: Parse from message
      else if (data?.message) {
        console.error("Parsing errors from message:", data.message);
        const message = data.message;

        // Extract field names from message like "The kategori field is required. (and 2 more errors)"
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

      console.error("Extracted errors:", extractedErrors);
      console.error("Extracted error fields:", extractedErrorFields);
      console.error("[ROUTE] ============================================");

      // Build detailed error message
      let detailedMessage = data?.message || "Gagal membuat produk";
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
          message: data?.message || "Gagal membuat produk",
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
        { status: response.status, headers: corsHeaders }
      );
    }

    // Success response - return sesuai format yang diharapkan
    // Backend return: {success: true, message: "...", data: {...}}
    if (data.success && data.data) {
      // Pastikan data adalah array
      const responseData = Array.isArray(data.data) ? data.data : [data.data];

      console.log("[ROUTE] ✅ Returning success response with data array:", responseData.length, "items");

      // ✅ FIX: Invalidate cache for the product page
      try {
        const product = responseData[0];
        const kode = product?.kode || product?.url?.replace(/^\//, '');
        if (kode) {
          console.log(`[ROUTE] Revalidating path: /product/${kode}`);
          revalidatePath(`/product/${kode}`);
          revalidatePath(`/product/${kode}`, 'page');
        }
      } catch (revalidateError) {
        console.error(`[ROUTE] Revalidation failed:`, revalidateError);
      }

      return NextResponse.json({
        success: true,
        message: data.message || "Produk berhasil dibuat",
        data: responseData,
      }, { headers: corsHeaders });
    }

    // Fallback jika format berbeda
    console.log("[ROUTE] ⚠️ Returning fallback response");
    return NextResponse.json(data, { headers: corsHeaders });

  } catch (error) {
    console.error("❌ [POST_PRODUK] Error:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan saat membuat produk",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
