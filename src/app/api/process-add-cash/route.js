// src/app/api/process-add-cash/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const voucher_id = formData.get('voucher_id');
    const voucher_no = formData.get('voucher_no');
    const item_details = formData.get('item_details');
    const amount = formData.get('amount');

    // Insert into voucher_items table
    const insertItemSql = `
      INSERT INTO vouchers_items (voucher_id, item_details, amount, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    await executeQuery(insertItemSql, [voucher_id, item_details, amount]);

    // Record history (who added cash) - allow NULL user if not provided
    const user_id = formData.get('user_id');
    const historySql = `
      INSERT INTO voucher_history (row_id, user_id, amount, type, created_at)
      VALUES (?, ?, ?, 'cash', NOW())
    `;
    await executeQuery(historySql, [voucher_id, user_id ? parseInt(user_id) : null, amount]);

    // Update voucher totals: total_expense += amount, remaining_amount = advance - total_expense
    const voucherSql = `SELECT total_expense, advance FROM vouchers WHERE voucher_id = ? LIMIT 1`;
    const rows = await executeQuery(voucherSql, [voucher_id]);
    const current = rows[0] || { total_expense: 0, advance: 0 };
    const newTotal = parseFloat(current.total_expense || 0) + parseFloat(amount || 0);
    const newRemaining = parseFloat(current.advance || 0) - newTotal;

    const updateVoucherSql = `
      UPDATE vouchers SET total_expense = ?, remaining_amount = ?, updated_at = NOW() WHERE voucher_id = ?
    `;
    await executeQuery(updateVoucherSql, [newTotal, newRemaining, voucher_id]);

    return NextResponse.json({ success: true, message: 'Cash added successfully', total_expense: newTotal, remaining_amount: newRemaining });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}