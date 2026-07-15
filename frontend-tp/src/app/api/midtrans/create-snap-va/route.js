import { NextResponse } from 'next/server';

import { BACKEND_URL } from "@/config/env";

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, amount, product_name, order_id } = body;

    if (!name || !email || !amount) {
      return NextResponse.json(
        { success: false, message: 'name, email, dan amount wajib diisi' },
        { status: 400 }
      );
    }

    // Proxy ke backend
    const payload = {
      name,
      email,
      amount: parseInt(amount, 10),
      product_name: product_name || 'Product',
      order_id: order_id ? parseInt(order_id, 10) : null,
    };

    console.log('[MIDTRANS_VA] Forwarding to backend:', `${BACKEND_URL}/api/midtrans/create-snap-va`);
    console.log('[MIDTRANS_VA] Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${BACKEND_URL}/api/midtrans/create-snap-va`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('[MIDTRANS_VA] Backend response status:', response.status);

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
      console.log('[MIDTRANS_VA] Backend response data:', JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[MIDTRANS_VA] Non-JSON response:', responseText);
      return NextResponse.json(
        { success: false, message: 'Backend error: Response bukan JSON' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Midtrans VA Backend Error:', data);
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Gagal membuat transaksi Midtrans',
          error: data,
        },
        { status: response.status }
      );
    }

    // Return response dari backend (sudah dalam format yang benar)
    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('Midtrans VA API Proxy Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Gagal terhubung ke server',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}
