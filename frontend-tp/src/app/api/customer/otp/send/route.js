import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";
import { withErrorHandler, handleBackendResponse } from "@/lib/apiErrorHandler";

export const POST = withErrorHandler(async (request) => {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, message: "Token tidak ditemukan", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const body = await request.json();

  console.log("🟢 [OTP_SEND] Request body:", body);

  // Validasi body
  if (!body.customer_id || !body.wa) {
    return NextResponse.json(
      { success: false, message: "customer_id dan wa harus diisi", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Forward ke backend
  const response = await fetch(`${BACKEND_URL}/api/customer/otp/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      customer_id: parseInt(body.customer_id, 10),
      wa: String(body.wa),
    }),
  });

  // Use Global Handler to process response
  return handleBackendResponse(response, "[OTP_SEND]");
});
