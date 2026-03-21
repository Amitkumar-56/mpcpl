// src/app/api/process-add-advance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const voucher_id = formData.get('voucher_id');
    const voucher_no = formData.get('voucher_no');
    const advance_amount = formData.get('advance_amount');

    // Get current user info
    let currentUserId = null;
    let currentUserName = null;
    
    try {
      // Get user from session/token
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          currentUserId = decoded.userId || decoded.id;
          // Get user name from employee_profile
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [currentUserId]
          );
          if (users.length > 0 && users[0].name) {
            currentUserId = users[0].id;
            currentUserName = users[0].name;
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user info:', authError);
    }

    // Insert into vouchers_items table
    const insertItemSql = `
      INSERT INTO vouchers_items (voucher_id, item_details, amount, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    await executeQuery(insertItemSql, [voucher_id, 'Advance Payment', advance_amount]);

    // Update voucher advance amount and recalculate remaining_amount = advance - total_expense
    // Fetch current totals
    const selectSql = 'SELECT total_expense, advance FROM vouchers WHERE voucher_id = ? LIMIT 1';
    const rows = await executeQuery(selectSql, [voucher_id]);
    const current = rows[0] || { total_expense: 0, advance: 0 };
    const newAdvance = parseFloat(current.advance || 0) + parseFloat(advance_amount || 0);
    const newRemaining = newAdvance - parseFloat(current.total_expense || 0);

    const updateSql = 'UPDATE vouchers SET advance = ?, remaining_amount = ?, updated_at = NOW() WHERE voucher_id = ?';
    await executeQuery(updateSql, [newAdvance, newRemaining, voucher_id]);

    // Record history (who added advance)
    const historySql = `
      INSERT INTO voucher_history (row_id, user_id, amount, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    await executeQuery(historySql, [voucher_id, currentUserId, advance_amount]);

    // Insert into advance_history with proper user info
    const advanceHistorySql = `
      INSERT INTO advance_history 
      (voucher_id, amount, given_date, given_by, created_at) 
      VALUES (?, ?, NOW(), ?, NOW())
    `;
    await executeQuery(advanceHistorySql, [
      voucher_id,
      advance_amount,
      currentUserId || 0
    ]);

    // Create audit log
    try {
      await createAuditLog({
        page: 'Vouchers',
        uniqueCode: voucher_id.toString(),
        section: 'Add Advance',
        userId: currentUserId,
        userName: currentUserName,
        action: 'update',
        remarks: `Advance added: ₹${advance_amount} by ${currentUserName || 'Unknown'}. New advance: ₹${newAdvance}, Remaining: ₹${newRemaining}`,
        oldValue: { advance: current.advance, remaining_amount: current.advance - current.total_expense },
        newValue: { advance: newAdvance, remaining_amount: newRemaining },
        recordType: 'voucher',
        recordId: parseInt(voucher_id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Advance added successfully', 
      advance: newAdvance, 
      remaining_amount: newRemaining,
      given_by_name: currentUserName 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}