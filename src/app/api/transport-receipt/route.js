// src/app/api/transport_receipt/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Shipment ID is required' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      'SELECT * FROM shipment WHERE id = ?',
      [id]
    );

    if (result.length === 0) {
      return NextResponse.json(
        { error: `No shipment found with ID: ${id}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      shipment: result[0]
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}