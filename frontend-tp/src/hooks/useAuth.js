"use client";
import { useState, useEffect } from "react";
import { getUser, logout } from "@/lib/auth";
import { isTokenExpired } from "@/lib/checkToken";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (isTokenExpired()) {
          console.warn("⏰ Token kadaluarsa — logout otomatis");
          logout();
          return;
        }

        const data = await getUser();
        if (data) setUser(data.user || data);
      } catch (err) {
        console.error("Gagal ambil data user:", err);
        logout(); // token invalid dari backend
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // ⏳ auto-cek tiap 5 menit
    const interval = setInterval(() => {
      if (isTokenExpired()) {
        logout();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { user, loading };
};
