export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { BACKEND_URL } from "@/config/env";

// Image compression settings
const IMAGE_CONFIG = {
  maxWidth: 1600,
  maxHeight: 1600,
  targetSizeKB: 1000, // 1MB
  initialQuality: 85,
  minQuality: 50,
  qualityStep: 5,
};

// Dynamic import sharp
let sharpModule = null;
const getSharp = async () => {
  if (sharpModule === null) {
    try {
      sharpModule = (await import("sharp")).default;
    } catch (err) {
      sharpModule = false;
    }
  }
  return sharpModule;
};

// Compress image
const compressImage = async (buffer, extension, filename) => {
  const sharp = await getSharp();
  if (!sharp) return buffer;

  try {
    const targetSizeBytes = IMAGE_CONFIG.targetSizeKB * 1024;
    if (buffer.length <= targetSizeBytes) return buffer;

    let quality = IMAGE_CONFIG.initialQuality;
    let compressedBuffer;
    let attempts = 0;

    do {
      attempts++;
      let sharpInstance = sharp(buffer).resize({
        width: IMAGE_CONFIG.maxWidth,
        height: IMAGE_CONFIG.maxHeight,
        fit: "inside",
        withoutEnlargement: true,
      });

      if (extension === "png") {
        compressedBuffer = await sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer();
      } else {
        compressedBuffer = await sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer();
      }

      if (compressedBuffer.length <= targetSizeBytes || attempts >= 10) break;
      quality = Math.max(quality - IMAGE_CONFIG.qualityStep, IMAGE_CONFIG.minQuality);
    } while (compressedBuffer.length > targetSizeBytes && quality >= IMAGE_CONFIG.minQuality);

    return compressedBuffer;
  } catch (err) {
    console.error(`Compression failed: ${err.message}`);
    return buffer;
  }
};

