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

    const payload = {
      name,
      email,
      amount: parseInt(amount, 10),
      product_name: product_name || 'Product',
      order_id: order_id ? parseInt(order_id, 10) : null,
    };

    const response = await fetch(`${BACKEND_URL}/api/doku/create-payment-ewallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error('[DOKU_EWALLET] Non-JSON response:', responseText);
      return NextResponse.json(
        { success: false, message: 'Backend error: Response bukan JSON' },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('DOKU Ewallet Backend Error:', data);
      return NextResponse.json(
        {
          success: false,
          message: data?.message || 'Gagal membuat transaksi DOKU',
          error: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('DOKU Ewallet API Proxy Error:', error);
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
