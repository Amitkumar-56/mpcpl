// src/app/api/process-add-cash/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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

    // Get current user for audit log
    let userId = user_id ? parseInt(user_id) : null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || userId;
      userName = currentUser?.userName || null;
      
      if (!userName && userId) {
        const users = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0) {
          userName = users[0].name;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Vouchers',
        uniqueCode: voucher_id.toString(),
        section: 'Add Cash Expense',
        userId: userId,
        userName: userName,
        action: 'update',
        remarks: `Cash expense added: ${item_details} - ₹${amount}. New total: ₹${newTotal}, Remaining: ₹${newRemaining}`,
        oldValue: { total_expense: current.total_expense, remaining_amount: current.advance - current.total_expense },
        newValue: { total_expense: newTotal, remaining_amount: newRemaining },
        recordType: 'voucher',
        recordId: parseInt(voucher_id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ success: true, message: 'Cash added successfully', total_expense: newTotal, remaining_amount: newRemaining });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}