# Environment Configuration Guide

## Setup Environment Variables

Copy dan rename file ini sesuai environment:

### Development
```bash
# .env.local (untuk development local)
BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
NODE_ENV=development
```

### Production
```bash
# .env.production (untuk production)
BACKEND_URL=http://3.105.234.181:8000
NEXT_PUBLIC_BACKEND_URL=http://3.105.234.181:8000
NODE_ENV=production
```

### Staging
```bash
# .env.staging (untuk staging)
BACKEND_URL=https://staging-api.example.com
NEXT_PUBLIC_BACKEND_URL=https://staging-api.example.com
NODE_ENV=production
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BACKEND_URL` | Backend API URL (server-side) | `http://3.105.234.181:8000` | No |
| `NEXT_PUBLIC_BACKEND_URL` | Backend API URL (client-side) | Same as BACKEND_URL | No |
| `API_BASE_PATH` | API base path untuk proxy | `/api` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `APP_NAME` | Application name | `One Dashboard` | No |
| `APP_URL` | Application URL | `http://localhost:3000` | No |
| `ENABLE_API_LOGGING` | Enable API request logging | `true` | No |
| `ENABLE_TOAST` | Enable toast notifications | `true` | No |

## Quick Start

1. **Development:**
   ```bash
   # Buat file .env.local
   echo "BACKEND_URL=http://localhost:8000" > .env.local
   echo "NODE_ENV=development" >> .env.local
   
   # Run dev server
   npm run dev
   ```

2. **Production:**
   ```bash
   # Set environment variables di hosting platform (Vercel, Railway, dll)
   # Atau buat .env.production
   npm run build
   npm start
   ```

## Notes

- File `.env.local` tidak di-commit ke Git (sudah di .gitignore)
- `NEXT_PUBLIC_*` variables bisa diakses di client-side
- Variables tanpa `NEXT_PUBLIC_` hanya bisa diakses di server-side
- Untuk Vercel: Set environment variables di dashboard Vercel

