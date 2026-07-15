"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiHRCutiPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/hr/cuti");
  }, [router]);

  return (
    <Layout title="Data Cuti | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Cuti...</p>
      </div>
    </Layout>
  );
}
