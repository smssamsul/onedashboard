import { useState, useMemo, useCallback } from "react";

/**
 * usePriceCalculator
 * Mengelola logika perhitungan harga total, termasuk bundling dan kategori produk.
 * 
 * @param {Object} productData - Data produk dari API
 * @param {number} ongkir - Biaya ongkir saat ini
 * @param {number|null} selectedBundling - Index bundling yang dipilih (null jika tidak ada)
 */
export function usePriceCalculator(productData, ongkir, selectedBundling) {

    // ✅ Helper: Get Kategori ID (Memoized internally via useMemo logic below)
    const productKategoriId = useMemo(() => {
        if (!productData) return null;
        return productData.kategori_id
            || (productData.kategori_rel?.id ? Number(productData.kategori_rel.id) : null)
            || (productData.kategori ? Number(productData.kategori) : null);
    }, [productData]);

    const isKategoriBuku = useCallback(() => {
        return productKategoriId === 4; // Kategori Buku (4)
    }, [productKategoriId]);

    // ✅ Helper: Parse harga safely
    const parsePrice = (price) => {
        if (!price) return 0;
        if (typeof price === 'number') return price;
        return parseInt(price.replace(/[^\d]/g, ""), 10) || 0;
    };

    // ✅ Main Calculation Logic
    const priceCalculation = useMemo(() => {
        if (!productData) {
            return { basePrice: 0, totalPrice: 0 };
        }

        const bundlingData = productData?.bundling && Array.isArray(productData.bundling) ? productData.bundling : [];
        const isBundling = bundlingData.length > 0;

        let basePrice = 0;

        // Logic: Jika ada bundling, harga diambil dari bundling yang dipilih.
        // Jika tidak ada bundling, ambil dari harga atau harga_asli.
        if (isBundling) {
            if (selectedBundling !== null && bundlingData[selectedBundling]) {
                basePrice = parsePrice(bundlingData[selectedBundling].harga);
            } else {
                // Default 0 jika bundling belum dipilih (meminta user memilih)
                basePrice = 0;
            }
        } else {
            // Bukan produk bundling, gunakan harga atau harga_asli
            basePrice = parsePrice(productData.harga || productData.harga_asli);
        }

        // Hitung shipping cost logic
        // Logic existing: shipping cost hanya ditambahkan ke total jika kategori buku (4)
        const isBuku = productKategoriId === 4;
        const shippingCost = isBuku ? (ongkir || 0) : 0;

        // Total Price
        const totalPrice = basePrice + shippingCost;

        return {
            basePrice,
            totalPrice,
            isBuku
        };
    }, [productData, selectedBundling, ongkir, productKategoriId]);

    return {
        basePrice: priceCalculation.basePrice,
        totalPrice: priceCalculation.totalPrice,
        isKategoriBuku,
        productKategoriId
    };
}
