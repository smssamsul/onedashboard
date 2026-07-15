# RajaOngkir V1 Basic Setup Guide

## Environment Variables

### Required Environment Variable

Set `RAJAONGKIR_API_KEY` in your environment:

**For Local Development (.env.local):**
```env
RAJAONGKIR_API_KEY=mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb
NEXT_PUBLIC_RAJAONGKIR_ORIGIN=151
```

**IMPORTANT:** 
- Never commit `.env.local` to git (already in `.gitignore`)
- Delete `.env.local` before committing if it contains the actual API key
- Use environment variables in production (Vercel)

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `RAJAONGKIR_API_KEY`
   - **Value:** `mT8nGMeZ4cacc72ba9d93fd4g2xH48Gb`
   - **Environment:** Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your application

## API Endpoints

### GET `/api/rajaongkir/cities`
Search for cities.

**Query Parameters:**
- `search` (optional): Filter cities by name or province

**Example:**
```
GET /api/rajaongkir/cities?search=jakarta
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "city_id": "151",
      "city_name": "Jakarta Barat",
      "province_id": "6",
      "province_name": "DKI Jakarta",
      "type": "Kota",
      "postal_code": "",
      "label": "Jakarta Barat, DKI Jakarta"
    }
  ],
  "count": 1
}
```

### POST `/api/rajaongkir/cost`
Calculate shipping cost.

**Request Body:**
```json
{
  "origin": "151",
  "destination": "152",
  "weight": 1000,
  "courier": "jne"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "price": 18000,
    "etd": "2-3",
    "raw": { ... }
  }
}
```

## Testing

### Test Cities Endpoint
```bash
curl "http://localhost:3000/api/rajaongkir/cities?search=jakarta"
```

### Test Cost Endpoint
```bash
curl -X POST http://localhost:3000/api/rajaongkir/cost \
  -H "Content-Type: application/json" \
  -d '{"origin":"151","destination":"152","weight":1000,"courier":"jne"}'
```

## Error Handling

All endpoints return JSON with consistent format:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Error message in Indonesian"
}
```

## Notes

- All API routes use RajaOngkir V1 Starter (Basic) API
- Only city-based shipping (no subdistrict support)
- API key is read from `process.env.RAJAONGKIR_API_KEY`
- Never hardcode API keys in source files

