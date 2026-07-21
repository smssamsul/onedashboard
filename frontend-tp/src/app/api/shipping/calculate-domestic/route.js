import { NextResponse } from "next/server";
import { biteshipFetch, getBiteshipApiKey } from "@/lib/biteship-server";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, must-revalidate",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS });
}

/**
 * Cek ongkir via Biteship (menggantikan RajaOngkir/Komerce untuk sementara).
 * @see https://biteship.com/en/docs/api/rates/retrieve
 *
 * Body JSON:
 * - weight (gram), courier (kode tunggal, mis. "jne")
 * - destination_postal_code (opsional, number)
 * - destination_area_id (opsional, string dari Maps API)
 * - destination_search (opsional, string — akan resolve ke area lewat Maps)
 * - item_value (opsional, nilai barang untuk rates)
 *
 * Legacy (diabaikan oleh Biteship tapi tetap diterima): origin, destination, province_id
 */

async function resolveDestinationAreaId(destinationSearch) {
  const key = getBiteshipApiKey();
  const q = encodeURIComponent(destinationSearch.trim());
  const url = `https://api.biteship.com/v1/maps/areas?countries=ID&input=${q}&type=single`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      authorization: key,
      accept: "application/json",
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success || !Array.isArray(data.areas) || data.areas.length === 0) {
    const msg = data?.message || data?.error || "Wilayah tujuan tidak ditemukan di Biteship";
    throw new Error(msg);
  }
  return data.areas[0];
}

function normalizePricing(pricing) {
  if (!Array.isArray(pricing)) return [];
  return pricing.map((p) => ({
    courier: p.courier_code || p.company || "",
    courier_company: p.courier_code || p.company || "",
    courier_type: p.type || p.courier_service_code || "",
    service: p.courier_service_name || p.description || "",
    description: [p.description, p.duration].filter(Boolean).join(" — ") || "",
    etd: p.duration || p.shipment_duration_range || "",
    cost: typeof p.price === "number" ? p.price : Number(p.price) || 0,
  }));
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const weight = Number(body.weight);
    // Support multiple couriers (comma-separated)
    const courier = body.courier ? String(body.courier).trim().toLowerCase() : "jne,sicepat,jnt,anteraja,pos,tiki";
    const itemValue = Number(body.item_value) || 100000;

    if (!weight || weight <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "weight (gram) wajib diisi",
          data: [],
        },
        { status: 200, headers: RESPONSE_HEADERS }
      );
    }

    const originPostal = Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE || 12440);
    const originAreaId = process.env.BITESHIP_ORIGIN_AREA_ID?.trim() || "";

    let destinationAreaId = body.destination_area_id ? String(body.destination_area_id).trim() : "";
    let destinationPostal = body.destination_postal_code != null ? Number(body.destination_postal_code) : null;

    if (!destinationAreaId && !destinationPostal && body.destination_search) {
      const area = await resolveDestinationAreaId(String(body.destination_search));
      destinationAreaId = area.id;
      if (area.postal_code != null) {
        destinationPostal = Number(area.postal_code);
      }
    }

    const rateBody = {
      couriers: courier,
      items: [
        {
          name: "Paket",
          value: itemValue,
          quantity: 1,
          weight,
          category: "others",
        },
      ],
    };

    if (destinationAreaId) {
      if (originAreaId) {
        rateBody.origin_area_id = originAreaId;
        rateBody.destination_area_id = destinationAreaId;
      } else {
        rateBody.origin_postal_code = originPostal;
        rateBody.destination_area_id = destinationAreaId;
      }
    } else if (destinationPostal && !Number.isNaN(destinationPostal)) {
      rateBody.origin_postal_code = originPostal;
      rateBody.destination_postal_code = destinationPostal;
    } else {
      return NextResponse.json(
        {
          success: false,
          message:
            "Untuk Biteship, kirim destination_search (nama kec/kota/prov), destination_postal_code, atau destination_area_id",
          data: [],
        },
        { status: 200, headers: RESPONSE_HEADERS }
      );
    }

    const { ok, status, data } = await biteshipFetch("/v1/rates/couriers", {
      method: "POST",
      body: rateBody,
    });

    if (!ok) {
      const msg = data?.message || data?.error || `Biteship rates error (${status})`;
      return NextResponse.json(
        { success: false, message: msg, data: [] },
        { status: 200, headers: RESPONSE_HEADERS }
      );
    }

    const pricing = data?.pricing || [];
    const normalized = normalizePricing(pricing);

    return NextResponse.json(
      {
        success: true,
        message: data?.message || "Berhasil menghitung ongkir (Biteship)",
        data: normalized,
        biteship: {
          origin: data?.origin || null,
          destination: data?.destination || null,
        },
      },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error("[SHIPPING_CALCULATE_BITESHIP]", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Terjadi kesalahan",
        data: [],
      },
      { status: 200, headers: RESPONSE_HEADERS }
    );
  }
}
