// hooks/useUnitBisnis.js
import { useEffect, useState } from "react";
import {
  getUnitBisnis,
  addUnitBisnis as addUnitBisnisAPI,
  updateUnitBisnis as updateUnitBisnisAPI,
  deleteUnitBisnis as deleteUnitBisnisAPI,
} from "@/lib/sales/unitBisnis";

export default function useUnitBisnis() {
  const [unitBisnis, setUnitBisnis] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadUnitBisnis = async () => {
    try {
      const data = await getUnitBisnis();
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => (a.id || 0) - (b.id || 0))
        : [];
      setUnitBisnis(sorted);
    } catch (err) {
      console.error("❌ Gagal fetch unit bisnis:", err);
    } finally {
      setLoading(false);
    }
  };

  const addUnitBisnis = async (nama) => {
    try {
      const newItem = await addUnitBisnisAPI(nama);
      if (newItem) {
        setUnitBisnis((prev) => [...prev, newItem].sort((a, b) => (a.id || 0) - (b.id || 0)));
        return newItem;
      }
      return null;
    } catch (err) {
      console.error("❌ Error addUnitBisnis:", err);
      throw err;
    }
  };

  const updateUnitBisnis = async (id, nama) => {
    try {
      const updated = await updateUnitBisnisAPI(id, nama);
      if (updated) {
        setUnitBisnis((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ...updated } : u)).sort((a, b) => (a.id || 0) - (b.id || 0))
        );
        return updated;
      }
      return null;
    } catch (err) {
      console.error("❌ Error updateUnitBisnis:", err);
      throw err;
    }
  };

  const deleteUnitBisnis = async (id) => {
    try {
      const success = await deleteUnitBisnisAPI(id);
      if (success) {
        setUnitBisnis((prev) => prev.filter((u) => u.id !== id));
        return true;
      }
      return false;
    } catch (err) {
      console.error("❌ Error deleteUnitBisnis:", err);
      throw err;
    }
  };

  useEffect(() => {
    loadUnitBisnis();
  }, []);

  return { unitBisnis, addUnitBisnis, updateUnitBisnis, deleteUnitBisnis, loading };
}
