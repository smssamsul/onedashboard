"use client";

import { useState, useEffect } from "react";
import { trackSalesUploadedPaymentPurchase } from "@/lib/sales/metaPixelPurchase";

export default function TestPixelPage() {
  const [logs, setLogs] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [fullProductData, setFullProductData] = useState(null);
  const [loading, setLoading] = useState(false);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
    console.log(msg);
  };

  // Fetch daftar produk saat komponen dimuat
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          addLog("⚠️ Token tidak ditemukan. Anda harus login ke dashboard terlebih dahulu untuk melihat daftar produk.");
          return;
        }

        const res = await fetch("/api/sales/produk", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });

        const json = await res.json();
        if (json.success && json.data) {
          setProducts(json.data);
          addLog(`✅ Berhasil memuat ${json.data.length} produk dari API.`);
        } else {
          addLog("❌ Gagal memuat daftar produk.");
        }
      } catch (err) {
        addLog(`❌ Error memuat produk: ${err.message}`);
      }
    };

    fetchProducts();
  }, []);

  // Fetch detail produk (termasuk fb_pixel) saat produk dipilih
  const handleSelectProduct = async (e) => {
    const kode = e.target.value;
    setSelectedProduct(kode);
    setFullProductData(null);

    if (!kode) return;

    try {
      setLoading(true);
      addLog(`Mengambil detail produk untuk kode: ${kode}...`);

      const res = await fetch(`/api/landing/${kode}`);
      const json = await res.json();

      if (json.success && json.data) {
        setFullProductData(json.data);
        console.log("DATA PRODUK", json.data);

        // Ekstrak Pixel ID secara aman dari struktur baru (landingpage[0].analytics.facebook.pixels)
        let extractedPixels = [];
        try {
          const lp = json.data.landingpage || [];
          if (lp.length > 0 && lp[0].analytics?.facebook?.pixels) {
            extractedPixels = lp[0].analytics.facebook.pixels.map(p => p.id).filter(Boolean);
          }
        } catch (err) {
          console.warn("Gagal parse pixel dari landingpage", err);
        }

        // Fallback jika kosong, coba baca dari struktur lama
        const fbPixel = extractedPixels.length > 0 ? extractedPixels : (json.data.fb_pixel || []);

        // Simpan event yang lama
        const events = json.data.event_fb_pixel || [];

        // Pastikan kita timpa properti fb_pixel di fullProductData agar fungsi helper membaca format array ID yang benar
        json.data.fb_pixel = fbPixel;

        addLog(`✅ Detail produk dimuat. ID Pixel: ${JSON.stringify(fbPixel)}, Events: ${JSON.stringify(events)}`);
      } else {
        addLog("❌ Gagal memuat detail produk dari endpoint landing.");
      }
    } catch (err) {
      addLog(`❌ Error memuat detail: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTestPurchase = () => {
    if (!fullProductData) {
      addLog("⚠️ Silakan pilih produk terlebih dahulu!");
      return;
    }

    addLog(`Menjalankan test event Purchase untuk produk: ${fullProductData.nama}...`);

    // Data demo disusun berdasarkan produk yang dipilih
    const demoData = {
      produk: {
        id: fullProductData.id,
        nama: fullProductData.nama,
        kategori_rel: fullProductData.kategori_rel,
        fb_pixel: fullProductData.fb_pixel || [],
        // event_fb_pixel: fullProductData.event_fb_pixel || []
      },
      value: fullProductData.harga || 150000,
      currency: "IDR",
      orderId: "TEST-ORD-001"
    };

    const isTriggered = trackSalesUploadedPaymentPurchase(demoData);

    if (isTriggered) {
      addLog("✅ Fungsi trackSalesUploadedPaymentPurchase berhasil dipanggil. Cek ekstensi Meta Pixel Helper di browser Anda!");
    } else {
      addLog("❌ Gagal memanggil fungsi (isTriggered = false). Pastikan produk ini memiliki Pixel ID dan event Purchase diaktifkan.");
    }
  };

  const handleTestCheckout = () => {
    if (!fullProductData) {
      addLog("⚠️ Silakan pilih produk terlebih dahulu!");
      return;
    }

    addLog("Menjalankan test event InitiateCheckout / AddToCart...");

    if (typeof window !== "undefined" && typeof window.fbq === "function") {
      const demoParams = {
        content_ids: [String(fullProductData.id)],
        content_type: "product",
        content_name: fullProductData.nama,
        value: fullProductData.harga || 150000,
        currency: "IDR"
      };

      window.fbq("track", "InitiateCheckout", demoParams);
      window.fbq("track", "AddToCart", demoParams);

      addLog("✅ Event InitiateCheckout & AddToCart terkirim via fbq langsung. Cek Meta Pixel Helper!");
    } else {
      addLog("❌ Error: fbq tidak tersedia di window. Pastikan script base pixel Facebook sudah termuat.");
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>Test Meta Pixel Events</h1>
      <p style={{ marginBottom: "20px", color: "#666" }}>
        Halaman ini dibuat khusus untuk melakukan testing trigger event Facebook Pixel dengan data produk Anda.
        Gunakan ekstensi <strong>Meta Pixel Helper</strong> di Chrome untuk memverifikasi apakah event berhasil ditangkap.
      </p>

      <div style={{ marginBottom: "30px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <label htmlFor="product-select" style={{ fontWeight: "bold" }}>Pilih Produk untuk Test:</label>
        <select
          id="product-select"
          value={selectedProduct}
          onChange={handleSelectProduct}
          style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc", fontSize: "16px" }}
        >
          <option value="">-- Pilih Produk --</option>
          {products.map(p => (
            <option key={p.id} value={p.kode}>{p.nama} ({p.kode})</option>
          ))}
        </select>
        {loading && <span style={{ fontSize: "14px", color: "#666" }}>Memuat detail produk...</span>}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "30px" }}>
        <button
          onClick={handleTestPurchase}
          disabled={!fullProductData || loading}
          style={{
            padding: "10px 20px",
            background: !fullProductData || loading ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: !fullProductData || loading ? "not-allowed" : "pointer",
            fontWeight: "bold"
          }}
        >
          Test Event "Purchase"
        </button>
        <button
          onClick={handleTestCheckout}
          disabled={!fullProductData || loading}
          style={{
            padding: "10px 20px",
            background: !fullProductData || loading ? "#ccc" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: !fullProductData || loading ? "not-allowed" : "pointer",
            fontWeight: "bold"
          }}
        >
          Test Event "Checkout"
        </button>
      </div>

      <div style={{ background: "#f5f5f5", padding: "20px", borderRadius: "8px", minHeight: "200px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "15px", fontSize: "16px" }}>Logs:</h3>
        {logs.length === 0 ? (
          <p style={{ color: "#999", fontStyle: "italic", margin: 0 }}>Belum ada log aktifitas...</p>
        ) : (
          <ul style={{ paddingLeft: "20px", margin: 0, color: "#333", fontSize: "14px", listStyle: "none", padding: 0 }}>
            {logs.map((log, i) => (
              <li key={i} style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid #ddd" }}>{log}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
