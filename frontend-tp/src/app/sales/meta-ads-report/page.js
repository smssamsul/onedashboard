"use client";

import Layout from "@/components/Layout";
import MetaAdsOverviewContent from "@/components/marketing/MetaAdsOverviewContent";

/**
 * Versi read-only untuk tim Sales - endpoint sama dengan menu Marketing,
 * tidak ada tombol aksi kelola campaign di sini.
 */
export default function SalesMetaAdsReportPage() {
  return (
    <Layout title="Laporan Meta Ads">
      <MetaAdsOverviewContent showConnectButton={false} />
    </Layout>
  );
}
