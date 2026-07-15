"use client";

// Client Component wrapper untuk bagian interaktif (form, FAQ, countdown, dll)
// Memisahkan JavaScript interaktif dari Server Component untuk mengurangi bundle size

import { Suspense } from "react";
import ProductPageClient from "./ProductPageClient";

export default function ProductClientWrapper({ kodeProduk, initialData }) {
  return (
    <Suspense fallback={
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <p>Memuat halaman...</p>
      </div>
    }>
      <ProductPageClient kodeProduk={kodeProduk} initialData={initialData} />
    </Suspense>
  );
}

