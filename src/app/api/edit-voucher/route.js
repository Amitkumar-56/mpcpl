import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');

    if (!voucher_id) {
      return NextResponse.json({ success: false, error: 'Voucher ID required' }, { status: 400 });
    }

    // Fetch voucher details
    const voucherQuery = `
      SELECT v.*, 
             e.name as emp_name, 
             s.station_name,
             c.name as customer_name
      FROM vouchers v
      LEFT JOIN employee_profile e ON v.emp_id = e.id
      LEFT JOIN filling_stations s ON v.station_id = s.id
      LEFT JOIN customers c ON v.customer_id = c.id
      WHERE v.voucher_id = ? LIMIT 1
    `;
    const voucherResult = await executeQuery(voucherQuery, [voucher_id]);

    if (voucherResult.length === 0) {
      return NextResponse.json({ success: false, error: 'Voucher not found' }, { status: 404 });
    }

    // Fetch items for this voucher
    const itemsQuery = `
      SELECT * FROM vouchers_items WHERE voucher_id = ? ORDER BY created_at DESC
    `;
    const items = await executeQuery(itemsQuery, [voucher_id]);

    return NextResponse.json({
      success: true,
      voucher: voucherResult[0],
      items: items || []
    });
  } catch (error) {
    console.error('Edit voucher API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { voucher_id, total_expense, advance } = body;

    if (!voucher_id) {
      return NextResponse.json({ success: false, error: 'Voucher ID required' }, { status: 400 });
    }

    // Calculate remaining amount: remaining = advance - total_expense
    const remaining = parseFloat(advance || 0) - parseFloat(total_expense || 0);

    // Update voucher
    const updateQuery = `
      UPDATE vouchers 
      SET total_expense = ?, advance = ?, remaining_amount = ?, updated_at = NOW()
      WHERE voucher_id = ?
    `;
    await executeQuery(updateQuery, [total_expense, advance, remaining, voucher_id]);

    return NextResponse.json({
      success: true,
      message: 'Voucher updated successfully',
      remaining_amount: remaining
    });
  } catch (error) {
    console.error('Edit voucher update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
