"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiHRAbsensiPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/hr/absensi");
  }, [router]);

  return (
    <Layout title="Data Absensi | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Absensi...</p>
      </div>
    </Layout>
  );
}
