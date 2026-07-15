"use client";

import { useState, useEffect } from "react";
import { getCustomerSession } from "@/lib/customerAuth";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const session = getCustomerSession();
      if (!session.token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/sales/produk", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${session.token}`,
          },
        });

        const data = await response.json();
        
        if (data.success && data.data && Array.isArray(data.data)) {
          const activeProducts = data.data.filter((p) => p.status === "1" || p.status === 1);
          setProducts(activeProducts);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("[DASHBOARD] Failed to fetch products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return { products, loading };
}


