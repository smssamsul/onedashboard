import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

const normalizeBaseUrl = (url) => {
  if (!url) return "";
  return url.replace(/\/+$/, "");
};

const buildJoinOrderUrl = (baseUrl, idOrder) => {
  const cleanBase = normalizeBaseUrl(baseUrl);
  const hasApiSegment = /\/api\/?$/.test(cleanBase);
  const base = hasApiSegment ? cleanBase.replace(/\/api\/?$/, "") : cleanBase;
  return `${base}/api/webinar/join-order/${idOrder}`;
};

async function fetchJsonGateway(idOrder, token) {
  const url = buildJoinOrderUrl(BACKEND_URL, idOrder);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ||
      `Gagal mengambil data webinar (${response.status})`;
    throw new Error(message);
  }

  if (!payload?.success || !payload?.data) {
    throw new Error(payload?.message || "Gateway webinar tidak tersedia");
  }

  return {
    ...payload.data,
    joinLink:
      payload.data.joinLink ||
      payload.data.joinUrl ||
      payload.data.join_url ||
      payload.data.webinar?.join_url ||
      "",
  };
}

export async function GET(request, { params }) {
  try {
    const { idOrder } = await params;

    if (!idOrder) {
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

    const data = await fetchJsonGateway(idOrder, token);

    if (!data.meetingNumber || !data.sdkKey || !data.signature) {
      return NextResponse.json(
        {
          success: false,
          message: "Data gateway tidak lengkap",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("[WEBINAR_GATEWAY] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal memuat data gateway webinar",
      },
      { status: 500 }
    );
  }
}

