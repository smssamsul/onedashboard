"use client";
import React from "react";
import "@/styles/sales/landing.css";

const resolveMediaSource = (input) => {
  if (!input) return null;

  // Direct string path or URL
  if (typeof input === "string") return input;

  // Object with type & value (builder form)
  if (input?.type === "file" && input.value) {
    return URL.createObjectURL(input.value);
  }
  if (input?.type === "url" && input.value) {
    return input.value;
  }

  // Object with path property
  if (input?.path) {
    if (typeof input.path === "string") return input.path;
    if (input.path?.type === "file" && input.path.value) {
      return URL.createObjectURL(input.path.value);
    }
    if (input.path?.type === "url" && input.path.value) {
      return input.path.value;
    }
  }

  return null;
};

export default function LandingTemplate({ form }) {
  if (!form) return null;

  const formatPrice = (price) => {
    if (!price) return "0";
    const numPrice =
      typeof price === "string" ? parseInt(price.replace(/[^\d]/g, "")) : price;
    return (isNaN(numPrice) ? 0 : numPrice).toLocaleString("id-ID");
  };

  const getVideoArray = () => {
    if (!form.video) return [];
    if (Array.isArray(form.video)) return form.video;
    if (typeof form.video === "string") {
      return form.video
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v);
    }
    return [];
  };

  const videoArray = getVideoArray();
  const headerSrc = resolveMediaSource(form.header);

  return (
    <article className="landing-wrapper" itemScope itemType="https://schema.org/Product">
      <div className="produk-preview">
        
        {/* Logo Section - Top */}
        <div className="logo-section">
          <img 
            src="/assets/logo.png" 
            alt="Logo" 
            className="landing-logo"
          />
        </div>

        {/* Top Section - No Background */}
        <div className="top-section">
          {/* Promo Card - Highlight Orange */}
          <div className="promo-card-highlight" role="banner">
            <div className="promo-label">Tawaran Terbatas</div>
            <h1 className="promo-title-professional">Isi Form Hari Ini Untuk Mendapatkan Akses Group Exclusive</h1>
          </div>

          {/* Nama Produk - Black Color */}
          <h1 className="preview-title-professional" itemProp="name">{form.nama || "Nama Produk"}</h1>
        </div>

        {/* Header - Outside orange section, with reduced overlap for closer spacing */}
        <div className="header-wrapper header-overlap">
          {headerSrc ? (
            <img
              src={headerSrc}
              alt={`${form.nama || "Produk"} - Header Image`}
              className="preview-header-img"
              itemProp="image"
              loading="eager"
              width="900"
              height="500"
            />
          ) : (
            <div
              className="preview-header-img"
              style={{ background: "#e5e7eb" }}
              aria-label="Product header placeholder"
            />
          )}
        </div>
        
        {/* Deskripsi - dipindah setelah Header sesuai landing page */}
        {form.deskripsi && (
          <div className="preview-description" itemProp="description">
            {form.deskripsi}
          </div>
        )}

        {/* Special Offer Card - Combined Benefit & Price */}
        {(form.list_point?.length > 0 || form.harga_coret || form.harga_asli) && (
          <section className="special-offer-card" aria-label="Special offer" itemScope itemType="https://schema.org/Offer">
            <h2 className="special-offer-title">Special Offer!</h2>
            
            {/* Price Section */}
            {(form.harga_coret || form.harga_asli) && (
              <div className="special-offer-price">
                {form.harga_coret && (
                  <span className="price-old" aria-label="Harga lama">
                    Rp {formatPrice(form.harga_coret)}
                  </span>
                )}
                {form.harga_asli && (
                  <span className="price-new" itemProp="price" content={form.harga_asli}>
                    Rp {formatPrice(form.harga_asli)}
                  </span>
                )}
              </div>
            )}
            
            {/* Benefit List */}
            {form.list_point?.length > 0 && (
              <div className="special-offer-benefits">
                <h3>Benefit yang akan Anda dapatkan:</h3>
                <ul itemProp="featureList">
                  {form.list_point.map((p, i) => (
                    <li key={i} itemProp="itemListElement">
                      <span className="benefit-check">✓</span>
                      {p.nama}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <meta itemProp="priceCurrency" content="IDR" />
            <meta itemProp="availability" content="https://schema.org/InStock" />
          </section>
        )}

        {/* Gallery */}
        {form.gambar?.length > 0 && (
          <section className="preview-gallery" aria-label="Product gallery">
            <h2 className="gallery-title"></h2>
            <div className="gallery-images-full" itemProp="image">
              {form.gambar.map((g, i) => {
                const imageSrc = resolveMediaSource(g) || resolveMediaSource(g?.path);
                if (!imageSrc) return null;
                return (
                  <img
                    key={i}
                    src={imageSrc}
                    alt={g.caption || `${form.nama || "Produk"} - Gambar ${i + 1}`}
                    className="gallery-image-full"
                    loading="lazy"
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Video */}
        {videoArray.length > 0 && (
          <section className="preview-video" aria-label="Product videos">
            <h2 className="video-title">Video Produk</h2>
            {videoArray.map((v, i) => {
              let url = v;
              if (url.includes("watch?v=")) url = url.replace("watch?v=", "embed/");
              return (
                <iframe 
                  key={i} 
                  src={url} 
                  allowFullScreen
                  title={`Video ${form.nama || 'Produk'} - ${i + 1}`}
                  loading="lazy"
                />
              );
            })}
          </section>
        )}

        {/* Testimoni - Google Review Style */}
        {form.testimoni?.length > 0 && (
          <section className="preview-testimonials" aria-label="Customer testimonials">
            <div className="testimonials-carousel-wrapper-new">
              <div className="testimonials-carousel-new" itemScope itemType="https://schema.org/Review">
                <div className="testimonials-track-new">
                  {form.testimoni.map((t, i) => {
                    const imageSrc = resolveMediaSource(t.gambar);
                    return (
                      <article key={i} className="testi-card-new" itemScope itemType="https://schema.org/Review">
                        <div className="testi-header-new">
                          {imageSrc ? (
                            <div className="testi-avatar-wrapper-new">
                              <img 
                                src={imageSrc} 
                                alt={`Foto ${t.nama}`}
                                className="testi-avatar-new"
                                itemProp="author"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="testi-avatar-wrapper-new">
                              <div className="testi-avatar-placeholder-new">
                                {t.nama?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                            </div>
                          )}
                          <div className="testi-info-new">
                            <div className="testi-name-new" itemProp="author" itemScope itemType="https://schema.org/Person">
                              <span itemProp="name">{t.nama}</span>
                            </div>
                            <div className="testi-stars-new">
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                              <span className="star-new">★</span>
                            </div>
                          </div>
                        </div>
                        <div className="testi-desc-new" itemProp="reviewBody">{t.deskripsi}</div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* INFORMASI DASAR - Compact Form Style */}
        <section className="compact-form-section" aria-label="Order form">
          <h2 className="compact-form-title">Lengkapi Data:</h2>
          
          <div className="compact-form-card">
            {/* Nama Lengkap */}
            <div className="compact-field">
              <label className="compact-label">
                Nama Lengkap <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Krisdayanti"
                className="compact-input"
                disabled
              />
            </div>

            {/* No. WhatsApp */}
            <div className="compact-field">
              <label className="compact-label">
                No. WhatsApp <span className="required">*</span>
              </label>
              <div className="wa-input-wrapper">
                <div className="wa-prefix">
                  <span className="flag">🇮🇩</span>
                  <span className="code">+62</span>
                </div>
                <input
                  type="tel"
                  placeholder="812345678"
                  className="compact-input wa-input"
                  disabled
                />
              </div>
            </div>

            {/* Email */}
            <div className="compact-field">
              <label className="compact-label">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                className="compact-input"
                disabled
              />
            </div>

            {/* Alamat */}
            <div className="compact-field">
              <label className="compact-label">Alamat</label>
              <textarea
                placeholder="Alamat lengkap (opsional)"
                className="compact-input compact-textarea"
                rows={2}
                disabled
              />
            </div>
          </div>
        </section>

        {/* Custom Field - Same Compact Style */}
        {form.custom_field?.length > 0 && (
          <section className="compact-form-section" aria-label="Additional information">
            <h2 className="compact-form-title">Lengkapi Data Tambahan:</h2>

            <div className="compact-form-card">
              {form.custom_field.map((f, i) => (
                <div key={i} className="compact-field">
                  <label className="compact-label">
                    {f.nama_field || f.label}
                    {f.required && <span className="required"> *</span>}
                  </label>
                  <input
                    type="text"
                    placeholder={`Masukkan ${f.nama_field || f.label}`}
                    className="compact-input"
                    disabled
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Payment - Vertical Layout, Horizontal Items */}
        <section className="payment-section" aria-label="Payment methods">
          <h2 className="payment-title">Metode Pembayaran</h2>
          <div className="payment-options-vertical">
            {/* E-Payment */}
            <label className="payment-option-row">
              <input
                type="radio"
                name="payment"
                value="ewallet"
                disabled
              />
              <span className="payment-label">E-Payment</span>
              <div className="payment-icons-inline">
                <img className="pay-icon" src="/assets/qris.svg" alt="QRIS" />
                <img className="pay-icon" src="/assets/dana.png" alt="DANA" />
                <img className="pay-icon" src="/assets/ovo.png" alt="OVO" />
                <img className="pay-icon" src="/assets/link.png" alt="LinkAja" />
              </div>
            </label>

            {/* Credit */}
            <label className="payment-option-row">
              <input
                type="radio"
                name="payment"
                value="cc"
                disabled
              />
              <span className="payment-label">Credit / Debit Card</span>
              <div className="payment-icons-inline">
                <img className="pay-icon" src="/assets/visa.svg" alt="Visa" />
                <img className="pay-icon" src="/assets/master.png" alt="Mastercard" />
                <img className="pay-icon" src="/assets/jcb.png" alt="JCB" />
              </div>
            </label>

            {/* Virtual Account */}
            <label className="payment-option-row">
              <input
                type="radio"
                name="payment"
                value="va"
                disabled
              />
              <span className="payment-label">Virtual Account</span>
              <div className="payment-icons-inline">
                <img className="pay-icon" src="/assets/bca.png" alt="BCA" />
                <img className="pay-icon" src="/assets/mandiri.png" alt="Mandiri" />
                <img className="pay-icon" src="/assets/bni.png" alt="BNI" />
                <img className="pay-icon" src="/assets/permata.svg" alt="Permata" />
              </div>
            </label>

            {/* Manual Transfer */}
            <label className="payment-option-row">
              <input
                type="radio"
                name="payment"
                value="manual"
                disabled
              />
              <span className="payment-label">Bank Transfer (Manual)</span>
              <div className="payment-icons-inline">
                <img className="pay-icon" src="/assets/bca.png" alt="BCA" />
              </div>
            </label>
          </div>
        </section>

        {/* CTA */}
        <button 
          className="cta-button" 
          aria-label="Pesan sekarang"
          disabled
        >
          Pesan Sekarang
        </button>

      </div>
    </article>
  );
}
