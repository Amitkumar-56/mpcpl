import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

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

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { voucher_id, items } = await request.json();

    if (!voucher_id || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid request data' }, { status: 400 });
    }

    // Process each item
    for (const item of items) {
      if (item.isNew) {
        // Insert new item
        const insertQuery = `
          INSERT INTO vouchers_items (voucher_id, item_details, amount, created_at)
          VALUES (?, ?, ?, NOW())
        `;
        await executeQuery(insertQuery, [voucher_id, item.item_details, item.amount]);
      } else {
        // Update existing item
        const updateQuery = `
          UPDATE vouchers_items 
          SET item_details = ?, amount = ?, updated_at = NOW()
          WHERE item_id = ? AND voucher_id = ?
        `;
        await executeQuery(updateQuery, [item.item_details, item.amount, item.item_id, voucher_id]);
      }
    }

    return NextResponse.json({ success: true, message: 'Items updated successfully' });
  } catch (error) {
    console.error('Update voucher items API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request);
    if (!authResult.success) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { item_id, voucher_id } = await request.json();

    if (!item_id || !voucher_id) {
      return NextResponse.json({ success: false, error: 'Item ID and Voucher ID required' }, { status: 400 });
    }

    // Delete the item
    const deleteQuery = `DELETE FROM vouchers_items WHERE item_id = ? AND voucher_id = ?`;
    const result = await executeQuery(deleteQuery, [item_id, voucher_id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete voucher item API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
