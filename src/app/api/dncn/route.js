// src/app/api/dncn/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sup_id = searchParams.get('id') || searchParams.get('sup_id');

    if (!sup_id) {
      return NextResponse.json(
        { success: false, error: 'Supply ID is required' },
        { status: 400 }
      );
    }

    const supplyId = parseInt(sup_id);
    if (isNaN(supplyId) || supplyId <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid supply ID' },
        { status: 400 }
      );
    }

    // Fetch DNCN records
    const query = `
      SELECT 
        id,
        sup_id,
        type,
        amount,
        status,
        t_dncn_date,
        remarks
      FROM t_dncn 
      WHERE sup_id = ? 
      ORDER BY id DESC
    `;

    const results = await executeQuery(query, [supplyId]);

    // Also fetch stock details for breadcrumb
    const stockQuery = `SELECT * FROM stock WHERE id = ?`;
    const stockResult = await executeQuery(stockQuery, [supplyId]);

    return NextResponse.json({
      success: true,
      data: results,
      stock: stockResult.length > 0 ? stockResult[0] : null
    });

  } catch (error) {
    console.error('Error fetching DNCN:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

