# Customers List Table - Premium UI Improvements

## 🎯 Tujuan
Mengubah tabel Customers List dari "tabel sistem lama" menjadi **tabel SaaS profesional** yang bersih, netral, mudah dibaca, dan nyaman dilihat lama.

## 📊 Perubahan Visual

### 1. Status Badge - Soft & Neutral

**Sebelum:**
- "BELUM" menggunakan warna merah keras (`rgba(248, 113, 113, 0.15)`, `#b91c1c`)
- Terlihat seperti error/warning
- Agresif secara visual

**Sesudah:**
- "BELUM" menggunakan warna neutral soft (`#f3f4f6` background, `#6b7280` text)
- Border soft (`#e5e7eb`)
- Terlihat sebagai status pending/neutral, bukan error
- "Sudah" tetap soft green untuk konsistensi

**CSS:**
```css
.customers-verif-tag.is-unverified {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #e5e7eb;
}
```

### 2. Table Row Hover - Very Subtle

**Sebelum:**
- Transform `translateY(-2px)` - terlalu agresif
- Shadow besar (`0 24px 45px rgba(15, 23, 42, 0.14)`)
- Terasa seperti "melompat"

**Sesudah:**
- Hanya background & border color change
- Shadow soft (`var(--shadow-sm)`)
- Background subtle (`#fafbfc`)
- Tidak ada transform - smooth & tenang

**CSS:**
```css
.customers-table__row:hover {
  background: #fafbfc;
  border-color: #e5e7eb;
  box-shadow: var(--shadow-sm);
  /* No transform */
}
```

### 3. Typography Hierarchy - Clear Focus

**Sebelum:**
- Semua cell font size sama (`0.8rem`)
- Nama tidak cukup menonjol
- Metadata terlalu jelas

**Sesudah:**
- **Nama Customer**: `1rem` (16px), `font-weight: 600`, `color: var(--dash-text-dark)`
- **Metadata (Email, Phone)**: `0.875rem` (14px), `color: var(--dash-muted)`
- **Number Column**: `0.875rem`, `color: var(--dash-muted-light)`, centered
- Visual hierarchy jelas - nama sebagai fokus utama

**CSS:**
```css
.customers-table__cell--strong {
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  color: var(--dash-text-dark);
}

.customers-table__cell[data-label="Email"],
.customers-table__cell[data-label="No Telepon"] {
  font-size: var(--text-sm);
  color: var(--dash-muted);
}
```

### 4. Spacing & Alignment - Professional

**Sebelum:**
- Gap antar row: `0.5rem` (terlalu padat)
- Padding row: `0.5rem 0.65rem` (terlalu kecil)
- Header padding: `0.6rem 0.75rem`

**Sesudah:**
- Gap antar row: `0.75rem` (12px) - lebih lega
- Padding row: `1rem 1.25rem` (16px 20px) - lebih nyaman
- Header padding: `0.875rem 1.25rem` - konsisten
- Border radius: `var(--radius-md)` (12px) - soft

**CSS:**
```css
.customers-table__body {
  gap: var(--space-3); /* 12px */
}

.customers-table__row {
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
}
```

### 5. Links & Actions - Subtle

**Sebelum:**
- History link: `color: #111827`, underline on hover
- Action buttons: transform on hover

**Sesudah:**
- History link: `color: var(--dash-muted)`, no underline
- Hover: `color: var(--accent-primary)`
- Action buttons: hanya color change, no transform
- WhatsApp link: soft green, subtle

**CSS:**
```css
.customers-history-link {
  color: var(--dash-muted);
  font-weight: var(--font-medium);
}

.customers-history-link:hover {
  color: var(--accent-primary);
  text-decoration: none; /* No underline */
}
```

### 6. Table Header - Clean

**Sebelum:**
- Padding: `0.6rem 0.75rem`
- Font size: `0.7rem`

**Sesudah:**
- Padding: `0.875rem 1.25rem`
- Font size: `var(--text-xs)` (12px)
- Border bottom untuk pemisahan jelas
- Background transparent

## 🎨 Prinsip Desain yang Diterapkan

1. **Data-first**: Nama customer sebagai fokus utama
2. **Minimalis**: Tidak ada elemen yang tidak perlu
3. **Soft UI**: Warna soft, shadow halus, tidak keras
4. **Tidak agresif**: Hover subtle, tidak ada transform berlebihan
5. **Professional**: Spacing konsisten, typography hierarchy jelas

## 📝 Ringkasan Perubahan

### Status Badge
- ✅ "BELUM" → Neutral gray (bukan merah)
- ✅ "Sudah" → Soft green (konsisten)
- ✅ Border soft untuk depth

### Table Row
- ✅ Hover sangat halus (background + shadow)
- ✅ Tidak ada transform
- ✅ Spacing lebih lega

### Typography
- ✅ Nama: 16px, semibold, dark
- ✅ Metadata: 14px, normal, muted
- ✅ Hierarchy jelas

### Spacing
- ✅ Row padding: 16px 20px
- ✅ Gap antar row: 12px
- ✅ Header padding: 14px 20px

### Links & Actions
- ✅ Subtle colors
- ✅ No underline
- ✅ Soft hover effects

## 🚀 Hasil

Tabel sekarang:
- ✅ **Bersih** - Tidak padat, spacing cukup
- ✅ **Netral** - Status "BELUM" tidak terlihat seperti error
- ✅ **Mudah dibaca** - Hierarchy typography jelas
- ✅ **Nyaman dilihat lama** - Soft colors, subtle hover
- ✅ **Profesional** - Terasa seperti aplikasi SaaS premium

## 📁 File yang Diubah

1. **`src/styles/sales/customers-premium.css`** - File CSS baru dengan styling premium
2. **`src/app/sales/customers/page.js`** - Import CSS baru

## 🔄 Tidak Diubah

- ✅ Struktur data
- ✅ API calls
- ✅ State management
- ✅ Logic & flow user
- ✅ CTA buttons (tetap ada, tidak diubah)

