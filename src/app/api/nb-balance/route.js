// src/app/api/nb-balance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET: Fetch cash balance and history
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Get total cash balance
    const cashBalance = await executeQuery(
      'SELECT balance FROM cash_balance LIMIT 1'
    );

    // Get cash history with pagination
    const cashHistory = await executeQuery(`
      SELECT r.id, c.name, r.amount, r.payment_date, 
             r.comments, r.payment_type 
      FROM recharge_wallets r 
      JOIN customers c ON r.com_id = c.id 
      WHERE r.payment_type = 'Cash' 
      ORDER BY r.id DESC 
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    // Get total count for pagination
    const totalCount = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM recharge_wallets r 
      WHERE r.payment_type = 'Cash'
    `);

    return NextResponse.json({
      success: true,
      data: {
        totalCash: cashBalance[0]?.balance || 0,
        cashHistory,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount[0]?.count / limit),
          totalRecords: totalCount[0]?.count
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cash data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch cash data' },
      { status: 500 }
    );
  }
}

// PUT: Update a record
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, amount, payment_date, comments, payment_type } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const result = await executeQuery(
      `UPDATE recharge_wallets 
       SET amount = ?, payment_date = ?, comments = ?, payment_type = ? 
       WHERE id = ?`,
      [amount, payment_date, comments, payment_type, id]
    );

    if (result.affectedRows > 0) {
      return NextResponse.json({
        success: true,
        message: 'Record updated successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update record' },
      { status: 500 }
    );
  }
}