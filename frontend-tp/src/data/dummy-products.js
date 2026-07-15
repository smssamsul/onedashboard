// Dummy data produk untuk testing sebelum backend siap
// Format: blocks (canvas style) + pengaturan

export const dummyProducts = {
  // Produk 1: Webinar Ternak Properti (Kategori 11)
  "webinar-ternak-properti": {
    id: 999,
    nama: "Webinar Ternak Properti",
    kode: "webinar-ternak-properti",
    url: "/webinar-ternak-properti",
    kategori: "11",
    kategori_id: 11,
    kategori_rel: { id: 11, nama: "Webinar" },
    harga_asli: 500000,
    harga_coret: 750000,
    harga_promo: 299000,
    tanggal_event: null,
    landingpage: "1",
    status: 1,
    // Format blocks (canvas style)
    blocks: [
      {
        id: "block-1",
        type: "text",
        data: {
          content: "Selamat datang di Webinar Ternak Properti! Pelajari strategi investasi properti yang terbukti menghasilkan keuntungan besar. Dapatkan insight langsung dari para ahli properti berpengalaman."
        },
        order: 1
      },
      {
        id: "block-2",
        type: "image",
        data: {
          src: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=600&fit=crop",
          alt: "Webinar Ternak Properti",
          caption: "Investasi Properti yang Menguntungkan"
        },
        order: 2
      },
      {
        id: "block-3",
        type: "price",
        data: {},
        order: 3
      },
      {
        id: "block-4",
        type: "list",
        data: {
          items: [
            { nama: "Akses live webinar dengan para ahli properti" },
            { nama: "Rekaman lengkap yang bisa ditonton ulang" },
            { nama: "Materi presentasi dan worksheet eksklusif" },
            { nama: "Sertifikat kehadiran digital" },
            { nama: "Akses ke grup komunitas eksklusif" },
            { nama: "Q&A session langsung dengan pembicara" }
          ]
        },
        order: 4
      },
      {
        id: "block-5",
        type: "youtube",
        data: {
          items: [
            {
              embedUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
            }
          ]
        },
        order: 5
      },
      {
        id: "block-6",
        type: "testimoni",
        data: {
          items: [
            {
              nama: "Budi Santoso",
              deskripsi: "Webinar ini sangat membantu! Saya sudah berhasil investasi properti pertama saya setelah mengikuti webinar ini.",
              gambar: "https://i.pravatar.cc/150?img=1"
            },
            {
              nama: "Siti Nurhaliza",
              deskripsi: "Materinya sangat lengkap dan mudah dipahami. Pembicaranya juga sangat berpengalaman di bidang properti.",
              gambar: "https://i.pravatar.cc/150?img=2"
            },
            {
              nama: "Ahmad Fauzi",
              deskripsi: "Worth it banget! Dari webinar ini saya dapat banyak insight baru tentang investasi properti yang profitable.",
              gambar: "https://i.pravatar.cc/150?img=3"
            },
            {
              nama: "Dewi Sartika",
              deskripsi: "Sangat recommended untuk pemula yang ingin mulai investasi properti. Step by step dijelaskan dengan jelas.",
              gambar: "https://i.pravatar.cc/150?img=4"
            },
            {
              nama: "Rizki Pratama",
              deskripsi: "Setelah ikut webinar ini, saya jadi lebih percaya diri untuk investasi properti. Terima kasih!",
              gambar: "https://i.pravatar.cc/150?img=5"
            }
          ]
        },
        order: 6
      },
      {
        id: "block-7",
        type: "form",
        data: {
          kategori: "11"
        },
        order: 7
      },
      {
        id: "block-8",
        type: "faq",
        data: {},
        order: 8
      }
    ]
  },

  // Produk 2: Buku Panduan Investasi Properti (Kategori 13 - dengan ongkir)
  "buku-panduan-investasi-properti": {
    id: 998,
    nama: "Buku Panduan Investasi Properti",
    kode: "buku-panduan-investasi-properti",
    url: "/buku-panduan-investasi-properti",
    kategori: "13",
    kategori_id: 13,
    kategori_rel: { id: 13, nama: "Buku" },
    harga_asli: 150000,
    harga_coret: 250000,
    harga_promo: 120000,
    tanggal_event: null,
    landingpage: "2",
    status: 1,
    // Format blocks (canvas style)
    blocks: [
      {
        id: "block-1",
        type: "text",
        data: {
          content: "Dapatkan panduan lengkap investasi properti dalam bentuk buku fisik berkualitas tinggi. Buku ini berisi strategi-strategi teruji yang telah membantu ratusan investor sukses dalam membangun portofolio properti mereka."
        },
        order: 1
      },
      {
        id: "block-2",
        type: "image",
        data: {
          src: "https://ternakproperti.com/wp-content/uploads/2025/05/foto-buku-1024x1024.jpeg",
          alt: "Buku Panduan Investasi Properti",
          caption: "Buku Panduan Lengkap Investasi Properti - Edisi Terbaru 2024"
        },
        order: 2
      },
      {
        id: "block-3",
        type: "price",
        data: {},
        order: 3
      },
      {
        id: "block-4",
        type: "list",
        data: {
          items: [
            { nama: "Buku fisik berkualitas tinggi dengan hard cover premium" },
            { nama: "Lebih dari 250 halaman konten lengkap dan terupdate" },
            { nama: "Strategi investasi properti step by step untuk pemula" },
            { nama: "Case study real dari investor sukses di Indonesia" },
            { nama: "Tips dan trik dari para ahli properti berpengalaman" },
            { nama: "Bonus akses ke materi digital eksklusif dan worksheet" },
            { nama: "Update konten berkala via email untuk pembeli" }
          ]
        },
        order: 4
      },
      {
        id: "block-5",
        type: "youtube",
        data: {
          items: [
            {
              embedUrl: "https://www.youtube.com/watch?v=qD78YeMNY1k"
            },
            {
              embedUrl: "https://www.youtube.com/watch?v=BDYeihxGY1E"
            }
          ]
        },
        order: 5
      },
      {
        id: "block-6",
        type: "testimoni",
        data: {
          items: [
            {
              nama: "Indra Gunawan",
              deskripsi: "Buku ini sangat membantu! Setelah membaca, saya langsung bisa apply strateginya dan berhasil dapat properti pertama dalam 3 bulan.",
              gambar: "https://i.pravatar.cc/150?img=6"
            },
            {
              nama: "Maya Sari",
              deskripsi: "Kontennya sangat lengkap dan mudah dipahami. Cocok untuk pemula yang ingin mulai investasi properti. Recommended banget!",
              gambar: "https://i.pravatar.cc/150?img=7"
            },
            {
              nama: "Rudi Hartono",
              deskripsi: "Worth it! Buku ini berisi strategi yang benar-benar bisa diaplikasikan. Saya sudah dapat 2 properti setelah membaca buku ini.",
              gambar: "https://i.pravatar.cc/150?img=8"
            },
            {
              nama: "Sari Dewi",
              deskripsi: "Buku yang sangat praktis! Langkah-langkahnya jelas dan mudah diikuti. Sangat membantu untuk investor pemula seperti saya.",
              gambar: "https://i.pravatar.cc/150?img=9"
            }
          ]
        },
        order: 6
      },
      {
        id: "block-7",
        type: "form",
        data: {
          kategori: "13"
        },
        order: 7
      },
      {
        id: "block-8",
        type: "faq",
        data: {},
        order: 8
      }
    ]
  },

  // Produk 3: Buku Master Investasi Properti (Kategori 13 - Buku)
  "buku-master-investasi-properti": {
    id: 996,
    nama: "Buku Master Investasi Properti",
    kode: "buku-master-investasi-properti",
    url: "/buku-master-investasi-properti",
    kategori: "13",
    kategori_id: 13,
    kategori_rel: { id: 13, nama: "Buku" },
    harga_asli: 180000,
    harga_coret: 280000,
    harga_promo: 150000,
    tanggal_event: null,
    landingpage: "2",
    status: 1,
    // Format blocks (canvas style)
    blocks: [
      {
        id: "block-1",
        type: "text",
        data: {
          content: "Buku Master Investasi Properti adalah panduan komprehensif untuk menguasai seni investasi properti. Buku ini dirancang khusus untuk membantu Anda membangun kekayaan melalui investasi properti yang cerdas dan strategis. Dapatkan insight dari para master properti yang telah sukses membangun portofolio properti bernilai miliaran rupiah."
        },
        order: 1
      },
      {
        id: "block-2",
        type: "image",
        data: {
          src: "https://ternakproperti.com/wp-content/uploads/2025/05/foto-buku-1024x1024.jpeg",
          alt: "Buku Master Investasi Properti",
          caption: "Buku Master Investasi Properti - Panduan Lengkap untuk Investor Properti"
        },
        order: 2
      },
      {
        id: "block-3",
        type: "price",
        data: {},
        order: 3
      },
      {
        id: "block-4",
        type: "list",
        data: {
          items: [
            { nama: "Buku fisik premium dengan hard cover berkualitas tinggi" },
            { nama: "Lebih dari 300 halaman konten masterclass yang teruji" },
            { nama: "Strategi investasi properti dari level pemula hingga advanced" },
            { nama: "Case study real dari investor properti sukses di Indonesia" },
            { nama: "Formula rahasia untuk analisis properti yang profitable" },
            { nama: "Bonus akses ke komunitas eksklusif investor properti" },
            { nama: "Update konten berkala dan newsletter eksklusif" }
          ]
        },
        order: 4
      },
      {
        id: "block-5",
        type: "youtube",
        data: {
          items: [
            {
              embedUrl: "https://www.youtube.com/watch?v=qD78YeMNY1k"
            },
            {
              embedUrl: "https://www.youtube.com/watch?v=BDYeihxGY1E"
            }
          ]
        },
        order: 5
      },
      {
        id: "block-6",
        type: "testimoni",
        data: {
          items: [
            {
              nama: "Ahmad Fauzi",
              deskripsi: "Buku Master ini benar-benar mengubah cara saya melihat investasi properti. Setelah membaca, saya langsung bisa apply strateginya dan dalam 6 bulan sudah punya 2 properti yang menghasilkan passive income.",
              gambar: "https://i.pravatar.cc/150?img=10"
            },
            {
              nama: "Dewi Sartika",
              deskripsi: "Kontennya sangat mendalam dan praktis. Buku ini tidak hanya teori, tapi juga memberikan langkah-langkah konkret yang bisa langsung diaplikasikan. Highly recommended!",
              gambar: "https://i.pravatar.cc/150?img=11"
            },
            {
              nama: "Bambang Sutrisno",
              deskripsi: "Sebagai investor yang sudah punya beberapa properti, buku ini tetap memberikan insight baru yang sangat berharga. Worth every penny!",
              gambar: "https://i.pravatar.cc/150?img=12"
            },
            {
              nama: "Lina Kurniawan",
              deskripsi: "Buku Master ini adalah investasi terbaik yang pernah saya beli. Strategi-strateginya sudah terbukti dan sangat membantu untuk membangun portofolio properti.",
              gambar: "https://i.pravatar.cc/150?img=13"
            }
          ]
        },
        order: 6
      },
      {
        id: "block-7",
        type: "form",
        data: {
          kategori: "13"
        },
        order: 7
      },
      {
        id: "block-8",
        type: "faq",
        data: {},
        order: 8
      }
    ]
  },

  // Produk 4: Workshop Investasi Properti (Kategori 15 - dengan down payment)
  "workshop-investasi-properti": {
    id: 997,
    nama: "Workshop Investasi Properti",
    kode: "workshop-investasi-properti",
    url: "/workshop-investasi-properti",
    kategori: "15",
    kategori_id: 15,
    kategori_rel: { id: 15, nama: "Workshop" },
    harga_asli: 20000000,
    harga_coret: 20000000,
    harga_promo: 13000000,
    tanggal_event: null,
    landingpage: "1",
    status: 1,
    // Format blocks (canvas style)
    blocks: [
      {
        id: "block-1",
        type: "text",
        data: {
          content: "Ikuti Workshop Investasi Properti yang akan mengubah cara pandang Anda tentang investasi properti. Workshop intensif selama 2 hari dengan materi praktis yang bisa langsung diaplikasikan. Dapatkan mentorship langsung dari para ahli properti berpengalaman."
        },
        order: 1
      },
      {
        id: "block-2",
        type: "image",
        data: {
          src: "https://ternakproperti.com/wp-content/uploads/2025/07/img-wstp-v4-1024x1024.png",
          alt: "Workshop Investasi Properti",
          caption: "Workshop Investasi Properti - Hands On Learning Experience"
        },
        order: 2
      },
      {
        id: "block-3",
        type: "price",
        data: {},
        order: 3
      },
      {
        id: "block-4",
        type: "list",
        data: {
          items: [
            { nama: "Workshop intensif 2 hari dengan materi lengkap" },
            { nama: "Hands-on practice dengan case study real" },
            { nama: "Mentorship langsung dari 3 ahli properti" },
            { nama: "Materi workshop dalam bentuk softcopy" },
            { nama: "Sertifikat penyelesaian workshop" },
            { nama: "Akses ke grup komunitas eksklusif peserta" },
            { nama: "Follow-up session 1 bulan setelah workshop" },
            { nama: "Networking dengan investor dan praktisi properti" }
          ]
        },
        order: 4
      },
      {
        id: "block-5",
        type: "youtube",
        data: {
          items: [
            {
              embedUrl: "https://www.youtube.com/watch?v=rKrrFWkbUtw"
            },
            {
              embedUrl: "https://www.youtube.com/watch?v=Hv1llEx_hsA"
            }
          ]
        },
        order: 5
      },
      {
        id: "block-6",
        type: "testimoni",
        data: {
          items: [
            {
              nama: "Andi Wijaya",
              deskripsi: "Workshop ini luar biasa! Saya dapat insight yang sangat berharga dan langsung bisa apply. Setelah workshop, saya berhasil closing 1 properti dalam 2 bulan.",
              gambar: "https://i.pravatar.cc/150?img=10"
            },
            {
              nama: "Lisa Permata",
              deskripsi: "Mentornya sangat berpengalaman dan materi sangat praktis. Workshop ini worth every penny! Saya jadi lebih percaya diri untuk investasi properti.",
              gambar: "https://i.pravatar.cc/150?img=11"
            },
            {
              nama: "Bambang Setiawan",
              deskripsi: "Workshop terbaik yang pernah saya ikuti! Materinya lengkap, mentornya responsive, dan networking-nya sangat membantu. Highly recommended!",
              gambar: "https://i.pravatar.cc/150?img=12"
            },
            {
              nama: "Diana Putri",
              deskripsi: "Sebagai pemula, workshop ini sangat membantu. Step by step dijelaskan dengan jelas dan ada praktik langsung. Setelah workshop, saya langsung action!",
              gambar: "https://i.pravatar.cc/150?img=13"
            },
            {
              nama: "Eko Prasetyo",
              deskripsi: "Workshop yang sangat praktis! Tidak hanya teori, tapi juga ada praktik dan case study real. Saya dapat banyak insight baru yang sangat berharga.",
              gambar: "https://i.pravatar.cc/150?img=14"
            }
          ]
        },
        order: 6
      },
      {
        id: "block-7",
        type: "form",
        data: {
          kategori: "15"
        },
        order: 7
      },
      {
        id: "block-8",
        type: "faq",
        data: {},
        order: 8
      }
    ]
  }
};

// Helper function untuk get dummy product by kode
export const getDummyProduct = (kode) => {
  return dummyProducts[kode] || null;
};

// Helper function untuk check apakah produk adalah dummy
export const isDummyProduct = (kode) => {
  return kode in dummyProducts;
};

