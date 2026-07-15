# Migration Guide - Pindah ke AWS (atau Environment Lain)

## 🎯 Quick Answer

**Hanya perlu ubah 1 tempat: Environment Variables!**

Tidak perlu ubah code sama sekali karena semua sudah menggunakan config.

---

## 📝 Step-by-Step Migration

### 1. **Ubah Environment Variables**

#### Option A: Via `.env.local` (Development)
```bash
# .env.local
BACKEND_URL=https://your-aws-api-gateway.execute-api.us-east-1.amazonaws.com
NEXT_PUBLIC_BACKEND_URL=https://your-aws-api-gateway.execute-api.us-east-1.amazonaws.com
NODE_ENV=development
```

#### Option B: Via Hosting Platform (Production)

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add:
   - `BACKEND_URL` = `https://your-aws-api-gateway.execute-api.us-east-1.amazonaws.com`
   - `NEXT_PUBLIC_BACKEND_URL` = `https://your-aws-api-gateway.execute-api.us-east-1.amazonaws.com`

**AWS Amplify:**
1. Go to App Settings → Environment Variables
2. Add same variables

**Railway/Render:**
1. Go to Variables tab
2. Add same variables

---

### 2. **Update `next.config.js` (Optional - Auto dari env)**

File `next.config.js` sudah otomatis membaca dari environment variables:

```javascript
// next.config.js (sudah auto)
async rewrites() {
  const backendUrl = 
    process.env.BACKEND_URL || 
    process.env.NEXT_PUBLIC_BACKEND_URL || 
    "http://3.105.234.181:8000";
  
  return [
    {
      source: "/api/:path*",
      destination: `${backendUrl}/api/:path*`,
    },
  ];
}
```

**Tidak perlu ubah apa-apa!** Otomatis pakai `BACKEND_URL` dari env.

---

### 3. **Test**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## 🔄 Contoh Migration ke AWS

### Before (Railway):
```bash
# .env.local
BACKEND_URL=http://3.105.234.181:8000
```

### After (AWS):
```bash
# .env.local
BACKEND_URL=https://api.yourdomain.com
# atau
BACKEND_URL=https://your-api-gateway.execute-api.us-east-1.amazonaws.com/prod
```

**That's it!** Tidak perlu ubah code.

---

## 📍 File yang TIDAK Perlu Diubah

✅ **TIDAK perlu ubah:**
- `src/config/env.js` - Auto baca dari env
- `src/config/api.js` - Endpoints tetap sama
- `src/lib/api.js` - Auto pakai config
- `src/lib/users.js` - Auto pakai config
- Semua components & hooks - Auto pakai config

---

## 🔍 Verifikasi

Setelah ubah env vars, cek di browser console:

```javascript
// Di browser console
console.log(process.env.NEXT_PUBLIC_BACKEND_URL);
// Harusnya muncul URL AWS kamu
```

Atau cek Network tab di DevTools:
- Request ke `/api/*` harus proxy ke AWS URL

---

## 🎯 Summary

| Yang Diubah | Lokasi | Keterangan |
|------------|--------|------------|
| ✅ Environment Variables | `.env.local` atau Hosting Platform | **Hanya ini yang perlu diubah!** |
| ❌ Code Files | - | Tidak perlu ubah sama sekali |
| ❌ Config Files | - | Auto baca dari env |

---

## 💡 Tips

1. **Development:** Pakai `.env.local`
2. **Production:** Set di hosting platform (Vercel, AWS, dll)
3. **Multiple Environments:** Buat `.env.development`, `.env.staging`, `.env.production`

---

## 🚀 Quick Migration Checklist

- [ ] Update `BACKEND_URL` di environment variables
- [ ] Update `NEXT_PUBLIC_BACKEND_URL` di environment variables  
- [ ] Test di development (`npm run dev`)
- [ ] Deploy ke production
- [ ] Verify API calls bekerja

**Total waktu: < 5 menit!** ⚡

