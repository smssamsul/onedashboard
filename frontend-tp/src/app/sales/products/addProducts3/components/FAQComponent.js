"use client";

import ComponentWrapper from "./ComponentWrapper";

export default function FAQComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, productKategori, isExpanded, onToggleExpand }) {
  return (
    <ComponentWrapper
      title="FAQ"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="faq-component-content">
        <div className="faq-info-box" style={{ 
          padding: '16px', 
          background: '#f9fafb', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <p className="text-sm text-gray-600" style={{ margin: 0 }}>
            <strong>Info:</strong> FAQ akan otomatis di-generate berdasarkan kategori produk yang dipilih di tab <strong>Pengaturan</strong>.
          </p>
          {productKategori ? (
            <p className="text-sm text-gray-500" style={{ margin: "8px 0 0 0" }}>
              Kategori saat ini: <strong>{
                productKategori === 10 ? "Ebook" :
                productKategori === 11 ? "Webinar" :
                productKategori === 12 ? "Seminar" :
                productKategori === 13 ? "Buku" :
                productKategori === 14 ? "Ecourse" :
                productKategori === 15 ? "Workshop" :
                productKategori === 16 ? "Private Mentoring" :
                `Kategori ${productKategori}`
              }</strong>
            </p>
          ) : (
            <p className="text-sm text-orange-600" style={{ margin: "8px 0 0 0" }}>
              ⚠️ Pilih kategori produk terlebih dahulu di tab Pengaturan untuk melihat FAQ otomatis.
            </p>
          )}
        </div>
      </div>
    </ComponentWrapper>
  );
}