// Convert file to base64
const convertFileToBase64 = async (file) => {
  if (!file || !(file instanceof File)) return null;

  try {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const arrayBuffer = await file.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // Compress
    if (file.type.startsWith("image/")) {
      buffer = await compressImage(buffer, extension, file.name) || buffer;
    }

    const base64 = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Failed to convert file: ${error.message}`);
    throw error;
  }
};

// Safe JSON parse
const safeParseJSON = (input, fallback = null) => {
  if (!input || input === "") return fallback;
  if (typeof input === "string") {
    try {
      return JSON.parse(input);
    } catch {
      return fallback;
    }
  }
  return Array.isArray(input) || typeof input === "object" ? input : fallback;
};

// Normalize number
const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return isNaN(num) ? null : num;
};

// Extract payload from FormData
const extractPayloadFromFormData = async (formData) => {
  const entries = {};
  for (const [key, value] of formData.entries()) {
    if (!entries[key]) entries[key] = [];
    entries[key].push(value);
  }

  const payload = {
    kategori: null,
    user_input: null,
    nama: "",
    kode: "",
    url: "",
    deskripsi: "",
    harga_asli: null,
    harga_coret: null,
    tanggal_event: null,
    landingpage: null,
    status: 1,
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

  // Process header
  if (entries.header && entries.header[0] instanceof File) {
    payload.header = await convertFileToBase64(entries.header[0]);
  }

  // Process simple fields
  if (entries.kategori?.[0]) payload.kategori = normalizeNumber(entries.kategori[0]);
  if (entries.user_input?.[0]) payload.user_input = normalizeNumber(entries.user_input[0]);
  if (entries.nama?.[0]) payload.nama = String(entries.nama[0]).trim();
  if (entries.kode?.[0]) payload.kode = String(entries.kode[0]).trim();
  if (entries.deskripsi?.[0]) payload.deskripsi = String(entries.deskripsi[0]);
  if (entries.harga_asli?.[0]) payload.harga_asli = normalizeNumber(entries.harga_asli[0]);
  if (entries.harga_coret?.[0]) payload.harga_coret = normalizeNumber(entries.harga_coret[0]);
  if (entries.tanggal_event?.[0]) payload.tanggal_event = String(entries.tanggal_event[0]).trim();
  if (entries.landingpage?.[0]) payload.landingpage = normalizeNumber(entries.landingpage[0]);
  if (entries.status?.[0]) payload.status = normalizeNumber(entries.status[0]) || 1;

  // Process URL - generate from kode if empty
  if (entries.url?.[0]) {
    let urlValue = String(entries.url[0]).trim();
    payload.url = urlValue || (payload.kode ? "/" + payload.kode : "");
  } else if (payload.kode) {
    payload.url = "/" + payload.kode;
  }
  if (payload.url && !payload.url.startsWith("/")) {
    payload.url = "/" + payload.url;
  }

  // Process JSON arrays
  if (entries.assign?.[0]) {
    const assignParsed = safeParseJSON(entries.assign[0], []);
    payload.assign = Array.isArray(assignParsed) ? assignParsed.map(normalizeNumber).filter(n => n !== null) : [];
  }

  if (entries.list_point?.[0]) {
    const listPointParsed = safeParseJSON(entries.list_point[0], []);
    if (Array.isArray(listPointParsed)) {
      payload.list_point = listPointParsed
        .filter(item => item && typeof item === "object")
        .map(item => ({ nama: typeof item.nama === "string" ? item.nama.trim() : "" }));
    }
  }

  if (entries.testimoni?.[0]) {
    const testimoniParsed = safeParseJSON(entries.testimoni[0], []);
    if (Array.isArray(testimoniParsed)) {
      for (const item of testimoniParsed) {
        if (item && typeof item === "object") {
          payload.testimoni.push({
            nama: typeof item.nama === "string" ? item.nama.trim() : "",
            deskripsi: typeof item.deskripsi === "string" ? item.deskripsi.trim() : "",
            gambar: typeof item.gambar === "string" && item.gambar.trim() ? item.gambar : null,
          });
        }
      }
    }
  }

  if (entries.video?.[0]) {
    const videoParsed = safeParseJSON(entries.video[0], []);
    payload.video = Array.isArray(videoParsed) ? videoParsed.filter(v => typeof v === "string" && v.trim()).map(v => v.trim()) : [];
  }

  // Process gambar array
  const gambarKeys = Object.keys(entries).filter(k => k.startsWith("gambar["));
  const gambarIndices = new Set();
  gambarKeys.forEach(key => {
    const match = key.match(/gambar\[(\d+)\]/);
    if (match) gambarIndices.add(parseInt(match[1]));
  });

  for (const idx of Array.from(gambarIndices).sort((a, b) => a - b)) {
    const pathKey = `gambar[${idx}][path]`;
    const captionKey = `gambar[${idx}][caption]`;
    
    let pathBase64 = null;
    if (entries[pathKey]?.[0] instanceof File) {
      pathBase64 = await convertFileToBase64(entries[pathKey][0]);
    }

    const caption = entries[captionKey]?.[0] ? String(entries[captionKey][0]).trim() : "";
    payload.gambar.push({ path: pathBase64, caption });
  }

  // Process testimoni array with files
  const testimoniKeys = Object.keys(entries).filter(k => k.startsWith("testimoni["));
  const testimoniIndices = new Set();
  testimoniKeys.forEach(key => {
    const match = key.match(/testimoni\[(\d+)\]/);
    if (match) testimoniIndices.add(parseInt(match[1]));
  });

  for (const idx of Array.from(testimoniIndices).sort((a, b) => a - b)) {
    const gambarKey = `testimoni[${idx}][gambar]`;
    const namaKey = `testimoni[${idx}][nama]`;
    const deskripsiKey = `testimoni[${idx}][deskripsi]`;
    
    let gambarBase64 = null;
    if (entries[gambarKey]?.[0] instanceof File) {
      gambarBase64 = await convertFileToBase64(entries[gambarKey][0]);
    }

    const nama = entries[namaKey]?.[0] ? String(entries[namaKey][0]).trim() : "";
    const deskripsi = entries[deskripsiKey]?.[0] ? String(entries[deskripsiKey][0]).trim() : "";

    payload.testimoni.push({ gambar: gambarBase64, nama, deskripsi });
  }

  return payload;
};

// Validate payload
const validatePayload = (payload) => {
  const errors = [];

  if (payload.kategori === null || payload.kategori === undefined) {
    errors.push("kategori wajib diisi");
  }
  if (payload.user_input === null || payload.user_input === undefined) {
    errors.push("user_input wajib diisi");
  }
  if (!payload.nama || payload.nama.trim() === "") {
    errors.push("nama wajib diisi");
  }
  if (!payload.kode || payload.kode.trim() === "") {
    errors.push("kode wajib diisi");
  }
  if (!payload.url || payload.url.trim() === "") {
    if (payload.kode) {
      payload.url = "/" + payload.kode.trim();
    } else {
      errors.push("url wajib diisi");
    }
  } else if (!payload.url.startsWith("/")) {
    payload.url = "/" + payload.url;
  }
  if (!payload.header || !payload.header.startsWith("data:image/")) {
    errors.push("The header must be an image.");
  }

  return errors;
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Token tidak ditemukan" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const contentType = request.headers.get("content-type") || "";

    let payload;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      payload = await extractPayloadFromFormData(formData);
    } else {
      // Handle JSON request
      const reqBody = await request.json();
      const kode = typeof reqBody.kode === "string" ? reqBody.kode.trim() : "";
      let url = typeof reqBody.url === "string" ? reqBody.url.trim() : "";
      
      if (!url && kode) url = "/" + kode;
      else if (url && !url.startsWith("/")) url = "/" + url;
      
      payload = {
        kategori: normalizeNumber(reqBody.kategori),
        user_input: normalizeNumber(reqBody.user_input),
        nama: typeof reqBody.nama === "string" ? reqBody.nama.trim() : "",
        kode: kode,
        url: url,
        deskripsi: typeof reqBody.deskripsi === "string" ? reqBody.deskripsi : "",
        harga_asli: normalizeNumber(reqBody.harga_asli),
        harga_coret: normalizeNumber(reqBody.harga_coret),
        tanggal_event: typeof reqBody.tanggal_event === "string" ? reqBody.tanggal_event : null,
        landingpage: normalizeNumber(reqBody.landingpage),
        status: normalizeNumber(reqBody.status) || 1,
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

      if (reqBody.header && typeof reqBody.header === "string" && reqBody.header.trim()) {
        let headerValue = reqBody.header.trim();
        if (!headerValue.startsWith("data:")) {
          headerValue = `data:image/jpeg;base64,${headerValue}`;
        }
        payload.header = headerValue;
      }

      const assignParsed = safeParseJSON(reqBody.assign, []);
      payload.assign = Array.isArray(assignParsed) ? assignParsed.map(normalizeNumber).filter(n => n !== null) : [];

      const listPointParsed = safeParseJSON(reqBody.list_point, []);
      if (Array.isArray(listPointParsed)) {
        payload.list_point = listPointParsed
          .filter(item => item && typeof item === "object")
          .map(item => ({ nama: typeof item.nama === "string" ? item.nama.trim() : "" }));
      }

      const testimoniParsed = safeParseJSON(reqBody.testimoni, []);
      if (Array.isArray(testimoniParsed)) {
        for (const item of testimoniParsed) {
          if (item && typeof item === "object") {
            payload.testimoni.push({
              nama: typeof item.nama === "string" ? item.nama.trim() : "",
              deskripsi: typeof item.deskripsi === "string" ? item.deskripsi.trim() : "",
              gambar: typeof item.gambar === "string" && item.gambar.trim() ? item.gambar : null,
            });
          }
        }
      }

      const videoParsed = safeParseJSON(reqBody.video, []);
      payload.video = Array.isArray(videoParsed) ? videoParsed.filter(v => typeof v === "string" && v.trim()).map(v => v.trim()) : [];
    }

    // Validate
    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        message: validationErrors.join(". "),
        errors: {},
        errorFields: [],
      }, { status: 400 });
    }

    // Remove null header before sending
    const payloadToSend = { ...payload };
    if (!payloadToSend.header) {
      delete payloadToSend.header;
    }

    console.log("📤 [POST_PRODUK2] Sending to backend");

    // Send to backend
    const response = await fetch(`${BACKEND_URL}/api/admin/produk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payloadToSend),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json({
        success: false,
        message: "Backend error: Response bukan JSON",
        raw_response: responseText.substring(0, 200),
      }, { status: response.status || 500 });
    }

    if (!response.ok) {
      let extractedErrors = {};
      let extractedErrorFields = [];

      if (data?.errors && typeof data.errors === "object") {
        extractedErrors = data.errors;
        extractedErrorFields = Object.keys(data.errors);
      } else if (data?.data?.errors && typeof data.data.errors === "object") {
        extractedErrors = data.data.errors;
        extractedErrorFields = Object.keys(data.data.errors);
      }

      return NextResponse.json({
        success: false,
        message: data?.message || "Gagal membuat produk",
        errors: extractedErrors,
        errorFields: extractedErrorFields,
      }, { status: response.status });
    }

    // Success response
    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ [POST_PRODUK2] Error:", error.message);
    return NextResponse.json({
      success: false,
      message: error.message || "Terjadi kesalahan saat membuat produk",
    }, { status: 500 });
  }
}
