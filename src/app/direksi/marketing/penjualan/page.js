"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiMarketingPenjualanPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/orders");
  }, [router]);

  return (
    <Layout title="Penjualan | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Penjualan...</p>
      </div>
    </Layout>
  );
}
