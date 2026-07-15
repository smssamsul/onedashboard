import { NextResponse } from 'next/server';
import districtData from '@/data/indonesia-districts.json';

/** CORS headers agar bisa diakses dari domain lain (ternakproperti.com → app.ternakproperti.com) */
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/** Preflight request (OPTIONS) */
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.length < 3) {
        return NextResponse.json({ success: true, data: [] }, { headers: corsHeaders });
    }

    const lowerTerm = query.toLowerCase();

    // Data source structure: 
    // { "kode": { "id_provinsi": 11, ... }, "kecamatan": "...", "provinsi": "...", "kota": "..." }

    const results = districtData.filter(item => {
        // Search by Kecamatan (priority) or Kota
        return (item.kecamatan && item.kecamatan.toLowerCase().includes(lowerTerm)) ||
            (item.kota && item.kota.toLowerCase().includes(lowerTerm));
    }).slice(0, 50).map(item => ({
        // Flatten the structure for easier consumption
        id: `${item.kode.id_provinsi}-${item.kode.id_kota}-${item.kode.id_kecamatan}`, // Create unique ID
        provinsi: item.provinsi,
        kota: item.kota,
        kecamatan: item.kecamatan
    }));

    return NextResponse.json({ success: true, data: results }, { headers: corsHeaders });
}
