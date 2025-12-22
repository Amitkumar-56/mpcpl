// src/app/api/t-invoice/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const transporter_id = searchParams.get('id') || searchParams.get('transporter_id');

    if (!transporter_id) {
      return NextResponse.json(
        { success: false, error: 'Transporter ID is required' },
        { status: 400 }
      );
    }

    const transporterId = parseInt(transporter_id);
    if (isNaN(transporterId) || transporterId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid transporter ID' },
        { status: 400 }
      );
    }

    // Fetch t_invoice records with related data
    const query = `
      SELECT 
        ti.*,
        p.pname as product_name,
        t.transporter_name,
        fs.station_name
      FROM t_invoice ti
      LEFT JOIN product p ON ti.product_id = p.id
      LEFT JOIN transporters t ON ti.transporter_id = t.id
      LEFT JOIN filling_stations fs ON ti.fs_id = fs.id
      WHERE ti.transporter_id = ?
      ORDER BY ti.id DESC
    `;

    const results = await executeQuery(query, [transporterId]);

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error fetching T-invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

