"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getCustomerSession } from "@/lib/customerAuth";
import SupportWidget from "./SupportWidget";
import "@/styles/customer/cstdashboard.css";

const navLinks = [
  { label: "Home", href: "/customer/dashboard" },
  { label: "Pembayaran", href: "/customer/dashboard/payment" },
  { label: "Profile", href: "/customer/profile" },
];

export default function CustomerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [fullUserInfo, setFullUserInfo] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Close mobile menu when route changes
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    console.log("🔵 [CUSTOMER_LAYOUT] Checking authentication...");
    const session = getCustomerSession();

    console.log("🔵 [CUSTOMER_LAYOUT] Session:", {
      isAuthenticated: session.isAuthenticated,
      hasToken: !!session.token,
      user: session.user
    });

    // Set customer info untuk ditampilkan di navbar
    if (session.user) {
      setFullUserInfo(session.user);
      const customerName = session.user.nama_panggilan || session.user.nama || "User";
      setCustomerInfo({
        name: customerName,
        initials: customerName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      });
    }

    // Tampilkan debug log dari localStorage jika ada
    const debugLog = localStorage.getItem("customer_login_debug");
    if (debugLog) {
      try {
        const debug = JSON.parse(debugLog);
        console.log("🔍 [CUSTOMER_LAYOUT DEBUG] Previous login attempt:", debug);
      } catch (e) {
        console.error("Failed to parse debug log:", e);
      }
    }

    // Cek apakah ada user data (untuk kasus needsVerification - tidak ada token tapi ada user)
    const hasUserData = !!session.user;
    const hasToken = !!session.token;

    // Allow access jika:
    // 1. Ada token (normal login)
    // 2. Ada user data meskipun tidak ada token (untuk kasus needsVerification)
    if (!hasToken && !hasUserData) {
      console.error("❌ [CUSTOMER_LAYOUT] No token and no user data, redirecting to login...");
      console.error("❌ [CUSTOMER_LAYOUT] Token from localStorage:", localStorage.getItem("customer_token"));
      console.error("❌ [CUSTOMER_LAYOUT] User from localStorage:", localStorage.getItem("customer_user"));

      // Simpan info ke localStorage untuk debugging
      const debugInfo = {
        timestamp: new Date().toISOString(),
        reason: "Not authenticated - no token and no user",
        session: {
          isAuthenticated: session.isAuthenticated,
          hasToken: hasToken,
          hasUser: hasUserData,
          tokenValue: session.token ? "exists" : "missing"
        },
        localStorageToken: localStorage.getItem("customer_token"),
        localStorageUser: localStorage.getItem("customer_user")
      };
      localStorage.setItem("customer_layout_debug", JSON.stringify(debugInfo));

      // Alert untuk debugging
      console.warn("⚠️ [CUSTOMER_LAYOUT DEBUG] Check localStorage.getItem('customer_layout_debug') for details");
      console.warn("⚠️ [CUSTOMER_LAYOUT DEBUG] Full debug info:", debugInfo);

      // Delay sedikit sebelum redirect agar console log bisa dilihat
      setTimeout(() => {
        router.replace("/customer");
      }, 2000); // Delay lebih lama untuk debugging
      return;
    }

    // Jika ada user data meskipun tidak ada token, ini kasus needsVerification
    if (hasUserData && !hasToken) {
      console.warn("⚠️ [CUSTOMER_LAYOUT] Has user data but no token - needsVerification case");
      console.warn("⚠️ [CUSTOMER_LAYOUT] Allowing access for verification");
    }

    console.log("✅ [CUSTOMER_LAYOUT] Authenticated, setting authorized to true");
    setIsAuthorized(true);
  }, [router]);

  // Handle dropdown click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.customer-navbar__profile')) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleLogout = () => {
    localStorage.removeItem("customer_token");
    localStorage.removeItem("customer_user");
    router.replace("/customer");
  };

  if (!isAuthorized) {
    return null; // Don't render until auth check is complete
  }

  return (
    <div className="dashboard-layout">
      <header className="customer-navbar">
        <div className="customer-navbar__brand">
          <img src="/assets/logo.png" alt="Ternak Properti" />
        </div>

        <nav className={`customer-navbar__nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href ||
              (link.href === "/customer/dashboard/payment" && pathname?.includes("/payment"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`customer-navbar__nav-link ${isActive ? "active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="customer-navbar__right">
          <div
            className="customer-navbar__profile"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setDropdownOpen(!dropdownOpen);
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="User menu"
          >
            <div className="customer-navbar__avatar">{customerInfo?.initials || "U"}</div>
            <span className="customer-navbar__name">{customerInfo?.name || "User"}</span>
            <svg
              className={`customer-navbar__dropdown-icon ${dropdownOpen ? 'open' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {dropdownOpen && (
              <div className="customer-navbar__dropdown">
                <button
                  className="customer-navbar__dropdown-item"
                  onClick={handleLogout}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginRight: '8px', display: 'inline-block', verticalAlign: 'middle' }}>
                    <path d="M6 14H3.333C2.979 14 2.639 13.86 2.389 13.61C2.139 13.36 2 13.02 2 12.667V3.333C2 2.979 2.139 2.639 2.389 2.389C2.639 2.139 2.979 2 3.333 2H6M11 11.333L14.333 8M14.333 8L11 4.667M14.333 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Keluar
                </button>
              </div>
            )}
          </div>

          <button
            className={`customer-navbar__hamburger ${mobileMenuOpen ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      <main className="dashboard-content">{children}</main>

      {/* Global Help Support Widget */}
      <SupportWidget customerInfo={fullUserInfo} />
    </div>
  );
}

