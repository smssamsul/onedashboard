"use client";

import Layout from "@/components/Layout";
import PengirimanResiPage from "@/components/sales/PengirimanResiPage";

export default function StaffPengirimanPage() {
  return (
    <Layout title="Pengiriman & Resi" description="Daftar pengiriman dan resi Biteship">
      <PengirimanResiPage ordersPath="/sales/staff/orders" />
    </Layout>
  );
}
