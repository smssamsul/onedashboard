// src/hooks/useProducts.js
"use client";

import { useEffect, useState } from "react";

// ⛔ INI YANG BENER: Pakai lib/products
import {
  getProducts,
  deleteProduct,
  duplicateProduct,
  updateProductStatus
} from "@/lib/sales/products";

export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =====================================================
  // 🔥 Ambil semua produk saat halaman pertama kali ke-load
  // =====================================================
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const data = await getProducts(false, { disableToast: true });
        setProducts(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("❌ Error fetching products:", err);
        setError(err?.message || "Gagal memuat produk");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // =====================================================
  // 🧹 Hapus produk (hard delete - benar-benar hapus dari database)
  // =====================================================
  const handleDelete = async (id) => {
    try {
      // Hard delete dengan force=true
      await deleteProduct(id, true);

      // Debug

      // Hapus dari local state
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("❌ Error deleting product:", err);
      setError(err?.message || "Gagal menghapus produk");
    }
  };

  // =====================================================
  // 📑 Duplikasi produk
  // =====================================================
  const handleDuplicate = async (id) => {
    try {
      const newProduct = await duplicateProduct(id);

      // Debug

      if (!newProduct) return;

      setProducts((prev) => [newProduct, ...prev]);
    } catch (err) {
      console.error("❌ Error duplicating product:", err);
      setError(err?.message || "Gagal menduplikasi produk");
    }
  };

  return {
    products,
    loading,
    error,
    handleDelete,
    handleDuplicate,
    setProducts,
  };
}
