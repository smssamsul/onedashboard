import { getBackendUrl } from "@/config/api";
import ScheduleList from "../ScheduleList";
import PublicNavbar from "../PublicNavbar";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getUnitBisnisSchedules(slug) {
  try {
    const url = getBackendUrl(`/seminar/schedules/${encodeURIComponent(slug)}`);
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    if (!res.ok) {
      console.warn(`[SERVER] Fetch schedules (${slug}) failed: ${res.status}`);
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error(`[SERVER] Error fetching seminar schedules (${slug}):`, error);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const title = `Jadwal Seminar Terdekat | Ternak Properti`;
  return {
    title,
    description: `Daftar jadwal seminar terdekat untuk unit bisnis ${slug}. Pilih jadwal yang sesuai dan daftar sekarang.`,
    openGraph: {
      title,
      type: 'website',
    },
  };
}

export default async function JadwalSeminarPerUnitBisnisPage({ params }) {
  const { slug } = await params;
  const result = await getUnitBisnisSchedules(slug);
  const products = (result?.data || []).filter(p => p.jadwal_rel && p.jadwal_rel.length > 0);

  return (
    <div className="min-h-screen font-sans bg-[#fccc04]">
      <PublicNavbar />

      {/* Hero Section */}
      <div className="w-full bg-[#fccc04] pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4 mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900">
            Siap Naik Level di Properti!
          </h2>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-medium text-gray-900 leading-tight">
            Biar target kamu makin tinggi, kamu juga butuh strategi yang mainnya di level berikutnya!
          </h1>
        </div>

        {/* Hero Image */}
        <div className="max-w-5xl mx-auto bg-black rounded-lg overflow-hidden shadow-2xl">
          <img
            src="https://ternakproperti.com/wp-content/uploads/2026/03/1766719349581-Landing-page-v1-1.webp"
            alt="Seminar Ternak Properti"
            className="w-full h-auto object-cover"
          />
        </div>
      </div>

      {/* Main Content Section */}
      <div className="pb-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-5xl">
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-md border border-gray-100 max-w-xl mx-auto">
              <h3 className="text-2xl font-extrabold text-black">Belum ada jadwal seminar terdekat</h3>
              <p className="text-black mt-3">Silakan cek kembali secara berkala untuk update jadwal terbaru kami.</p>
            </div>
          ) : (
            <ScheduleList products={products} />
          )}
        </div>
      </div>
    </div>
  );
}
