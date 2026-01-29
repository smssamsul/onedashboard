"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProductsSection({ products, isLoading, onProductClick }) {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const [itemsPerSlide, setItemsPerSlide] = useState(4);

  useEffect(() => {
    const updateItemsPerSlide = () => {
      if (window.innerWidth < 640) setItemsPerSlide(1);
      else if (window.innerWidth < 1024) setItemsPerSlide(2);
      else setItemsPerSlide(4);
    };

    updateItemsPerSlide();
    window.addEventListener("resize", updateItemsPerSlide);
    return () => window.removeEventListener("resize", updateItemsPerSlide);
  }, []);

  useEffect(() => {
    if (products.length <= itemsPerSlide) {
      setCurrentSlide(0);
      return;
    }

    const totalSlides = Math.ceil(products.length / itemsPerSlide);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(interval);
  }, [products, itemsPerSlide]);

  const formatPrice = (price) => {
    if (!price) return "Rp 0";
    return `Rp ${parseInt(price).toLocaleString("id-ID")}`;
  };

  // Handle product click berdasarkan kategori
  const handleProductClick = (product) => {
    if (onProductClick) {
      onProductClick(product);
      return;
    }

    const kategoriId = product.kategori_rel?.id || product.kategori_id || product.kategori;
    const kategoriIdNum = Number(kategoriId);

    // Mapping kategori ke aksi
    switch (kategoriIdNum) {
      case 1: // Ebook - Link GDrive
        if (product.gdrive_link || product.link_gdrive) {
          window.open(product.gdrive_link || product.link_gdrive, '_blank');
        } else {
          // Fallback ke landing page jika tidak ada link
          const generateSlug = (text) =>
            (text || "")
              .toString()
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9 -]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-");

          let kodeProduk = product.kode || (product.url ? product.url.replace(/^\//, '') : null);
          if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
            kodeProduk = generateSlug(product.nama);
          }
          if (kodeProduk) {
            window.open(`/landing/${kodeProduk}`, '_blank');
          }
        }
        break;

      case 2: // Webinar - Link Zoom Meet
        // Cari order yang terkait dengan produk ini
        router.push(`/customer/webinar/${product.order_id || product.id}`);
        break;

      case 3: // Seminar - Info lokasi atau link zoom meet
        // Cek apakah ada link zoom, jika tidak tampilkan info lokasi
        if (product.zoom_link || product.webinar?.join_url) {
          router.push(`/customer/webinar/${product.order_id || product.id}`);
        } else if (product.lokasi_seminar || product.seminar_location) {
          // Tampilkan modal atau halaman dengan info lokasi
          alert(`Lokasi Seminar:\n${product.lokasi_seminar || product.seminar_location}`);
        } else {
          // Fallback ke landing page
          const generateSlug = (text) =>
            (text || "")
              .toString()
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9 -]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-");

          let kodeProduk = product.kode || (product.url ? product.url.replace(/^\//, '') : null);
          if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
            kodeProduk = generateSlug(product.nama);
          }
          if (kodeProduk) {
            window.open(`/landing/${kodeProduk}`, '_blank');
          }
        }
        break;

      case 4: // Buku - Lacak pesanan dan detail pesanan
        router.push(`/customer/orders/${product.order_id || product.id}`);
        break;

      case 5: // Ecourse - Link YouTube embed
        if (product.youtube_link || product.link_youtube || product.video) {
          // Extract YouTube video ID jika full URL
          let videoId = product.youtube_link || product.link_youtube || product.video;
          if (videoId.includes('youtube.com/watch?v=')) {
            videoId = videoId.split('v=')[1]?.split('&')[0];
          } else if (videoId.includes('youtu.be/')) {
            videoId = videoId.split('youtu.be/')[1]?.split('?')[0];
          }

          // Buka halaman dengan YouTube embed
          router.push(`/customer/ecourse/${product.order_id || product.id}?video=${videoId}`);
        } else {
          // Fallback ke landing page
          const generateSlug = (text) =>
            (text || "")
              .toString()
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9 -]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-");

          let kodeProduk = product.kode || (product.url ? product.url.replace(/^\//, '') : null);
          if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
            kodeProduk = generateSlug(product.nama);
          }
          if (kodeProduk) {
            window.open(`/landing/${kodeProduk}`, '_blank');
          }
        }
        break;

      case 6: // Workshop - Info lokasi atau link zoom meet
        // Cek apakah ada link zoom, jika tidak tampilkan info lokasi
        if (product.zoom_link || product.webinar?.join_url) {
          router.push(`/customer/webinar/${product.order_id || product.id}`);
        } else if (product.lokasi_workshop || product.workshop_location) {
          // Tampilkan modal atau halaman dengan info lokasi
          alert(`Lokasi Workshop:\n${product.lokasi_workshop || product.workshop_location}`);
        } else {
          // Fallback ke landing page
          const generateSlug = (text) =>
            (text || "")
              .toString()
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9 -]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-");

          let kodeProduk = product.kode || (product.url ? product.url.replace(/^\//, '') : null);
          if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
            kodeProduk = generateSlug(product.nama);
          }
          if (kodeProduk) {
            window.open(`/landing/${kodeProduk}`, '_blank');
          }
        }
        break;

      case 7: // Private Mentoring - Link Zoom Meet
        router.push(`/customer/webinar/${product.order_id || product.id}`);
        break;

      default:
        // Default: buka landing page
        const generateSlug = (text) =>
          (text || "")
            .toString()
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9 -]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");

        let kodeProduk = product.kode || (product.url ? product.url.replace(/^\//, '') : null);
        if (!kodeProduk || kodeProduk.includes(' ') || kodeProduk.includes('%20')) {
          kodeProduk = generateSlug(product.nama);
        }
        if (kodeProduk) {
          window.open(`/landing/${kodeProduk}`, '_blank');
        }
    }
  };

  if (isLoading) {
    return (
      <section className="products-section">
        <div className="products-section__header">
          <h2>Produk Lainnya</h2>
          <p>Jelajahi produk dan paket menarik lainnya</p>
        </div>
        <div className="products-carousel-loading">
          <div className="loading-spinner"></div>
          <p>Memuat produk...</p>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="products-section">
      <div className="products-section__header">
        <div>
          <h2>Produk Lainnya</h2>
          <p>Jelajahi produk dan paket menarik lainnya untuk Anda</p>
        </div>
        <button
          className="products-section__view-all"
          onClick={() => window.open('/', '_blank')}
        >
          Lihat Semua
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="products-carousel-wrapper">
        <div
          className="products-carousel-track"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
          }}
        >
          {products.map((product) => (
            <div key={product.id} className="product-carousel-card">
              <div className="product-carousel-card__image">
                {product.header ? (
                  <img
                    src={`/api/image?path=${encodeURIComponent(product.header)}`}
                    alt={product.nama}
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div
                  className="product-carousel-card__image-placeholder"
                  style={{ display: product.header ? "none" : "flex" }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M9 9H15V15H9V9Z" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </div>

              <div className="product-carousel-card__body">
                <div className="product-carousel-card__category">
                  {product.kategori_rel?.nama || "Produk"}
                </div>
                <h3 className="product-carousel-card__title">
                  {product.nama || "-"}
                </h3>
                <div className="product-carousel-card__price">
                  {formatPrice(product.harga_asli)}
                </div>
                <button
                  className="product-carousel-card__button"
                  onClick={() => handleProductClick(product)}
                >
                  {(() => {
                    const kategoriId = product.kategori_rel?.id || product.kategori_id || product.kategori;
                    const kategoriIdNum = Number(kategoriId);

                    switch (kategoriIdNum) {
                      case 1: return "Akses Ebook";
                      case 2: return "Join Webinar";
                      case 3: return "Info Seminar";
                      case 4: return "Lacak Pesanan";
                      case 5: return "Akses Ecourse";
                      case 6: return "Info Workshop";
                      case 7: return "Join Mentoring";
                      default: return "Lihat Detail";
                    }
                  })()}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {products.length > itemsPerSlide && (
        <div className="products-carousel-indicators">
          {Array.from({ length: Math.ceil(products.length / itemsPerSlide) }).map((_, index) => (
            <button
              key={index}
              className={`products-carousel-indicator ${currentSlide === index ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}


