import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/** Proxy ke GET /api/sales/order/sales (ordersForSales — staff). */
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const perPage = searchParams.get("per_page") || "15";
    const search = searchParams.get("search") || "";

    // Handle multiple values for filters (support both key and key[] formats)
    const statusOrder = [
      ...searchParams.getAll('status_order'),
      ...searchParams.getAll('status_order[]')
    ];
    const statusPembayaran = [
      ...searchParams.getAll('status_pembayaran'),
      ...searchParams.getAll('status_pembayaran[]')
    ];
    const produkIds = [
      ...searchParams.getAll('produk_id'),
      ...searchParams.getAll('produk_id[]')
    ];

    const tanggalFrom = searchParams.get("tanggal_from") || "";
    const tanggalTo = searchParams.get("tanggal_to") || "";

    const utmFilterCols = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];

    let backendUrl = `${BACKEND_URL}/api/sales/order/sales?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`;

    if (search) {
      const formattedSearch = search.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
      backendUrl += `&search=${encodeURIComponent(formattedSearch)}`;
    }

    statusOrder.forEach((val) => {
      backendUrl += `&status_order[]=${encodeURIComponent(val)}`;
    });
    statusPembayaran.forEach((val) => {
      backendUrl += `&status_pembayaran[]=${encodeURIComponent(val)}`;
    });
    produkIds.forEach((val) => {
      backendUrl += `&produk_id[]=${encodeURIComponent(val)}`;
    });

    if (tanggalFrom) backendUrl += `&tanggal_from=${encodeURIComponent(tanggalFrom)}`;
    if (tanggalTo) backendUrl += `&tanggal_to=${encodeURIComponent(tanggalTo)}`;
    utmFilterCols.forEach((col) => {
      searchParams.getAll(`${col}[]`).forEach((v) => {
        backendUrl += `&${encodeURIComponent(col)}[]=${encodeURIComponent(v)}`;
      });
    });

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan HTML, bukan JSON.",
          data: [],
        },
        { status: 500 }
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON response from backend",
          data: [],
        },
        { status: 500 }
      );
    }

    if (json.success !== undefined) {
      return NextResponse.json({
        success: json.success,
        data: json.data || [],
        message: json.message,
        pagination: json.pagination,
      });
    }

    return NextResponse.json({
      success: true,
      data: Array.isArray(json.data) ? json.data : json.data ? [json.data] : [],
    });
  } catch (error) {
    console.error("order/sales proxy:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data order sales",
        error: error.message,
        data: [],
      },
      { status: 500 }
    );
  }
}
