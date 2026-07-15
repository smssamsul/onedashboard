// /middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("token")?.value;
  const userDivisi = req.cookies.get("user_divisi")?.value;
  const userLevel = req.cookies.get("user_level")?.value; // 1 = Head, 2 = Staff
  const { pathname } = req.nextUrl;

  // 1. Halaman Publik / Login
  if (pathname.startsWith("/login") || pathname.startsWith("/admin/login")) {
    if (token) {
      // Jika sudah login, cegah masuk ke login lagi, lempar ke dashboard masing-masing
      // Untuk dashboard redirect, kita biarkan di handle client-side atau redirect default
      return NextResponse.next();
    }
    return NextResponse.next();
  }

  // 2. Proteksi Token Umum (Harus Login untuk semua rute internal)
  const internalPaths = [
    "/admin",
    "/sales",
    "/finance",
    "/hr",
    "/marketing",
    "/multimedia",
    "/it",
    "/super-ops",
  ];
  const isInternalPath = internalPaths.some(path => pathname.startsWith(path));

  if (isInternalPath && !token) {
    return NextResponse.redirect(new URL("/login?unauthorized=true", req.url));
  }

  // 3. Hak Akses Per Divisi & Level
  if (token) {
    const superOps =
      userDivisi === "99" && (userLevel === "99" || userLevel === 99);

    if (pathname.startsWith("/super-ops") && !superOps) {
      return handleUnauthorizedRedirect(userDivisi, userLevel, req);
    }

    // --- Proteksi ADMIN ---
    if (pathname.startsWith("/admin")) {
      // Divisi 1 = Admin Super, 2 = Owner
      if (userDivisi !== "1" && userDivisi !== "2" && userDivisi !== "admin") {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
    }

    // --- Proteksi SALES ---
    if (pathname.startsWith("/sales")) {
      const allowedSales =
        superOps || userDivisi === "3" || userDivisi === "sales";
      if (!allowedSales) {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }

      if (!superOps) {
        // Cek Level dalam Sales (super ops boleh akses head & staff)
        const isStaffPath = pathname.startsWith("/sales/staff");
        if (isStaffPath && userLevel !== "2") {
          return NextResponse.redirect(new URL("/sales", req.url));
        }

        if (!isStaffPath && pathname !== "/sales" && userLevel === "2") {
          return NextResponse.redirect(new URL("/sales/staff", req.url));
        }
      }
    }

    // --- Proteksi FINANCE ---
    if (pathname.startsWith("/finance")) {
      const allowedFinance =
        superOps || userDivisi === "4" || userDivisi === "finance";
      if (!allowedFinance) {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
    }

    // --- Proteksi DIREKSI (Level 9) ---
    if (pathname.startsWith("/direksi")) {
      // Hanya direksi (level 9) yang bisa akses
      if (userLevel !== "9" && userLevel !== 9 && userDivisi !== "9" && userDivisi !== 9) {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
      // Direksi boleh akses, lanjutkan
    }

    // --- Proteksi HR ---
    if (pathname.startsWith("/hr")) {
      const isHR =
        userDivisi === "5" ||
        userDivisi === 5 ||
        userDivisi === "hr" ||
        userDivisi === "human resources";
      if (!superOps && !isHR) {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
    }

    // --- Proteksi MARKETING ---
    if (pathname.startsWith("/marketing")) {
      // Divisi 6 = Marketing
      if (userDivisi !== "6" && userDivisi !== 6 && userDivisi !== "marketing") {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
    }

    // --- Proteksi MULTIMEDIA ---
    if (pathname.startsWith("/multimedia")) {
      // Divisi 7 = Multimedia
      if (userDivisi !== "7" && userDivisi !== 7 && userDivisi !== "multimedia" && userDivisi !== "mm") {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
    }

    // --- Proteksi IT ---
    if (pathname.startsWith("/it")) {
      // Divisi 8 = IT
      if (userDivisi !== "8" && userDivisi !== 8 && userDivisi !== "it") {
        return handleUnauthorizedRedirect(userDivisi, userLevel, req);
      }
    }

    // --- Proteksi DIREKSI (Level 9) ---
    // Direksi bisa akses semua route, tapi default redirect ke /admin
    if (userLevel === "9" || userLevel === 9) {
      // Direksi bisa akses semua route
      // Tidak perlu redirect khusus
    }
  }

  // 4. Force No-Cache for Product and Article Pages
  const response = NextResponse.next();

  // Jika ini rute produk atau artikel, paksa browser untuk tidak nge-cache HTML-nya
  if (pathname.startsWith("/product") || pathname.startsWith("/article")) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
  }

  return response;
}

// Fungsi helper untuk mendepak user ke 'rumah' aslinya jika coba masuk divisi lain
function handleUnauthorizedRedirect(divisi, level, req) {
  let target = "/login";

  if (divisi === "1" || divisi === "2" || divisi === "admin") target = "/admin";
  else if (divisi === "3" || divisi === "sales") target = (level === "2") ? "/sales/staff" : "/sales";
  else if (divisi === "4" || divisi === "finance") target = "/finance";
  else if (divisi === "5" || divisi === "hr") target = "/hr/dashboard";
  else if (divisi === "6" || divisi === "marketing") target = "/marketing";
  else if (divisi === "7" || divisi === "multimedia" || divisi === "mm") target = "/multimedia";
  else if (divisi === "8" || divisi === "it") target = "/it";
  else if (divisi === "99" || divisi === 99) target = "/super-ops";

  // Level 9 atau Divisi 9 = Direksi, redirect ke /direksi
  if (level === "9" || level === 9 || divisi === "9" || divisi === 9) target = "/direksi";

  return NextResponse.redirect(new URL(target, req.url));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/sales/:path*",
    "/finance/:path*",
    "/hr/:path*",
    "/marketing/:path*",
    "/multimedia/:path*",
    "/it/:path*",
    "/direksi/:path*",
    "/super-ops",
    "/super-ops/:path*",
    "/product/:path*",
    "/article/:path*",
  ],
};
