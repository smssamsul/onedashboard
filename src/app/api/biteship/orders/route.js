import { NextResponse } from "next/server";
import { biteshipFetch } from "@/lib/biteship-server";

/**
 * POST /api/biteship/orders
 * Proxy ke POST https://api.biteship.com/v1/orders
 * Body dikirim ke Biteship; server mengisi default origin/shipper dari env jika tidak ada.
 *
 * Env opsional:
 * - BITESHIP_ORIGIN_CONTACT_NAME, BITESHIP_ORIGIN_CONTACT_PHONE, BITESHIP_ORIGIN_ADDRESS
 * - BITESHIP_ORIGIN_POSTAL_CODE
 * - BITESHIP_SHIPPER_CONTACT_NAME, BITESHIP_SHIPPER_CONTACT_PHONE, BITESHIP_SHIPPER_ORGANIZATION
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const originPostal = Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE || 12440);
    const defaults = {
      shipper_contact_name: process.env.BITESHIP_SHIPPER_CONTACT_NAME || process.env.BITESHIP_ORIGIN_CONTACT_NAME || "Shipper",
      shipper_contact_phone: process.env.BITESHIP_SHIPPER_CONTACT_PHONE || process.env.BITESHIP_ORIGIN_CONTACT_PHONE || "081234567890",
      shipper_organization: process.env.BITESHIP_SHIPPER_ORGANIZATION || "",
      origin_contact_name: process.env.BITESHIP_ORIGIN_CONTACT_NAME || "Warehouse",
      origin_contact_phone: process.env.BITESHIP_ORIGIN_CONTACT_PHONE || "081234567890",
      origin_address: process.env.BITESHIP_ORIGIN_ADDRESS || "Jakarta",
      origin_postal_code: originPostal,
    };

    const merged = { ...defaults, ...body };

    if (!merged.destination_contact_name || !merged.destination_contact_phone || !merged.destination_address) {
      return NextResponse.json(
        { success: false, message: "destination_contact_name, destination_contact_phone, destination_address wajib" },
        { status: 400 }
      );
    }
    if (!merged.courier_company || !merged.courier_type) {
      return NextResponse.json(
        { success: false, message: "courier_company dan courier_type wajib (sesuai hasil rates)" },
        { status: 400 }
      );
    }
    if (!merged.delivery_type || !["now", "scheduled"].includes(String(merged.delivery_type))) {
      return NextResponse.json(
        { success: false, message: "delivery_type harus 'now' atau 'scheduled'" },
        { status: 400 }
      );
    }
    if (merged.delivery_type === "scheduled" && (!merged.delivery_date || !merged.delivery_time)) {
      return NextResponse.json(
        { success: false, message: "Untuk scheduled, delivery_date (YYYY-MM-DD) dan delivery_time (HH:mm) wajib" },
        { status: 400 }
      );
    }

    const hasDestLoc =
      merged.destination_postal_code != null ||
      merged.destination_area_id ||
      (merged.destination_coordinate?.latitude != null && merged.destination_coordinate?.longitude != null);
    if (!hasDestLoc) {
      return NextResponse.json(
        { success: false, message: "Isi salah satu: destination_postal_code, destination_area_id, atau destination_coordinate" },
        { status: 400 }
      );
    }

    const { ok, status, data } = await biteshipFetch("/v1/orders", {
      method: "POST",
      body: merged,
    });

    return NextResponse.json(data, { status: ok ? 200 : status });
  } catch (e) {
    return NextResponse.json(
      { success: false, message: e.message || "Gagal membuat order Biteship" },
      { status: 500 }
    );
  }
}
