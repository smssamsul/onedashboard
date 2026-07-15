# Setup Fitur Ongkir Komerce

## File yang Dibuat

1. **API Routes:**
   - `/app/api/komerce/destination/route.js` - GET untuk lookup destinasi
   - `/app/api/komerce/cost/route.js` - POST untuk hitung ongkir

2. **Helper:**
   - `/lib/komerce.js` - Helper functions untuk frontend

3. **Components:**
   - `/components/OngkirCalculator.jsx` - Komponen React untuk kalkulator ongkir

4. **Styles:**
   - `/styles/ongkir.css` - Styling untuk komponen ongkir

5. **Integration:**
   - `/app/landing/[kode_produk]/page.js` - Integrasi komponen ongkir ke landing page

## Setup Environment Variables

Buat file `.env.local` di root project dengan isi:

```env
# Raja Ongkir API Key (Komerce)
RAJAONGKIR_KEY=your-api-key-here

# Origin ID (Kota asal pengiriman)
# Contoh: Jakarta = 151, Bandung = 23
NEXT_PUBLIC_RAJAONGKIR_ORIGIN=151
```

**PENTING:** 
- Jangan commit file `.env.local` ke git
- File `.env.local.example` sudah dibuat sebagai template
- Ganti `your-api-key-here` dengan API key yang sebenarnya

## Cara Menggunakan

1. **Di Admin (addProducts/editProducts):**
   - Toggle "Aktifkan Cek Ongkir" untuk mengaktifkan fitur ongkir di landing page
   - Field `enable_ongkir` tidak dikirim ke backend (hanya untuk UI toggle)

2. **Di Landing Page:**
   - Jika `enable_ongkir = 1`, form cek ongkir akan muncul
   - Customer dapat:
     - Pilih kota tujuan (dengan autocomplete)
     - Input berat (1-50000 gram)
     - Pilih kurir (JNE, TIKI, POS)
     - Hitung ongkir
   - Setelah ongkir dihitung, nilai ongkir akan otomatis ditambahkan ke total harga
   - Saat checkout, `ongkir` dan `total_harga` (harga + ongkir) dikirim ke backend

## Fitur

- ✅ Cooldown 20 detik antara request
- ✅ Cache hasil 60 detik di sessionStorage
- ✅ Validasi destination (harus angka ID)
- ✅ Validasi weight (1-50000 gram)
- ✅ Handle rate limit error
- ✅ Auto-update total harga saat ongkir dihitung
- ✅ Responsive design

## API Endpoints

### GET `/api/komerce/destination`
Query params:
- `q` (optional): Search query untuk mencari destinasi

### POST `/api/komerce/cost`
Body:
```json
{
  "origin": "151",
  "destination": "23",
  "weight": 1000,
  "courier": "jne"
}
```

## Troubleshooting

1. **API Key tidak ditemukan:**
   - Pastikan `RAJAONGKIR_KEY` sudah di-set di `.env.local`
   - Restart development server setelah menambah env variable

2. **Origin tidak ditemukan:**
   - Pastikan `NEXT_PUBLIC_RAJAONGKIR_ORIGIN` sudah di-set
   - Gunakan ID kota yang valid dari Raja Ongkir

3. **Rate limit error:**
   - Cooldown 20 detik sudah diimplementasi
   - Tunggu beberapa saat sebelum request lagi

4. **Ongkir tidak muncul di landing page:**
   - Pastikan toggle "Aktifkan Cek Ongkir" sudah diaktifkan di admin
   - Pastikan `enable_ongkir` di-load dari backend (jika backend mengembalikan field ini)

