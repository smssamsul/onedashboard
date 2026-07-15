import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";
import { withErrorHandler, handleBackendResponse } from "@/lib/apiErrorHandler";

export const POST = withErrorHandler(async (request) => {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "") || null;

  const body = await request.json();

  console.log("🟢 [OTP_VERIFY] Request body:", body);

  // Validasi body
  if (!body.customer_id || !body.otp) {
    return NextResponse.json(
      { success: false, message: "customer_id dan otp harus diisi", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Forward ke backend
  const response = await fetch(`${BACKEND_URL}/api/customer/otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      customer_id: parseInt(body.customer_id, 10),
      otp: String(body.otp),
    }),
  });

  return handleBackendResponse(response, "[OTP_VERIFY]");
});

