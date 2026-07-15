"use client";

import OngkirCalculator from "@/components/OngkirCalculator";

export default function CekOngkirPage() {
  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "24px", color: "#111827" }}>
        Cek Ongkir
      </h1>
      <OngkirCalculator mode="dropdown" />
    </div>
  );
}
