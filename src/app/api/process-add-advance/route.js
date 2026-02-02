// src/app/api/process-add-advance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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

    // Insert into advance_history
    const advanceHistorySql = `
      INSERT INTO advance_history 
      (voucher_id, amount, given_date, given_by, created_at) 
      VALUES (?, ?, NOW(), ?, NOW())
    `;
    await executeQuery(advanceHistorySql, [
      voucher_id,
      advance_amount,
      user_id ? parseInt(user_id) : 0
    ]);

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
        section: 'Add Advance',
        userId: userId,
        userName: userName,
        action: 'update',
        remarks: `Advance added: ₹${advance_amount}. New advance: ₹${newAdvance}, Remaining: ₹${newRemaining}`,
        oldValue: { advance: current.advance, remaining_amount: current.advance - current.total_expense },
        newValue: { advance: newAdvance, remaining_amount: newRemaining },
        recordType: 'voucher',
        recordId: parseInt(voucher_id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ success: true, message: 'Advance added successfully', advance: newAdvance, remaining_amount: newRemaining });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}