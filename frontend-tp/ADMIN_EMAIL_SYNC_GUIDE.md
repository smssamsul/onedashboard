# Panduan Admin: Fix Masalah Email Tidak Bisa Login

## ⚠️ Masalah

Ketika admin mengubah email user (misal dari `asep@gmai.com` ke `asep@gmail.com`):
- ✅ Email di tabel `users` sudah terupdate
- ❌ Email di tabel `authentication/login` masih pakai email lama
- ❌ User tidak bisa login dengan email baru

## 🔧 Solusi untuk Admin

### Opsi 1: Minta Backend Developer Fix (RECOMMENDED)

**Kirimkan request ke backend developer:**

```
Subject: Fix Email Sync Issue - User ID [ID_USER]

Masalah:
User ID [ID_USER] email sudah diubah dari [EMAIL_LAMA] ke [EMAIL_BARU] di tabel users,
tapi tidak bisa login dengan email baru karena email di tabel authentication/login 
masih pakai email lama.

Request:
Tolong update endpoint PUT /api/admin/users/{id} untuk sync email di kedua tabel:
1. Tabel users (sudah OK)
2. Tabel authentication/login (perlu di-fix)

Atau bisa fix manual untuk user ini dulu:
- User ID: [ID_USER]
- Email baru: [EMAIL_BARU]
```

### Opsi 2: Fix Manual via SQL (TEMPORARY)

**Jika punya akses database, bisa fix manual:**

```sql
-- 1. Cek email di tabel users (harusnya sudah terupdate)
SELECT id, email FROM users WHERE id = [USER_ID];
-- Expected: email = "[EMAIL_BARU]"

-- 2. Cek email di tabel authentication (masih email lama)
SELECT user_id, email FROM [AUTH_TABLE_NAME] WHERE user_id = [USER_ID];
-- Current: email = "[EMAIL_LAMA]" ❌

-- 3. Update email di tabel authentication
UPDATE [AUTH_TABLE_NAME] 
SET email = '[EMAIL_BARU]' 
WHERE user_id = [USER_ID];

-- 4. Verify
SELECT user_id, email FROM [AUTH_TABLE_NAME] WHERE user_id = [USER_ID];
-- Expected: email = "[EMAIL_BARU]" ✅
```

**Contoh untuk User ID 11:**
```sql
-- Update email di tabel authentication
UPDATE auth_table 
SET email = 'asep@gmail.com' 
WHERE user_id = 11;

-- Verify
SELECT user_id, email FROM auth_table WHERE user_id = 11;
```

### Opsi 3: Informasi ke User (TEMPORARY)

**Sementara backend belum di-fix:**

1. **Informasikan ke user:**
   - Email sudah diubah menjadi `[EMAIL_BARU]`
   - Tapi untuk sementara, login masih pakai email lama: `[EMAIL_LAMA]`
   - Setelah backend di-fix, baru bisa login dengan email baru

2. **Atau reset password user:**
   - Buat user baru dengan email yang benar
   - Atau minta backend untuk sync email

## 📋 Checklist Admin

Setelah mengubah email user:

- [ ] Cek apakah user bisa login dengan email baru
- [ ] Jika tidak bisa, cek apakah backend sudah sync email
- [ ] Jika belum, pilih salah satu solusi di atas
- [ ] Informasikan ke user tentang status login

## 🔍 Cara Cek Masalah

1. **Cek di admin panel:**
   - User ID: [ID]
   - Email di tabel users: [EMAIL_BARU] ✅

2. **Cek login:**
   - Login dengan [EMAIL_BARU] → ❌ "Email tidak terdaftar"
   - Login dengan [EMAIL_LAMA] → ✅ Berhasil

3. **Kesimpulan:**
   - Email di tabel `users` sudah terupdate ✅
   - Email di tabel `authentication/login` masih email lama ❌
   - Backend perlu sync email di kedua tabel

## 📝 Catatan

- **Root Cause:** Backend endpoint `PUT /api/admin/users/{id}` hanya update tabel `users`, tidak update tabel `authentication/login`
- **Permanent Fix:** Backend harus update endpoint untuk sync email di kedua tabel
- **Temporary Fix:** Update manual via SQL atau minta user login dengan email lama

## 🔗 Related Files

- Backend: `PUT /api/admin/users/{id}` endpoint
- Documentation: `BACKEND_REQUIREMENT.md`
- Frontend Warning: `src/app/admin/users/editUsers.js`

