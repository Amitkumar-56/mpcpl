import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');

    if (!voucher_id) {
      return NextResponse.json({ success: false, error: 'Voucher ID required' }, { status: 400 });
    }

    // Fetch voucher with details
    const voucherQuery = `
      SELECT v.*, 
             e.name as emp_name, 
             s.station_name, s.address as station_address,
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

    // Fetch all items for this voucher
    const itemsQuery = `
      SELECT * FROM vouchers_items WHERE voucher_id = ? ORDER BY created_at ASC
    `;
    const items = await executeQuery(itemsQuery, [voucher_id]);

    return NextResponse.json({
      success: true,
      voucher: voucherResult[0],
      items: items || [],
      total_items_amount: items.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
    });
  } catch (error) {
    console.error('Voucher items API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// ✅ DELETE functionality removed - voucher items cannot be deleted
