// src/app/api/process-add-advance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const voucher_id = formData.get('voucher_id');
    const advance_amount = formData.get('advance_amount');

    // Update voucher advance amount and recalculate remaining_amount = advance - total_expense
    // Fetch current totals
    const selectSql = 'SELECT total_expense, advance FROM vouchers WHERE voucher_id = ? LIMIT 1';
    const rows = await executeQuery(selectSql, [voucher_id]);
    const current = rows[0] || { total_expense: 0, advance: 0 };
    const newAdvance = parseFloat(current.advance || 0) + parseFloat(advance_amount || 0);
    const newRemaining = newAdvance - parseFloat(current.total_expense || 0);

    const updateSql = 'UPDATE vouchers SET advance = ?, remaining_amount = ?, updated_at = NOW() WHERE voucher_id = ?';
    await executeQuery(updateSql, [newAdvance, newRemaining, voucher_id]);

    // Record history (who added advance) - allow NULL user if not provided
    const user_id = formData.get('user_id');
    const historySql = `
      INSERT INTO voucher_history (row_id, user_id, amount, type, created_at)
      VALUES (?, ?, ?, 'advance', NOW())
    `;
    await executeQuery(historySql, [voucher_id, user_id ? parseInt(user_id) : null, advance_amount]);

    return NextResponse.json({ success: true, message: 'Advance added successfully', advance: newAdvance, remaining_amount: newRemaining });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}