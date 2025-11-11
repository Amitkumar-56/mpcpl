// src/app/api/voucher-print/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = parseInt(searchParams.get('voucher_id'));

    if (!voucher_id || isNaN(voucher_id)) {
      return NextResponse.json({ 
        success: false,
        error: 'Valid Voucher ID is required' 
      }, { status: 400 });
    }

    console.log('Fetching voucher for ID:', voucher_id);

    // Main voucher query
    const query = `
      SELECT 
        v.*,
        vi.*,
        e.name AS emp_name, 
        e.qr_code AS emp_qr_code,
        c.name AS customer_name,
        fs.station_name,
        fs.address AS station_address,
        approver.name AS approved_by_name
      FROM 
        vouchers v
      LEFT JOIN vouchers_items vi ON v.voucher_id = vi.voucher_id
      LEFT JOIN employee_profile e ON v.emp_id = e.id
      LEFT JOIN customers c ON v.customer_id = c.id
      LEFT JOIN filling_stations fs ON v.station_id = fs.id
      LEFT JOIN employee_profile approver ON v.approved_by = approver.id
      WHERE v.voucher_id = ?
      ORDER BY vi.item_id
    `;

    const result = await executeQuery(query, [voucher_id]);
    console.log('Query result count:', result.length);

    if (!result || result.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Voucher not found' 
      }, { status: 404 });
    }

    // Fetch advance history
    let advanceHistory = [];
    try {
      const advanceQuery = `
        SELECT 
          ah.id, 
          ah.voucher_id, 
          ah.amount, 
          ah.given_date, 
          ah.given_by, 
          e.name AS given_by_name
        FROM advance_history ah
        LEFT JOIN employee_profile e ON ah.given_by = e.id
        WHERE ah.voucher_id = ?
        ORDER BY ah.given_date ASC
      `;
      advanceHistory = await executeQuery(advanceQuery, [voucher_id]);
      console.log('Advance history count:', advanceHistory.length);
    } catch (advanceError) {
      console.error('Error fetching advance history:', advanceError);
    }

    // Calculate total amount
    const total_amount = result.reduce((sum, item) => {
      return sum + parseFloat(item.amount || 0);
    }, 0);

    console.log('Total amount calculated:', total_amount);

    return NextResponse.json({
      success: true,
      voucher: result[0],
      items: result.filter(item => item.item_id),
      advance_history: advanceHistory || [],
      total_amount: total_amount
    });

  } catch (error) {
    console.error('Error in voucher-print API:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}