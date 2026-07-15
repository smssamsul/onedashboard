"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiSalesAIPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/ai/setting");
  }, [router]);

  return (
    <Layout title="Data AI | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data AI...</p>
      </div>
    </Layout>
  );
}
