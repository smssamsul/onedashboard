import { NextResponse } from "next/server";

export async function GET(request, { params }) {
    const { slug } = params;
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://api.ternakproperti.com";

    try {
        const res = await fetch(`${baseUrl}/api/post/slug/${slug}`, {
            headers: {
                "Content-Type": "application/json",
            },
            cache: 'no-store'
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Proxy API Error:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}
