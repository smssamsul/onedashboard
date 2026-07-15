# Setup Order & Payment System

## 📋 Prerequisites

1. **Database** - PostgreSQL atau MySQL
2. **Midtrans Account** - Untuk payment gateway
3. **Node.js 18+**

## 🚀 Installation Steps

### 1. Install Dependencies

```bash
npm install @prisma/client
npm install -D prisma
```

### 2. Setup Database

Buat file `.env.local` di root project:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
# atau untuk MySQL:
# DATABASE_URL="mysql://user:password@localhost:3306/dbname"

# Midtrans
MIDTRANS_SERVER_KEY="your_midtrans_server_key"
MIDTRANS_IS_PRODUCTION="false" # true untuk production, false untuk sandbox
NEXT_PUBLIC_APP_URL="http://localhost:3000" # URL aplikasi Anda
```

### 3. Initialize Prisma

```bash
# Generate Prisma Client
npx prisma generate

# Push schema ke database (untuk development)
npx prisma db push

# Atau gunakan migration (untuk production)
npx prisma migrate dev --name init
```

### 4. Verify Setup

```bash
# Jalankan development server
npm run dev
```

## 📁 File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── order/
│   │   │   └── route.js          # POST order ke database
│   │   └── midtrans/
│   │       ├── create-snap-ewallet/
│   │       │   └── route.js      # E-wallet payment
│   │       ├── create-snap-cc/
│   │       │   └── route.js      # Credit card payment
│   │       └── create-snap-va/
│   │           └── route.js      # Virtual account payment
│   ├── landing/
│   │   └── [kode_produk]/
│   │       └── page.js            # Landing page dengan form order
│   └── payment/
│       └── page.js                # Manual transfer page
├── lib/
│   └── prisma.js                  # Prisma client instance
prisma/
└── schema.prisma                   # Database schema
```

## 🔄 Flow Order & Payment

### 1. Customer Submit Order

```
LandingPage → handleSubmit()
  ↓
POST /api/order
  ↓
Simpan ke database (Prisma)
  ↓
Return order ID
```

### 2. Payment Processing

#### E-Wallet / Credit Card / Virtual Account:
```
Order Success → payEwallet() / payCC() / payVA()
  ↓
POST /api/midtrans/create-snap-{method}
  ↓
Call Midtrans Snap API
  ↓
Return redirect_url
  ↓
window.location.href = redirect_url
  ↓
Midtrans Payment Page
```

#### Manual Transfer:
```
Order Success → paymentMethod === "manual"
  ↓
Redirect ke /payment?product=...&harga=...
  ↓
Tampilkan rekening bank
  ↓
Tombol "Sudah Transfer" → WhatsApp admin
```

## 📝 API Endpoints

### POST /api/order

**Request Body:**
```json
{
  "nama": "John Doe",
  "email": "john@example.com",
  "wa": "081234567890",
  "alamat": "Jl. Contoh No. 123",
  "produk": 1,
  "harga": 249000,
  "ongkir": "0",
  "total_harga": 249000,
  "metode_bayar": "ewallet",
  "sumber": "website",
  "custom_value": [],
  "product_name": "Seminar Properti"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order berhasil dibuat",
  "data": {
    "order": {
      "id": 1,
      "nama": "John Doe",
      ...
    }
  }
}
```

### POST /api/midtrans/create-snap-ewallet

**Request:** FormData
- `name`: string
- `email`: string
- `amount`: number
- `product_name`: string

**Response:**
```json
{
  "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/...",
  "token": "..."
}
```

### POST /api/midtrans/create-snap-cc

**Request:** JSON
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "amount": 249000,
  "product_name": "Seminar Properti"
}
```

**Response:** Same as e-wallet

### POST /api/midtrans/create-snap-va

**Request:** JSON (same as CC)

**Response:** Same as e-wallet

## 🗄️ Database Schema

```prisma
model Order {
  id            Int       @id @default(autoincrement())
  nama          String
  email         String
  wa            String
  alamat        String?
  produkId      Int
  harga         Int
  ongkir        String
  total_harga   Int
  metode_bayar  String
  custom_value  Json?
  sumber        String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

## ⚙️ Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | Yes |
| `MIDTRANS_IS_PRODUCTION` | `true` or `false` | Yes |
| `NEXT_PUBLIC_APP_URL` | Application URL | Yes |

## 🐛 Troubleshooting

### Prisma Client Error
```bash
# Regenerate Prisma Client
npx prisma generate
```

### Database Connection Error
- Pastikan `DATABASE_URL` di `.env.local` benar
- Pastikan database sudah running
- Cek firewall/network settings

### Midtrans Error
- Pastikan `MIDTRANS_SERVER_KEY` benar
- Pastikan `MIDTRANS_IS_PRODUCTION` sesuai environment
- Cek Midtrans dashboard untuk melihat error detail

### Order Not Saved
- Cek console untuk error message
- Pastikan semua field wajib terisi
- Pastikan `produkId` valid (ada di database)

## 📞 Support

Jika ada masalah, cek:
1. Console browser untuk error client-side
2. Terminal untuk error server-side
3. Database logs
4. Midtrans dashboard

