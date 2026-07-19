"use client";

import Layout from "@/components/Layout";
import MetaAdsOverviewContent from "@/components/marketing/MetaAdsOverviewContent";

export default function MetaAdsOverviewPage() {
  return (
    <Layout title="Meta Ads - Overview">
      <MetaAdsOverviewContent connectAccountHref="/marketing/meta-ads/accounts" />
    </Layout>
  );
}
