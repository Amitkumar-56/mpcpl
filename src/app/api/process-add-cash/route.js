// src/app/api/process-add-cash/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const voucher_id = formData.get('voucher_id');
    let voucher_no = formData.get('voucher_no') || null;
    const item_details = formData.get('item_details');
    const amount = formData.get('amount') || 0;
    const user_id = formData.get('user_id') || null;
    const rental_trip_id = formData.get('rental_trip_id') || null;

    // Fallback: If voucher_no is missing, fetch it from vouchers table
    if (!voucher_no && voucher_id) {
      const vResult = await executeQuery('SELECT voucher_no FROM vouchers WHERE voucher_id = ?', [voucher_id]);
      if (vResult.length > 0) {
        voucher_no = vResult[0].voucher_no || null;
      }
    }

    console.log('Syncing Cash to Rental Trip:', { rental_trip_id, voucher_no, amount });

    // Insert into voucher_items table
    const insertItemSql = `
      INSERT INTO vouchers_items (voucher_id, item_details, amount, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    await executeQuery(insertItemSql, [voucher_id, item_details, amount]);

    // ✅ Sync with Rental Trip if selected
    if (rental_trip_id && rental_trip_id !== "") {
      try {
        // 1. Insert into rental expenses log
        await executeQuery(
          'INSERT INTO rental_trip_expenses (trip_id, type, amount, description) VALUES (?, ?, ?, ?)',
          [rental_trip_id, 'Others', amount, `Voucher ${voucher_no || 'N/A'}: ${item_details}`]
        );

        // Ensure voucher_no column exists
        try {
          await executeQuery("ALTER TABLE rental_trips ADD COLUMN voucher_no VARCHAR(100) AFTER state");
        } catch (e) {}

        // 2. Update total_expense and voucher_no in rental_trips
        await executeQuery(
          'UPDATE rental_trips SET total_expense = (SELECT SUM(amount) FROM rental_trip_expenses WHERE trip_id = ?), voucher_no = ? WHERE id = ?',
          [rental_trip_id, voucher_no, rental_trip_id]
        );

        // 3. Recalculate profit_loss if trip is closed
        const tripData = await executeQuery('SELECT status, received_amount, total_expense FROM rental_trips WHERE id = ?', [rental_trip_id]);
        if (tripData.length > 0 && tripData[0].status === 'Closed') {
          const profitLoss = (parseFloat(tripData[0].received_amount || 0) - parseFloat(tripData[0].total_expense || 0)) || 0;
          await executeQuery('UPDATE rental_trips SET profit_loss = ? WHERE id = ?', [profitLoss, rental_trip_id]);
        }
      } catch (rentalError) {
        console.error('Error syncing expense with rental trip:', rentalError);
      }
    }

    // Record history (who added cash) - allow NULL user if not provided
    const historySql = `
      INSERT INTO voucher_history (row_id, user_id, amount, created_at)
      VALUES (?, ?, ?, NOW())
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