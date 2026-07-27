"use client";

import Layout from "@/components/Layout";
import MetaAdsOverviewContent from "@/components/marketing/MetaAdsOverviewContent";

/**
 * Versi lihat-saja untuk staff Sales. Komponen & endpoint sama dengan
 * menu Marketing, tapi tanpa tombol Sync maupun hubungkan akun —
 * staff hanya membaca angkanya, tidak menarik data atau mengelola akun.
 *
 * Sengaja punya route sendiri di bawah /sales/staff (bukan memakai
 * /sales/meta-ads-report milik head sales) supaya sidebar tetap
 * menampilkan menu staff, karena basePath sidebar ditentukan dari path.
 */
export default function StaffSalesMetaAdsReportPage() {
  return (
    <Layout title="Laporan Meta Ads">
      <MetaAdsOverviewContent showConnectButton={false} showSyncButton={false} />
    </Layout>
  );
}
