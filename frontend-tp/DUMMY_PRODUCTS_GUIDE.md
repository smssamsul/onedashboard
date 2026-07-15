# 📖 Panduan Penggunaan Dummy Products (Canvas Style)

## 🎯 Overview

Sistem ini menggunakan **folder baru** untuk produk canvas style:
- **Folder**: `/product/[kode_produk]` (baru, terpisah dari landing lama)
- **Format**: Blocks (canvas style) dari `addProducts3`
- **Saat ini**: Dummy data untuk testing
- **Nanti**: Bisa digunakan untuk data real dari backend

## 🚀 Cara Menggunakan

### 1. Produk Dummy yang Tersedia

Saat ini ada **2 produk dummy** yang bisa diakses:

#### Produk 1: Webinar Ternak Properti
- **URL**: `/product/webinar-ternak-properti`
- **Kategori**: Webinar (11)
- **Harga**: Rp 299.000 (dari Rp 500.000)
- **Fitur**: Text, Image, Price, List, Video, Testimoni, Form, FAQ

#### Produk 2: Buku Panduan Investasi Properti
- **URL**: `/product/buku-panduan-investasi-properti`
- **Kategori**: Buku (13) - **Dengan Ongkir**
- **Harga**: Rp 120.000 (dari Rp 250.000)
- **Fitur**: Text, Image, Price, List, Testimoni, Form (dengan Ongkir Calculator), FAQ

#### Produk 3: Workshop Investasi Properti
- **URL**: `/product/workshop-investasi-properti`
- **Kategori**: Workshop (15) - **Dengan Down Payment**
- **Harga**: Rp 2.000.000 (dari Rp 3.500.000)
- **Fitur**: Text, Image, Price, List, Video, Testimoni, Form (dengan Down Payment Input), FAQ

### 2. Cara Buka Produk

#### Via Browser (Local):
```
http://localhost:3000/product/webinar-ternak-properti
http://localhost:3000/product/buku-panduan-investasi-properti
http://localhost:3000/product/workshop-investasi-properti
```

#### Via Production:
```
https://onedashboard.vercel.app/product/webinar-ternak-properti
https://onedashboard.vercel.app/product/buku-panduan-investasi-properti
https://onedashboard.vercel.app/product/workshop-investasi-properti
```

**Note**: URL menggunakan `/product/` bukan `/landing/` (folder baru, terpisah dari landing lama)

### 3. Cara Menambah Produk Dummy Baru

Edit file: `src/data/dummy-products.js`

```javascript
export const dummyProducts = {
  // Tambah produk baru di sini
  "kode-produk-baru": {
    id: 997, // ID unik
    nama: "Nama Produk",
    kode: "kode-produk-baru",
    url: "/kode-produk-baru",
    kategori: "11", // 10=Ebook, 11=Webinar, 12=Seminar, 13=Buku, 14=Ecourse, 15=Workshop, 16=Private Mentoring
    kategori_id: 11,
    kategori_rel: { id: 11, nama: "Webinar" },
    harga_asli: 500000,
    harga_coret: 750000,
    harga_promo: 299000,
    landingpage: "1", // 1=non-fisik, 2=fisik
    status: 1,
    blocks: [
      // Tambah blocks di sini
      {
        id: "block-1",
        type: "text",
        data: { content: "Isi teks..." },
        order: 1
      },
      // ... blocks lainnya
    ]
  }
};
```

### 4. Format Blocks yang Didukung

#### Text Block
```javascript
{
  id: "block-1",
  type: "text",
  data: {
    content: "Isi teks di sini..."
  },
  order: 1
}
```

#### Image Block
```javascript
{
  id: "block-2",
  type: "image",
  data: {
    src: "https://images.unsplash.com/photo-xxx",
    alt: "Alt text",
    caption: "Caption gambar (opsional)"
  },
  order: 2
}
```

#### Price Block
```javascript
{
  id: "block-3",
  type: "price",
  data: {}, // Harga diambil dari productData
  order: 3
}
```

#### List Block
```javascript
{
  id: "block-4",
  type: "list",
  data: {
    items: [
      { nama: "Point 1" },
      { nama: "Point 2" },
      { nama: "Point 3" }
    ]
  },
  order: 4
}
```

#### Video Block
```javascript
{
  id: "block-5",
  type: "youtube", // atau "video"
  data: {
    items: [
      {
        embedUrl: "https://www.youtube.com/embed/VIDEO_ID"
      }
    ]
  },
  order: 5
}
```

