import crypto from "crypto";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL;
const SECRET_KEY = process.env.NEXT_PUBLIC_OTP_SECRET_KEY;

export async function sendOTP({ customer_id, wa }) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const hash = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(String(timestamp))
      .digest("hex");

    const response = await fetch(`${API_URL}/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Timestamp": timestamp,
        "X-API-Hash": hash
      },
      body: JSON.stringify({
        customer_id,
        wa
      })
    });

    const data = await response.json();
    return data;
  } catch (err) {
    return {
      success: false,
      message: "Server error"
    };
  }
}
