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
    if (rental_trip_id && rental_trip_id !== "" && rental_trip_id !== "null") {
      try {
        const tripId = parseInt(rental_trip_id);
        const amountNum = parseFloat(amount) || 0;

        console.log(`[Rental Sync] Updating Trip ID: ${tripId} with Expense: ${amountNum}`);

        // 1. Insert into rental expenses log
        await executeQuery(
          'INSERT INTO rental_trip_expenses (trip_id, type, amount, description) VALUES (?, ?, ?, ?)',
          [tripId, 'Others', amountNum, `Voucher ${voucher_no || 'N/A'}: ${item_details}`]
        );

        // Ensure voucher_no column exists (safe check)
        try {
          const colCheck = await executeQuery(`
            SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rental_trips' AND COLUMN_NAME = 'voucher_no'
          `);
          if (colCheck.length === 0) {
            await executeQuery("ALTER TABLE rental_trips ADD COLUMN voucher_no VARCHAR(100) AFTER state");
          }
        } catch (e) {
          console.error('Error checking/adding voucher_no column:', e.message);
        }

        // 2. Update total_expense and voucher_no in rental_trips
        // Use COALESCE to ensure it doesn't set total_expense to NULL
        await executeQuery(
          `UPDATE rental_trips 
           SET total_expense = (SELECT COALESCE(SUM(amount), 0) FROM rental_trip_expenses WHERE trip_id = ?),
               voucher_no = COALESCE(voucher_no, ?)
           WHERE id = ?`,
          [tripId, voucher_no, tripId]
        );

        // 3. Recalculate profit_loss
        const tripData = await executeQuery('SELECT received_amount, total_expense FROM rental_trips WHERE id = ?', [tripId]);
        if (tripData.length > 0) {
          const profitLoss = (parseFloat(tripData[0].received_amount || 0) - parseFloat(tripData[0].total_expense || 0)) || 0;
          await executeQuery('UPDATE rental_trips SET profit_loss = ? WHERE id = ?', [profitLoss, tripId]);
        }

        console.log(`[Rental Sync] Trip ${tripId} updated successfully`);
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