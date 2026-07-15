import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

const REQUIRED_FIELDS = ["produk", "harga", "total_harga", "sumber"];

const isNil = (value) => value === undefined || value === null || value === "";
const toNumber = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
};

const toCurrencyString = (value, fallback = "0") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();

    console.log("[ORDER_SALES] Payload masuk:", JSON.stringify(body, null, 2));

    const errors = [];
    REQUIRED_FIELDS.forEach((field) => {
      if (isNil(body[field])) errors.push(`Field ${field} wajib diisi`);
    });

    const produk = toNumber(body.produk);
    if (!produk) errors.push("Produk harus berupa ID valid");

    const notifValue = Number(body.notif);
    const notif = Number.isNaN(notifValue) ? (body.notif ? 1 : 0) : notifValue ? 1 : 0;

    const customerId = body.customer ? toNumber(body.customer) : null;
    const hasExistingCustomer = Boolean(customerId);

    // Validasi: alamat selalu required untuk order (baik customer baru atau existing)
    if (!body.alamat?.trim()) {
      errors.push("Alamat wajib diisi untuk order");
    }

    if (!hasExistingCustomer) {
      if (!body.nama?.trim()) errors.push("Nama customer wajib diisi");
      if (!body.wa?.trim()) errors.push("Nomor WA customer wajib diisi");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.join(", ") },
        { status: 400 }
      );
    }

    // Build payload sesuai dokumentasi
    const cleanPayload = {
      produk, // integer
      harga: toCurrencyString(body.harga), // string
      ongkir: toCurrencyString(body.ongkir), // string
      total_harga: toCurrencyString(body.total_harga), // string
      sumber: String(body.sumber), // string
      utm_source: String(body.utm_source || "-"),
      notif, // 1 atau 0
      alamat: String(body.alamat || "").trim(), // string, selalu dikirim (required untuk order)
    };

    const bundlingRaw = body.bundling;
    if (bundlingRaw !== undefined && bundlingRaw !== null && String(bundlingRaw).trim() !== "") {
      cleanPayload.bundling = String(bundlingRaw).trim();
    }

    if (hasExistingCustomer) {
      // Jika customer sudah ada: kirim customer ID (integer)
      cleanPayload.customer = customerId;
    } else {
      // Jika customer baru: kirim nama, wa, email (string)
      cleanPayload.nama = String(body.nama).trim();
      cleanPayload.wa = String(body.wa).trim();
      cleanPayload.email = body.email ? String(body.email).trim() : "";
    }

    console.log("[ORDER_SALES] Payload ke backend:", JSON.stringify(cleanPayload, null, 2));

    const response = await fetch(`${BACKEND_URL}/api/sales/order-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(cleanPayload),
    });

    const data = await response.json().catch(() => ({}));

    console.log("[ORDER_SALES] Response backend:", JSON.stringify(data, null, 2));

    const isUndefinedFieldError =
      response.status === 500 &&
      (data?.message?.includes("Undefined variable $field") ||
        data?.error === "ErrorException");

    if (isUndefinedFieldError) {
      console.warn("[ORDER_SALES] Backend kirim error $field, dianggap success dengan warning");
      return NextResponse.json({
        success: true,
        message: "Order berhasil dibuat, namun backend mengirim peringatan.",
        data: data?.data || null,
        warning: data?.message || "Backend mengembalikan error 'Undefined variable $field'",
      });
    }

    if (!response.ok || data?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal membuat order",
          error: data?.error || data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[ORDER_SALES] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat membuat order" },
      { status: 500 }
    );
  }
}

