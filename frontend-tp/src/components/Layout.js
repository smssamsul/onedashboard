"use client";

import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { Menu } from "lucide-react";
import Sidebar from "@/components/Sidebar";
import { getDivisionHome } from "@/lib/divisionRoutes";
import {
  isSuperOpsUser,
  inferSuperOpsTabFromPath,
  getSuperOpsHomeRoute,
  SUPER_OPS_TAB_STORAGE_KEY,
} from "@/lib/superOps";
import "@/styles/sales/layout.css";
import "@/styles/toast.css";
import "../app/globals.css";
import "primereact/resources/themes/lara-light-amber/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

function formatLongDateId(date) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

function derivePageTitle(pathname) {
  if (!pathname) return "Dashboard";
  const cleaned = String(pathname).split("?")[0].split("#")[0];
  const seg = cleaned.split("/").filter(Boolean).pop() || "dashboard";
  return seg
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateBreadcrumb(pathname) {
  if (!pathname) return [];
  const cleaned = String(pathname).split("?")[0].split("#")[0];
  const segments = cleaned.split("/").filter(Boolean);
  
  // Map section names based on path
  const sectionMap = {
    customers: "CUSTOMERS",
    orders: "OPERATIONS",
    pengiriman: "OPERATIONS",
    products: "OPERATIONS",
    kategori: "OPERATIONS",
    users: "USER MANAGEMENT",
    broadcast: "COMMUNICATION",
    // crm intentionally left out so paths like /sales/staff/crm fallback to full path segments
    leads: "CUSTOMERS",
    report: "CUSTOMERS",
  };
  
  // If only one segment (e.g., /sales, /admin, /finance), return empty
  if (segments.length <= 1) {
    return [];
  }
  
  const breadcrumb = [];
  const lastSegment = segments[segments.length - 1];
  const sectionName = sectionMap[lastSegment.toLowerCase()];
  
  if (sectionName) {
    // Show section name and page name
    const label = lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    
    const basePath = segments[0]; // sales, admin, finance
    const currentPath = `/${segments.join("/")}`;
    const sectionPath = `/${basePath}/${lastSegment}`;
    
    breadcrumb.push({
      section: sectionName,
      sectionHref: sectionPath,
      label,
      href: currentPath,
      isLast: true,
    });
  } else {
    // Fallback: show all segments
    let currentPath = "";
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = segment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      
      breadcrumb.push({
        label,
        href: currentPath,
        isLast: index === segments.length - 1,
      });
    });
  }
  
  return breadcrumb;
}


function isTokenExpired() {
  try {
    const loginTime = localStorage.getItem("login_time");
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000;
    return !loginTime || now - parseInt(loginTime) > maxAge;
  } catch {
    return true;
  }
}

