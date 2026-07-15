# Architecture Documentation

## Struktur Project

```
src/
├── config/              # Configuration files
│   ├── env.js          # Environment variables
│   └── api.js          # API endpoints configuration
│
├── lib/                # Pure utility functions
│   ├── api.js          # Base API client
│   ├── users.js        # User API functions
│   ├── kategori.js     # Category API functions
│   └── ...
│
├── hooks/              # Custom React hooks
│   ├── useUsers.js     # User state management
│   ├── useKategori.js  # Category state management
│   └── ...
│
├── app/
│   ├── api/            # Next.js API Routes (Proxy only)
│   │   └── login/
│   │       └── route.js
│   │
│   └── admin/          # Admin pages
│       └── users/
│           └── page.js
│
└── components/         # React components
    └── Layout.js
```

## Layer Architecture

```
┌─────────────────────────────────────┐
│  Components (UI Layer)              │
│  - Rendering                         │
│  - User interactions                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Hooks (State Management)           │
│  - useUsers, useKategori, etc.      │
│  - Loading/error states             │
│  - Auto-refresh                     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Lib Functions (API Layer)          │
│  - users.js, kategori.js, etc.      │
│  - Pure API calls                   │
│  - Request/response handling        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Base API Client (api.js)           │
│  - Auth headers                     │
│  - Error handling                   │
│  - Toast notifications               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Config (env.js, api.js)            │
│  - Environment variables             │
│  - API endpoints                    │
│  - Feature flags                     │
└─────────────────────────────────────┘
```

## Kapan Pakai Apa?

### 1. **Components** (`app/` atau `components/`)
- UI rendering
- User interactions
- Event handlers

### 2. **Hooks** (`src/hooks/`)
Pakai hooks jika:
- ✅ Perlu state management (loading, error, data)
- ✅ Perlu auto-refresh setelah mutation
- ✅ Digunakan di banyak components
- ✅ Perlu optimistic updates

Contoh:
```javascript
const { kategori, addKategori, loading } = useKategori();
```

### 3. **Lib Functions** (`src/lib/`)
Pakai lib langsung jika:
- ✅ One-time fetch (tidak perlu state)
- ✅ Server-side rendering
- ✅ Simple operations
- ✅ Tidak perlu loading state

Contoh:
```javascript
const users = await getUsers();
```

### 4. **API Routes** (`app/api/`)
Hanya untuk:
- ✅ Proxy untuk menghindari CORS
- ✅ Server-side only logic
- ✅ Webhooks dari third-party

## Environment Configuration

### Setup
1. Copy `.env.example` ke `.env.local` (development)
2. Set environment variables di hosting platform (production)

### Variables
- `BACKEND_URL` - Backend API URL
- `NEXT_PUBLIC_BACKEND_URL` - Client-side accessible URL
- `NODE_ENV` - Environment mode
- `ENABLE_API_LOGGING` - Enable/disable API logging
- `ENABLE_TOAST` - Enable/disable toast notifications

Lihat `ENV_SETUP.md` untuk detail lengkap.

## API Endpoints

Semua endpoints didefinisikan di `src/config/api.js`:

```javascript
import { API_ENDPOINTS } from '@/config/api';

// Use endpoints
const users = await api(API_ENDPOINTS.admin.users);
const user = await api(API_ENDPOINTS.admin.userById(1));
```

## Best Practices

### 1. **Konsistensi**
- Gunakan `API_ENDPOINTS` untuk semua endpoint
- Gunakan `api()` function untuk semua API calls
- Standardisasi error handling

### 2. **Separation of Concerns**
- Components: UI only
- Hooks: State management
- Lib: Business logic
- Config: Configuration

### 3. **Scalability**
- Mudah menambah endpoint baru di `config/api.js`
- Mudah menambah feature baru dengan pattern yang sama
- Environment variables untuk mudah pindah environment

### 4. **Maintainability**
- Centralized configuration
- Consistent patterns
- Clear documentation

## Migration Guide

### Dari Old Structure ke New Structure

**Before:**
```javascript
// Hardcoded URL
const res = await fetch('/api/admin/users', { ... });
```

**After:**
```javascript
// Using config
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/config/api';

const res = await api(API_ENDPOINTS.admin.users);
```

## Testing

Untuk testing, mock `src/config/env.js`:

```javascript
// test/setup.js
jest.mock('@/config/env', () => ({
  backendUrl: 'http://localhost:8000',
  apiBasePath: '/api',
  // ...
}));
```