#### Testimoni Block
```javascript
{
  id: "block-6",
  type: "testimoni",
  data: {
    items: [
      {
        nama: "Nama Testimoni",
        deskripsi: "Isi testimoni...",
        gambar: "https://i.pravatar.cc/150?img=1" // Opsional
      }
    ]
  },
  order: 6
}
```

#### Form Block
```javascript
{
  id: "block-7",
  type: "form",
  data: {
    kategori: "11" // Untuk menentukan ongkir/down payment
  },
  order: 7
}
```

#### FAQ Block
```javascript
{
  id: "block-8",
  type: "faq",
  data: {}, // FAQ otomatis berdasarkan kategori
  order: 8
}
```

## 🔄 Cara Kerja Sistem

### 1. Folder Baru
- **Folder**: `src/app/product/[kode_produk]/page.js`
- **Terpisah** dari landing page lama (`/landing/`)
- **Khusus** untuk format blocks (canvas style)
- **Bisa digunakan** untuk data real nanti

### 2. Deteksi Data
- **Dummy**: Check di `dummy-products.js` dulu
- **Real**: Nanti fetch dari API `/api/product/[kode_produk]` (TODO)

### 3. Form Order
Form order **selalu fungsional**:
- ✅ Input: Nama, WhatsApp, Email, Alamat
- ✅ Ongkir Calculator (untuk kategori 13 - Buku)
- ✅ Down Payment (untuk kategori 15 - Workshop)
- ✅ Metode Pembayaran
- ✅ Submit ke `/api/order` (backend)

### 4. Backend Integration
- Form order submit ke `/api/order` (sudah ada) ✅
- Data produk dummy **tidak** disimpan ke backend
- Hanya order yang dikirim ke backend
- **Form order sudah terintegrasi dan bisa submit ke backend**

#### ⚠️ Important: Product ID untuk Dummy Products
- Sistem akan **otomatis fetch produk pertama** yang ada di database
- Menggunakan **ID produk real** tersebut untuk submit order
- Jika **tidak ada produk di database**, akan tetap menggunakan dummy ID dan backend akan error
- **Solusi**: Pastikan ada minimal 1 produk real di database, atau buat produk dummy di backend juga

## 📝 Catatan Penting

1. **Dummy products hanya untuk testing** sebelum backend siap
2. **Form order tetap fungsional** dan mengirim ke backend
3. **Produk real dari backend** akan otomatis menggunakan format lama (backward compatible)
4. **Nanti ketika backend siap**, produk dari `addProducts3` akan disimpan dengan format blocks

## 🐛 Troubleshooting

### Produk tidak muncul?
- Pastikan kode produk ada di `dummy-products.js`
- Check console browser untuk error
- Pastikan URL sesuai: `/product/[kode-produk]` (bukan `/landing/`)
- Pastikan file `src/app/product/[kode_produk]/page.js` sudah ada

### Form order tidak submit?
- Check network tab di browser
- Pastikan backend `/api/order` berjalan
- Check console untuk error message

### Error: "No query results for model [App\Models\Produk] 998"
**Penyebab**: Backend mencoba validasi produk dengan ID 998 (dummy ID), tapi produk tersebut tidak ada di database.

**Solusi**:
1. **Pastikan ada produk real di database** - Sistem akan otomatis menggunakan ID produk real tersebut
2. **Atau buat produk dummy di backend** dengan ID 998, 997, 999
3. **Atau gunakan produk real yang sudah ada** - Sistem akan otomatis fetch dan gunakan ID-nya

**Cara cek**: Buka console browser, cari log `[PRODUCT] Using valid product ID for dummy product: X`

### Style tidak sesuai?
- Pastikan `add-products3.css` sudah di-import
- Check apakah ada CSS conflict
- Pastikan blocks di-render dengan benar

## 🎨 Customization

### Mengubah Style
- Edit `src/styles/sales/add-products3.css`
- Style akan apply ke semua produk dengan format blocks

### Mengubah Dummy Data
- Edit `src/data/dummy-products.js`
- Refresh browser untuk melihat perubahan

## 📞 Support

Jika ada masalah atau pertanyaan, silakan hubungi tim development.

---

**Last Updated**: 2024
**Version**: 2.0.0
**Folder**: `/product/[kode_produk]` (baru, terpisah dari landing lama)

