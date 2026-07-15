# Prisma Setup Instructions

## 📦 Install Prisma

Jalankan perintah berikut di terminal:

```bash
npm install @prisma/client
npm install -D prisma
```

## 🔧 Setup Database

1. **Buat file `.env.local`** di root project (jika belum ada):

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname?schema=public"
```

Atau untuk MySQL:
```env
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
```

2. **Generate Prisma Client:**

```bash
npx prisma generate
```

3. **Push schema ke database:**

Untuk development:
```bash
npx prisma db push
```

Untuk production (dengan migration):
```bash
npx prisma migrate dev --name init
```

## ✅ Verify Installation

Setelah setup, pastikan:
- ✅ File `prisma/schema.prisma` ada
- ✅ File `src/lib/prisma.js` ada
- ✅ Environment variable `DATABASE_URL` sudah di-set
- ✅ Prisma Client sudah di-generate (`node_modules/.prisma/client` ada)

## 🚨 Troubleshooting

### Error: Cannot find module '@prisma/client'

```bash
npx prisma generate
```

### Error: P1001: Can't reach database server

- Pastikan database sudah running
- Cek `DATABASE_URL` di `.env.local`
- Cek firewall/network settings

### Error: P2002: Unique constraint failed

- Email sudah terdaftar, gunakan email lain

### Error: P2003: Foreign key constraint failed

- `produkId` tidak valid, pastikan produk ada di database

