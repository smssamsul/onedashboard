"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiSalesPercakapanPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/percakapan");
  }, [router]);

  return (
    <Layout title="Percakapan | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Percakapan...</p>
      </div>
    </Layout>
  );
}
