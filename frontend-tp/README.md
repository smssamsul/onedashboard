# One Dashboard - Frontend

Next.js application untuk One Dashboard management system.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm/yarn/pnpm

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local dengan backend URL yang sesuai

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

## 📁 Project Structure

```
src/
├── config/          # Configuration (env, API endpoints)
├── lib/             # API functions & utilities
├── hooks/           # Custom React hooks
├── app/             # Next.js pages & API routes
└── components/      # React components
```

Lihat [ARCHITECTURE.md](./ARCHITECTURE.md) untuk detail struktur.

## ⚙️ Environment Setup

Lihat [ENV_SETUP.md](./ENV_SETUP.md) untuk panduan lengkap setup environment variables.

### Quick Setup

**Development:**
```bash
# .env.local
BACKEND_URL=http://localhost:8000
NODE_ENV=development
```

**Production:**
Set environment variables di hosting platform (Vercel, Railway, dll):
- `BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `NODE_ENV=production`

## 🏗️ Architecture

Project ini menggunakan **layered architecture**:

1. **Components** - UI layer
2. **Hooks** - State management
3. **Lib Functions** - API calls & business logic
4. **Base API Client** - Centralized API handling
5. **Config** - Environment & endpoints

### Kapan Pakai Apa?

- **Hooks** (`useUsers`, `useKategori`) - Untuk complex state management
- **Lib Functions** (`getUsers`, `getKategori`) - Untuk simple operations
- **API Routes** (`app/api/`) - Hanya untuk proxy CORS

Lihat [ARCHITECTURE.md](./ARCHITECTURE.md) untuk detail.

## 📚 Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture & patterns
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment setup guide

## 🛠️ Development

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Lint
npm run lint
```

## 🌍 Environment Migration

Project ini **mudah dipindahkan** ke environment manapun:

1. **Ubah environment variables** di `.env.local` atau hosting platform
2. **Backend URL otomatis ter-update** via `src/config/env.js`
3. **Tidak perlu ubah code** - semua menggunakan config

## 📦 Tech Stack

- **Next.js 16** - React framework
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **React Hot Toast** - Notifications
- **PrimeReact** - UI components

## 📝 License

Private project - All rights reserved
