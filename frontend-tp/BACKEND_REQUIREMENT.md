# Backend Requirement: Email Update Sync

## ⚠️ Masalah yang Terjadi (CONFIRMED BUG)

### Contoh Kasus Real:
- **User ID:** 11
- **Nama:** Asep
- **Email di tabel `users`:** `asep@gmail.com` ✅ (sudah terupdate)
- **Email di tabel `authentication/login`:** `asep@gmai.com` ❌ (masih email lama)

### Hasil:
- ❌ Login dengan `asep@gmail.com` → **"Email tidak terdaftar"**
- ✅ Login dengan `asep@gmai.com` → **Berhasil** (tapi ini email typo!)

### Root Cause:
Ketika admin mengubah email user dari `asep@gmai.com` ke `asep@gmail.com`:

1. ✅ Email di tabel `users` sudah terupdate → `asep@gmail.com`
2. ❌ Email di tabel `authentication/login` masih pakai email lama → `asep@gmai.com`
3. ❌ Backend login endpoint cek email di tabel `authentication/login`, bukan di tabel `users`
4. ❌ User tidak bisa login dengan email baru, harus pakai email lama

## 🔧 Solusi yang Diperlukan

### ⚠️ URGENT: Backend harus fix ini segera!

### Endpoint: `PUT /api/admin/users/{id}`

**Backend harus mengupdate email di 2 tempat:**

1. **Tabel `users`** ✅ (sudah dilakukan)
2. **Tabel `authentication/login`** ❌ (perlu ditambahkan - **INI YANG MASALAH**)

### Endpoint: `POST /api/login`

**Backend login endpoint harus cek email di tabel yang benar:**
- Saat ini: Cek email di tabel `authentication/login` (masih email lama)
- Seharusnya: Cek email di tabel `users` (sudah terupdate) ATAU sync kedua tabel

### Contoh Implementasi

```php
// Pseudo code - sesuaikan dengan framework yang digunakan
public function updateUser($id, $data) {
    $oldUser = User::find($id);
    $oldEmail = $oldUser->email;
    $newEmail = $data['email'];
    
    // 1. Update tabel users
    $user = User::where('id', $id)->update([
        'nama' => $data['nama'],
        'email' => $newEmail,
        // ... field lainnya
    ]);
    
    // 2. ⚠️ PENTING: Update email di tabel authentication/login juga
    if ($oldEmail !== $newEmail) {
        // Update di tabel users (untuk login)
        Auth::where('email', $oldEmail)->update([
            'email' => $newEmail
        ]);
        
        // Atau jika menggunakan tabel terpisah
        UserAuth::where('user_id', $id)->update([
            'email' => $newEmail
        ]);
        
        // Atau jika email adalah username di tabel users
        // Pastikan email di tabel users yang digunakan untuk login juga terupdate
    }
    
    return response()->json([
        'success' => true,
        'message' => 'User berhasil diubah',
        'data' => $user
    ]);
}
```

## 📋 Checklist untuk Backend Developer

- [ ] Identifikasi tabel yang digunakan untuk authentication/login
- [ ] Pastikan email di tabel authentication terupdate saat update user
- [ ] Test: Update email user dan coba login dengan email baru
- [ ] Test: Pastikan login dengan email lama tidak bisa (jika diperlukan)
- [ ] Test: Pastikan login dengan email baru bisa

## 🧪 Test Case (CONFIRMED FAILING)

### Test Case 1: Update email typo ke email valid
**Status:** ❌ **FAILING**

- **Setup:**
  - User ID: 11
  - Daftar dengan: `asep@gmai.com` (typo)
  - Edit menjadi: `asep@gmail.com` (benar)
  
- **Expected:**
  - ✅ User bisa login dengan `asep@gmail.com`
  - ❌ Login dengan `asep@gmai.com` tidak bisa (email lama)
  
- **Current Result:**
  - ❌ Login dengan `asep@gmail.com` → **"Email tidak terdaftar"**
  - ✅ Login dengan `asep@gmai.com` → **Berhasil** (masalah!)

- **Data di Database:**
  ```json
  // Tabel users (SUDAH TERUPDATE)
  {
    "id": 11,
    "email": "asep@gmail.com"  ✅
  }
  
  // Tabel authentication/login (MASIH EMAIL LAMA)
  {
    "user_id": 11,
    "email": "asep@gmai.com"  ❌
  }
  ```

### Test Case 2: Update email ke email lain
**Status:** ❌ **FAILING** (same issue)

- User: `user@yahoo.com` → `user@gmail.com`
- Expected: User bisa login dengan `user@gmail.com`
- Current: ❌ User tidak bisa login dengan email baru

## 📝 Catatan Penting

- ⚠️ **URGENT:** Masalah ini sudah terjadi di production
- Frontend sudah memberikan warning yang jelas saat email diubah
- Frontend sudah meminta konfirmasi sebelum update email
- **Backend HARUS memastikan email di tabel authentication juga terupdate**
- Jika tidak, user akan tetap harus login dengan email lama (termasuk email typo!)

## 🔍 Debugging Steps untuk Backend

1. **Cek tabel `users`:**
   ```sql
   SELECT id, email FROM users WHERE id = 11;
   -- Result: email = "asep@gmail.com" ✅
   ```

2. **Cek tabel `authentication/login`:**
   ```sql
   SELECT user_id, email FROM auth_table WHERE user_id = 11;
   -- Result: email = "asep@gmai.com" ❌ (MASALAH DI SINI!)
   ```

3. **Fix:**
   ```sql
   -- Update email di tabel authentication
   UPDATE auth_table 
   SET email = 'asep@gmail.com' 
   WHERE user_id = 11;
   ```

4. **Test login:**
   - Login dengan `asep@gmail.com` → Harus berhasil ✅
   - Login dengan `asep@gmai.com` → Harus gagal ✅

## 🔗 Related Files

- Frontend: `src/app/admin/users/editUsers.js`
- Frontend: `src/app/admin/users/page.js`
- Backend: `PUT /api/admin/users/{id}` endpoint

