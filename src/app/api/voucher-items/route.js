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

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { item_id } = body;

    if (!item_id) {
      return NextResponse.json({ success: false, error: 'Item ID required' }, { status: 400 });
    }

    // Get item amount before deleting
    const itemQuery = 'SELECT amount, voucher_id FROM vouchers_items WHERE item_id = ? LIMIT 1';
    const itemResult = await executeQuery(itemQuery, [item_id]);

    if (itemResult.length === 0) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    const { amount, voucher_id } = itemResult[0];

    // Delete item
    await executeQuery('DELETE FROM vouchers_items WHERE item_id = ?', [item_id]);

    // Update voucher total_expense by subtracting item amount
    const voucherQuery = 'SELECT total_expense, advance FROM vouchers WHERE voucher_id = ? LIMIT 1';
    const voucherResult = await executeQuery(voucherQuery, [voucher_id]);
    const current = voucherResult[0] || { total_expense: 0, advance: 0 };
    
    const newTotal = parseFloat(current.total_expense || 0) - parseFloat(amount || 0);
    const newRemaining = parseFloat(current.advance || 0) - newTotal;

    await executeQuery(
      'UPDATE vouchers SET total_expense = ?, remaining_amount = ?, updated_at = NOW() WHERE voucher_id = ?',
      [Math.max(0, newTotal), newRemaining, voucher_id]
    );

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
