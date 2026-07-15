"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiSalesProductsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/products");
  }, [router]);

  return (
    <Layout title="Data Produk | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Produk...</p>
      </div>
    </Layout>
  );
}
