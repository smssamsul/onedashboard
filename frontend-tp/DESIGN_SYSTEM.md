# Premium Design System - Dashboard Refactor

## 🎯 Tujuan
Mengubah dashboard dari "custom dashboard" menjadi **product-grade SaaS** dengan tampilan premium, soft, rapi, dan konsisten.

## 📐 Design System Overview

### 1. Typography Scale
```
--text-xs: 0.75rem (12px)   → Labels, captions, uppercase text
--text-sm: 0.875rem (14px)  → Secondary text, body small
--text-base: 1rem (16px)     → Body text (default)
--text-lg: 1.125rem (18px)   → Subheadings, card values
--text-xl: 1.25rem (20px)    → Section titles
--text-2xl: 1.5rem (24px)    → Large headings, card values
--text-3xl: 1.875rem (30px)  → Hero headings
```

**Font Weights:**
- `400` (normal) - Body text
- `500` (medium) - Labels, secondary emphasis
- `600` (semibold) - Section titles, important labels
- `700` (bold) - Card values, main headings

**Line Heights:**
- `1.25` (tight) - Headings, values
- `1.5` (normal) - Body text
- `1.75` (relaxed) - Long paragraphs

### 2. Spacing Scale (8px base)
```
--space-1: 0.25rem (4px)
--space-2: 0.5rem (8px)
--space-3: 0.75rem (12px)
--space-4: 1rem (16px)
--space-5: 1.25rem (20px)
--space-6: 1.5rem (24px)
--space-8: 2rem (32px)
--space-10: 2.5rem (40px)
--space-12: 3rem (48px)
```

**Prinsip:**
- Gunakan spacing yang konsisten berdasarkan scale
- White space yang cukup untuk readability
- Gap antar elemen: `--space-4` hingga `--space-6`

### 3. Border Radius (Soft & Consistent)
```
--radius-sm: 0.5rem (8px)   → Small elements, inputs
--radius-md: 0.75rem (12px) → Cards, buttons
--radius-lg: 1rem (16px)    → Large cards
--radius-xl: 1.25rem (20px) → Panels
--radius-full: 9999px       → Circles, avatars
```

**Prinsip:**
- Radius yang lebih besar = lebih soft & premium
- Konsisten untuk elemen yang sama level

### 4. Shadows (Soft UI Style)
```
--shadow-xs: Subtle border effect
--shadow-sm: Small elevation
--shadow-md: Medium elevation
--shadow-lg: Large elevation
--shadow-xl: Extra large elevation

--shadow-card: Premium card shadow (multi-layer)
--shadow-card-hover: Enhanced shadow on hover
```

**Prinsip Soft UI:**
- Multi-layer shadows untuk depth
- Opacity rendah (0.05-0.12) untuk softness
- Hover effect dengan shadow yang lebih kuat

### 5. Icon Sizing
```
--icon-xs: 1rem (16px)   → Small inline icons
--icon-sm: 1.25rem (20px) → Default icons
--icon-md: 1.5rem (24px)  → Card icons (standard)
--icon-lg: 2rem (32px)    → Large avatars, hero icons
```

**Konsistensi:**
- Summary cards: `24px` (icon-md)
- Revenue cards: `24px` (icon-md)
- Staff avatars: `32px` (icon-lg)

## 🎨 Komponen Refactor

### Summary Cards (Stat Boxes)

**Sebelum:**
- Padding: `1rem` (inconsistent)
- Border radius: `0.75rem`
- Shadow: `0 1px 3px rgba(0, 0, 0, 0.05)` (flat)
- Icon: `2.75rem` dengan background solid
- Typography: Font size tidak konsisten

**Sesudah:**
- Padding: `1.5rem` (--space-6)
- Border radius: `1rem` (--radius-lg)
- Shadow: Multi-layer soft shadow
- Icon: `3.5rem` dengan gradient background
- Typography: Hierarki jelas dengan scale
- Hover effect: Subtle top border + shadow enhancement

**Kenapa Premium:**
1. **Soft shadows** memberikan depth tanpa terlihat keras
2. **Gradient icon** menambah visual interest
3. **Hover effect** memberikan feedback yang smooth
4. **Spacing konsisten** membuat layout terlihat rapi
5. **Typography hierarchy** membuat informasi mudah dibaca

