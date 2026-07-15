"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiMarketingLeadsPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/leads");
  }, [router]);

  return (
    <Layout title="Lead | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Lead...</p>
      </div>
    </Layout>
  );
}