export default function Layout({ children, title, description, aboveContent = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [superOpsTab, setSuperOpsTab] = useState("hub");
  const accountRef = useRef(null);

  const isSuperOps = useMemo(() => isSuperOpsUser(user), [user]);

  useEffect(() => {
    if (pathname.includes("/login")) {
      setIsAuthorized(true);
      return;
    }

    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData || isTokenExpired()) {
      localStorage.clear();
      toast.error("Anda belum login!");
      setIsAuthorized(false);
      // Don't return null immediately, let redirect happen
      setTimeout(() => router.replace("/login"), 1000);
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      if (isSuperOpsUser(parsedUser)) {
        setIsAuthorized(true);
        return;
      }

      // Check if user is accessing the correct route based on their level
      const userDivisi = parsedUser?.divisi;
      const userLevel = parsedUser?.level ? Number(parsedUser.level) : null;
      const expectedRoute = getDivisionHome(userDivisi, userLevel);
      
      // ✅ FIX: Skip redirect logic untuk HR (divisi 5) - HR tidak punya level staff/head
      const isHR = userDivisi === 5 || userDivisi === "5" || userDivisi === "hr";
      const isMarketing = userDivisi === 6 || userDivisi === "6" || userDivisi === "marketing";
      const isMultimedia = userDivisi === 7 || userDivisi === "7" || userDivisi === "multimedia" || userDivisi === "mm";
      const isIT = userDivisi === 8 || userDivisi === "8" || userDivisi === "it";
      const isDireksi = userLevel === 9 || userLevel === "9" || userDivisi === 9 || userDivisi === "9";
      
      // Direksi (level 9 atau divisi 9) - redirect ke /direksi
      if (isDireksi && !pathname.startsWith("/direksi")) {
        router.replace("/direksi");
        return;
      }
      
      // Redirect logic based on level (hanya untuk Sales dan Finance)
      if (!isHR && !isMarketing && !isMultimedia && !isIT && !isDireksi) {
        if (userLevel === 2) {
          // Staff level - should be on /{division}/staff or sub-routes
          if (pathname === "/sales" || pathname === "/finance") {
            // Staff trying to access leader route - redirect to staff route
            router.replace(expectedRoute);
            return;
          }
        } else if (userLevel === 1) {
          // Leader level - should be on /{division} or sub-routes (but not /staff)
          if (pathname === "/sales/staff" || pathname === "/finance/staff") {
            // Leader trying to access staff route - redirect to leader route
            router.replace(expectedRoute);
            return;
          }
          // Also redirect if accessing /staff sub-routes
          if (pathname.startsWith("/sales/staff/") || pathname.startsWith("/finance/staff/")) {
            router.replace(expectedRoute);
            return;
          }
        }
      }
      
      setIsAuthorized(true);
    } catch {
      setIsAuthorized(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    if (!user || !isSuperOpsUser(user)) return;
    setSuperOpsTab(inferSuperOpsTabFromPath(pathname));
  }, [pathname, user]);

  const isLoginPage = pathname.includes("/login");
  const showShell = !isLoginPage;

  const userInitials = useMemo(() => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  }, [user]);

  const pageTitle = useMemo(() => title || derivePageTitle(pathname), [title, pathname]);
  const todayLabel = useMemo(() => formatLongDateId(new Date()), []);
  const breadcrumb = useMemo(() => generateBreadcrumb(pathname), [pathname]);

  // Document mousedown listener for account menu - MUST be before any conditional return
  useEffect(() => {
    const onDocClick = (e) => {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(e.target)) setIsAccountOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Show loading state instead of null to prevent blank screen
  if (!isAuthorized && !pathname.includes("/login")) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh" 
      }}>
        <p>Sebentar ya, sedang disiapkan datanya...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };  

  return (
    <>
      <Head>
        <title>{title || "One Dashboard"}</title>
        <meta
          name="description"
          content={
            description ||
            "One Dashboard — Manage users, products, and reports easily."
          }
        />
      </Head>

      <div className={`layout-wrapper ${showShell ? "layout-wrapper--private" : ""}`}>
        {showShell && (
          <Sidebar
            role={user?.role || "admin"}
            isOpen={isSidebarOpen}
            onToggle={() => setIsSidebarOpen((prev) => !prev)}
            isSuperOps={isSuperOps}
            superOpsTab={superOpsTab}
          />
        )}

        <main className={`layout-main ${showShell ? "layout-main--with-sidebar" : ""} ${showShell && !isSidebarOpen ? "sidebar-collapsed" : ""}`}>
          {showShell && (
            <header className="layout-header" role="banner">
              <div className="layout-header__left">
                <button
                  type="button"
                  className="layout-header__burger"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  aria-label="Toggle sidebar"
                >
                  <Menu size={20} />
                </button>

                {isSuperOps && (
                  <nav className="layout-super-ops-tabs" aria-label="Ganti divisi">
                    {[
                      { id: "hub", label: "Pusat" },
                      { id: "sales", label: "Sales" },
                      { id: "hr", label: "HR" },
                      { id: "finance", label: "Finance" },
                    ].map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        className={`layout-super-ops-tab ${superOpsTab === id ? "is-active" : ""}`}
                        onClick={() => {
                          try {
                            localStorage.setItem(SUPER_OPS_TAB_STORAGE_KEY, id);
                          } catch {
                            /* ignore */
                          }
                          router.push(getSuperOpsHomeRoute(id));
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </nav>
                )}

                <div className="layout-header__breadcrumb">
                  {breadcrumb.length > 0 ? (
                    breadcrumb.map((crumb, index) => (
                      <span key={crumb.href || index} className="layout-breadcrumb__item">
                        {index > 0 && <span className="layout-breadcrumb__separator"> / </span>}
                        {crumb.section && crumb.isLast ? (
                          <>
                            <Link href={crumb.sectionHref || crumb.href} className="layout-breadcrumb__link">
                              {crumb.section}
                            </Link>
                            <span className="layout-breadcrumb__separator"> / </span>
                            <span className="layout-breadcrumb__current">{crumb.label}</span>
                          </>
                        ) : crumb.isLast ? (
                          <span className="layout-breadcrumb__current">{crumb.label}</span>
                        ) : (
                          <Link href={crumb.href} className="layout-breadcrumb__link">
                            {crumb.label}
                          </Link>
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="layout-breadcrumb__current">Dashboard</span>
                  )}
                </div>
              </div>

              <div className="layout-header__actions">
                <div className="layout-account" ref={accountRef}>
                  <button
                    type="button"
                    className={`layout-account__trigger ${isAccountOpen ? "is-open" : ""}`}
                    onClick={() => setIsAccountOpen((p) => !p)}
                    aria-haspopup="menu"
                    aria-expanded={isAccountOpen}
                  >
                    <span className="layout-account__avatar" aria-hidden="true">
                      {userInitials}
                    </span>
                    <span className="layout-account__name" title={user?.name || "User"}>
                      {user?.name || "User"}
                    </span>
                    <span className="layout-account__chevron" aria-hidden="true" />
                  </button>

                  {isAccountOpen && (
                    <div className="layout-account__menu" role="menu">
                      <button
                        type="button"
                        className="layout-account__menu-item"
                        role="menuitem"
                        onClick={() => setIsAccountOpen(false)}
                      >
                        Profile
                      </button>
                      <button
                        type="button"
                        className="layout-account__menu-item layout-account__menu-item--danger"
                        role="menuitem"
                        onClick={() => {
                          setIsAccountOpen(false);
                          handleLogout();
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>
          )}

          {showShell && aboveContent}
          <section className="layout-content">{children}</section>
        </main>
      </div>
    </>
  );
}
