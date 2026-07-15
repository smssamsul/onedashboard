"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiSalesCustomersPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/sales/customers");
  }, [router]);

  return (
    <Layout title="Data Customer | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Customer...</p>
      </div>
    </Layout>
  );
}
