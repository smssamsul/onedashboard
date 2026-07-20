"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function DireksiStrukturOrganisasiPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/hr/struktur-organisasi");
  }, [router]);

  return (
    <Layout title="Struktur Organisasi | Direksi">
      <div style={{ padding: "24px", textAlign: "center" }}>
        <p>Mengarahkan ke halaman Struktur Organisasi...</p>
      </div>
    </Layout>
  );
}
