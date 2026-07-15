"use client";

// ✅ Client Component untuk render semua blocks dan interaktivitas
// Mengambil alih rendering dari file asli untuk mengurangi JavaScript di initial load

export default function ProductPageClient({ kodeProduk, initialData }) {
  // ✅ Render semua blocks menggunakan data yang sudah di-fetch di server
  // Untuk sekarang, render sederhana - akan di-extend dengan logika lengkap dari file asli
  if (!initialData || !initialData.blocks) {
    return <div className="preview-placeholder">Belum ada konten</div>;
  }

  const { blocks, landingpage } = initialData;

  return (
    <>
      {blocks.length > 0 ? (
        blocks.map((block, index) => {
          const componentId = block.config?.componentId;
          const key = componentId || `block-${block.type}-${index}`;
          
          return (
            <div key={key} className="canvas-preview-block">
              {/* ✅ Block akan di-render dengan logika lengkap dari file asli */}
              {/* Temporary: render sederhana untuk menghindari error build */}
              <div>Block: {block.type}</div>
            </div>
          );
        })
      ) : (
        <div className="preview-placeholder">Belum ada konten</div>
      )}
    </>
  );
}

