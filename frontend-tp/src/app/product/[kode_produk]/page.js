import { headers } from "next/headers";
import ProductClient from "./ProductClient";
import { getBackendUrl } from "@/config/api";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to fetch product data on server
async function getProduct(kode_produk) {
  try {
    const url = getBackendUrl(`landing/${kode_produk}`);

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!res.ok) {
      console.warn(`[SERVER] Fetch product failed: ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("[SERVER] Error fetching product:", error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { kode_produk } = await params;
  const result = await getProduct(kode_produk);

  if (!result || !result.success) {
    return {
      title: 'Product Not Found',
    };
  }

  const { data: product, landingpage } = result;

  // Logic ekstraksi settings yang sama dengan Client Component
  const settings = landingpage && Array.isArray(landingpage)
    ? landingpage.find(item => item.type === 'settings')
    : null;

  const title = settings?.seo_title || settings?.page_title || product?.nama || "Product Page";
  const description = settings?.meta_description || product?.deskripsi_singkat || "";

  const images = [];
  // Prioritas image: meta_image > logo > gambar_utama
  const metaImage = settings?.meta_image || settings?.logo || product?.gambar_utama;
  if (metaImage) {
    images.push(metaImage);
  }

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      images: images,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: description,
      images: images,
    },
  };
}

export async function generateViewport() {
  return {
    width: "device-width",
    initialScale: 1.0,
    maximumScale: 5.0,
    userScalable: true,
  };
}

// ✅ Server Component Wrapper
export default async function ProductPage({ params }) {
  const { kode_produk } = await params;

  // Kita TIDAK lagi fetch data di sini untuk dikirim ke Client sebagai props.
  // Kenapa? Karena props sering terjebak di Router Cache Next.js.
  // Server Component ini sekarang hanya bertugas sebagai 'cangkang' dan penyuplai metadata (generateMetadata).

  return (
    <ProductClient
      key={kode_produk}
    // initialProductData={null}
    // initialLandingPage={null}
    />
  );
}