### Panels

**Sebelum:**
- Padding: `1.75rem` (inconsistent)
- Border radius: `0.75rem`
- Shadow: Flat
- Header: Spacing tidak konsisten

**Sesudah:**
- Padding: `2rem` (--space-8)
- Border radius: `1.25rem` (--radius-xl)
- Shadow: Premium multi-layer
- Header: Border bottom dengan spacing jelas
- Typography: Eyebrow + Title dengan hierarchy jelas

**Kenapa Premium:**
1. **Larger radius** membuat panel terlihat lebih soft
2. **Consistent padding** memberikan white space yang cukup
3. **Clear hierarchy** dengan eyebrow + title
4. **Subtle border** memisahkan header tanpa terlihat keras

### Revenue Cards

**Sebelum:**
- Padding: `1rem`
- Gap: `0.875rem`
- Shadow: Flat
- Hover: Tidak ada

**Sesudah:**
- Padding: `1.25rem` (--space-5)
- Gap: `1rem` (--space-4)
- Shadow: Soft shadow dengan hover effect
- Hover: Slide effect + border color change

**Kenapa Premium:**
1. **Micro-interactions** (hover slide) memberikan feedback
2. **Consistent spacing** membuat layout rapi
3. **Soft shadows** memberikan depth

### Staff Cards

**Sebelum:**
- Padding: `2rem`
- Typography: Tidak konsisten
- Spacing: Tidak menggunakan scale

**Sesudah:**
- Padding: `2rem` (--space-8)
- Typography: Menggunakan scale yang jelas
- Spacing: Semua menggunakan spacing scale
- Avatar: Gradient dengan soft shadow

**Kenapa Premium:**
1. **Consistent typography** membuat informasi mudah dibaca
2. **Proper spacing** memberikan white space yang cukup
3. **Gradient avatar** menambah visual interest

## 📊 Perbandingan Visual

### Typography
- **Sebelum:** Font size random, weight tidak konsisten
- **Sesudah:** Scale yang jelas, weight dengan hierarchy

### Spacing
- **Sebelum:** Random values (0.875rem, 1.25rem, dll)
- **Sesudah:** Menggunakan 8px base scale

### Shadows
- **Sebelum:** Flat shadow `0 1px 3px`
- **Sesudah:** Multi-layer soft shadow dengan opacity rendah

### Border Radius
- **Sebelum:** `0.75rem` untuk semua
- **Sesudah:** Scale dari `0.5rem` hingga `1.25rem` berdasarkan level

### Icons
- **Sebelum:** `22px` (tidak konsisten)
- **Sesudah:** `24px` (icon-md) untuk semua card icons

## 🎯 Alasan Kenapa Terasa Premium

1. **Konsistensi**
   - Semua spacing menggunakan scale yang sama
   - Typography dengan hierarchy yang jelas
   - Shadows dan radius yang konsisten

2. **Softness**
   - Multi-layer shadows yang tidak keras
   - Border radius yang lebih besar
   - Opacity rendah untuk depth

3. **White Space**
   - Padding yang cukup untuk readability
   - Gap yang konsisten antar elemen
   - Tidak terlalu padat

4. **Micro-interactions**
   - Hover effects yang smooth
   - Transitions yang halus
   - Visual feedback yang jelas

5. **Visual Hierarchy**
   - Typography scale yang jelas
   - Color contrast yang tepat
   - Spacing yang membedakan level

6. **Attention to Detail**
   - Gradient backgrounds untuk icons
   - Subtle top border pada hover
   - Smooth transitions
   - Custom scrollbar yang tipis

## 📝 Best Practices

1. **Selalu gunakan spacing scale** - Jangan hardcode values
2. **Konsisten dengan typography** - Gunakan scale yang sudah ditentukan
3. **Soft shadows** - Multi-layer dengan opacity rendah
4. **White space** - Berikan ruang yang cukup
5. **Hover effects** - Berikan feedback visual
6. **Transitions** - Smooth untuk semua interaksi

## 🔄 Migration Notes

File lama: `dashboard.css`
File baru: `dashboard-premium.css`

Semua komponen sudah di-refactor dengan design system baru. Import sudah diubah di `sales/page.js`.

