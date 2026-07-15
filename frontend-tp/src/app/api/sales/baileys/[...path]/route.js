import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * Catch-all proxy untuk semua endpoint Baileys.
 * Frontend URL: /api/sales/baileys/[...path]
 * Backend URL: BACKEND_URL/api/sales/baileys/[...path]
 *
 * Mendukung: GET, POST, DELETE
 */

async function forwardRequest(request, { params }) {
    const authHeader = request.headers.get("authorization");
    const pathParts = await params;
    const path = Array.isArray(pathParts.path) ? pathParts.path.join("/") : pathParts.path;
    const backendUrl = `${BACKEND_URL}/api/sales/baileys/${path}`;

    const options = {
        method: request.method,
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(authHeader ? { Authorization: authHeader } : {}),
        },
        cache: "no-store",
    };

    // Attach body for POST/PUT/PATCH
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
        try {
            const body = await request.json();
            options.body = JSON.stringify(body);
        } catch {
            // Body mungkin kosong
        }
    }

    const response = await fetch(backendUrl, options);
    const text = await response.text();

    // Cek jika HTML (error page)
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
        return NextResponse.json(
            { success: false, message: "Backend error", error: "HTML response" },
            { status: 500 }
        );
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch {
        return NextResponse.json(
            { success: false, message: "Invalid JSON from backend", error: text.substring(0, 200) },
            { status: 500 }
        );
    }

    return NextResponse.json(json, { status: response.status });
}

export async function GET(request, context) {
    return forwardRequest(request, context);
}

export async function POST(request, context) {
    return forwardRequest(request, context);
}

export async function DELETE(request, context) {
    return forwardRequest(request, context);
}
