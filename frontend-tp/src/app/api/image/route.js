import { BACKEND_URL } from "@/config/env";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const rawPath = searchParams.get("path");

  if (!rawPath) {
    return new Response(JSON.stringify({ error: "Path is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Bersihkan path
  let cleanPath = rawPath;

  // Hapus leading slash
  cleanPath = cleanPath.replace(/^\/+/, "");

  // Jika path sudah ada "storage/", hapus dulu
  cleanPath = cleanPath.replace(/^storage\//, "");

  // Hapus double slash
  cleanPath = cleanPath.replace(/\/+/g, "/");

  // Build final URL: BACKEND_URL/storage/<path>
  const baseUrl = BACKEND_URL.replace(/\/+$/, "");
  const backendUrl = `${baseUrl}/storage/${cleanPath}`;

  console.log("[IMAGE PROXY] Input path:", rawPath);
  console.log("[IMAGE PROXY] Clean path:", cleanPath);
  console.log("[IMAGE PROXY] Backend URL:", backendUrl);

  try {
    const result = await fetch(backendUrl, {
      method: "GET",
      headers: {
        Accept: "image/*,*/*",
      },
    });

    console.log("[IMAGE PROXY] Backend status:", result.status);

    if (!result.ok) {
      console.error("[IMAGE PROXY] Backend error:", result.status, backendUrl);
      return new Response(JSON.stringify({
        error: "Image not found",
        url: backendUrl,
        status: result.status
      }), {
        status: result.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Stream response body langsung ke client
    const contentType = result.headers.get("Content-Type") || "image/jpeg";

    return new Response(result.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[IMAGE PROXY] Fetch error:", error.message);
    return new Response(JSON.stringify({
      error: "Failed to fetch image",
      message: error.message,
      url: backendUrl
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
