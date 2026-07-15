# RajaOngkir V2 Migration Guide

## Environment Variables

**REQUIRED** - Set these in Vercel dashboard before deploying:

1. `RAJAONGKIR_API_KEY` - Your RajaOngkir/Komerce API key
2. `NEXT_PUBLIC_RAJAONGKIR_ORIGIN` - Default origin subdistrict ID (e.g., 151)

## Local Development

Create `.env.local` file (already in .gitignore):

```env
RAJAONGKIR_API_KEY=YOUR_KEY_HERE
NEXT_PUBLIC_RAJAONGKIR_ORIGIN=151
```

## API Endpoints Updated

All endpoints now use RajaOngkir V2 (Komerce) API:

- `/api/rajaongkir/cities` - Search destinations
- `/api/rajaongkir/cost` - Calculate shipping cost (GET & POST)
- `/api/rajaongkir/find-origin` - Find origin location
- `/api/rajaongkir/search` - Search destinations (alias)

## Base URL

- Old: `https://api.rajaongkir.com/starter`
- New: `https://rajaongkir.komerce.id/api/v1`

## Testing

After setting environment variables, test locally:

```bash
# Test cities search
curl "http://localhost:3000/api/rajaongkir/cities?search=jakarta&limit=5"

# Test cost calculation (GET)
curl "http://localhost:3000/api/rajaongkir/cost?origin=153&destination=5011&weight=1000&courier=jne"

# Test cost calculation (POST)
curl -X POST -H "Content-Type: application/json" \
  -d '{"origin":153,"destination":5011,"weight":1000,"courier":"jne"}' \
  http://localhost:3000/api/rajaongkir/cost
```

## Rollback

If you need to rollback, revert the commit:

```bash
git revert HEAD
```

## Notes

- All responses return HTTP 200 with `success: false` on errors (to avoid frontend crashes)
- Error handling is silent (no exceptions thrown to frontend)
- API key is now read from environment variables (not hardcoded)

