"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiSalesLeadsAIPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/leads-ai");
  }, [router]);

  return (
    <Layout title="Data Leads AI | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Leads AI...</p>
      </div>
    </Layout>
  );
}
