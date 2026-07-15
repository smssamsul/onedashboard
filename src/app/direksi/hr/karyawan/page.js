"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiHRKaryawanPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/hr/karyawan");
  }, [router]);

  return (
    <Layout title="Data Karyawan | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Data Karyawan...</p>
      </div>
    </Layout>
  );
}
