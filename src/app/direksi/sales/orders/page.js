"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiSalesOrdersPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ke halaman sales orders yang sudah ada
    router.push("/sales/orders");
  }, [router]);

  return (
    <Layout title="Data Order | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Order...</p>
      </div>
    </Layout>
  );
}
