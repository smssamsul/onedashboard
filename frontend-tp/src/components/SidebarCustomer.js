"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  ClipboardList,
  ShoppingBag,
  User,
  MessageSquare,
  LogOut,
  Menu,
} from "lucide-react";
import "@/styles/customer/cstsidebar.css";

export default function SidebarCustomer() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState(false);

  const menu = [
    { label: "Dashboard", href: "/customer", icon: <Home size={18} /> },
    { label: "Jadwal Saya", href: "/customer/jadwal", icon: <ClipboardList size={18} /> },
    { label: "Paket Saya", href: "/customer/paket", icon: <ShoppingBag size={18} /> },
    { label: "Profil Saya", href: "/customer/profile", icon: <User size={18} /> },
    { label: "Bantuan", href: "/customer/bantuan", icon: <MessageSquare size={18} /> },
    { label: "Logout", href: "/logout", icon: <LogOut size={18} /> },
  ];

  // === RESPONSIVE HANDLER ===
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) setExpandedMobile((prev) => !prev);
  };

  return (
    <>
      <aside className={`sidebar ${expandedMobile ? "expanded-mobile" : ""}`}>
        {/* TITLE */}
        <div className="sidebar-logo border-b border-gray-100 py-6 flex items-center justify-center">
          <img src="/assets/logo.png" alt="Ternak Properti" className="h-12 object-contain" />
        </div>
        <h2 className="sidebar-title mt-2 px-4 text-gray-600 text-sm font-medium">CUSTOMER</h2>

        {/* MENU */}
        <ul className="sidebar-menu mt-2">
          {menu.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`sidebar-item ${isActive ? "sidebar-item-active" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* FOOTER */}
        <div className="sidebar-footer text-xs text-gray-400 mt-auto py-4 border-t border-gray-100 text-center">
          © 2025 Ternak Properti
        </div>
      </aside>

      {/* === MOBILE BURGER BUTTON === */}
      {isMobile && (
        <button
          onClick={toggleSidebar}
          className="sidebar-toggle-btn"
          aria-label="Toggle sidebar"
        >
          <Menu size={18} />
        </button>
      )}
    </>
  );
}
