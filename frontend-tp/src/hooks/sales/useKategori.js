// hooks/useKategori.js
import { useEffect, useState } from "react";
import {
  getKategori,
  addKategori as addKategoriAPI,
  updateKategori as updateKategoriAPI,
  deleteKategori as deleteKategoriAPI,
} from "@/lib/sales/kategori";

export default function useKategori() {
  const [kategori, setKategori] = useState([]);
  const [loading, setLoading] = useState(true);

  // === GET ===
  const loadKategori = async () => {
    try {
      const data = await getKategori(); // <- panggil dari lib
      // Sort berdasarkan ID untuk menjaga urutan konsisten
      const sorted = Array.isArray(data) 
        ? [...data].sort((a, b) => (a.id || 0) - (b.id || 0))
        : [];
      setKategori(sorted);
    } catch (err) {
      console.error("❌ Gagal fetch kategori:", err);
    } finally {
      setLoading(false);
    }
  };

  // === ADD ===
  const addKategori = async (nama) => {
    try {
      const newKategori = await addKategoriAPI(nama); // <- dari lib
      if (newKategori) {
        setKategori((prev) => {
          const updated = [...prev, newKategori];
          // Sort berdasarkan ID untuk menjaga urutan konsisten
          return updated.sort((a, b) => (a.id || 0) - (b.id || 0));
        });
        return newKategori;
      }
      return null;
    } catch (err) {
      console.error("❌ Error addKategori:", err);
      throw err;
    }
  };

  // === UPDATE ===
  const updateKategori = async (id, nama) => {
    try {
      const updated = await updateKategoriAPI(id, nama); // <- dari lib
      if (updated) {
        setKategori((prev) => {
          // Update item tanpa mengubah urutan (berdasarkan ID)
          const updatedList = prev.map((k) => (k.id === id ? { ...k, ...updated } : k));
          // Pastikan tetap terurut berdasarkan ID
          return updatedList.sort((a, b) => (a.id || 0) - (b.id || 0));
        });
        return updated;
      }
      return null;
    } catch (err) {
      console.error("❌ Error updateKategori:", err);
      throw err;
    }
  };

  // === DELETE ===
  const deleteKategori = async (id) => {
    try {
      const success = await deleteKategoriAPI(id); // <- dari lib
      if (success) {
        setKategori((prev) => prev.filter((k) => k.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error("❌ Error deleteKategori:", err);
      throw err;
    }
  };

  useEffect(() => {
    loadKategori();
  }, []);

  return { kategori, addKategori, updateKategori, deleteKategori, loading };
}
