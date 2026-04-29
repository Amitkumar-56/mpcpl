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
    let voucher_no = formData.get('voucher_no') || null;
    const advance_amount = formData.get('advance_amount') || 0;
    const rental_trip_id = formData.get('rental_trip_id') || null;

    // Fallback: If voucher_no is missing, fetch it from vouchers table
    if (!voucher_no && voucher_id) {
      const vResult = await executeQuery('SELECT voucher_no FROM vouchers WHERE voucher_id = ?', [voucher_id]);
      if (vResult.length > 0) {
        voucher_no = vResult[0].voucher_no || null;
      }
    }

    console.log('Syncing Advance to Rental Trip:', { rental_trip_id, voucher_no, advance_amount });

    // Get current user info
    let currentUserId = null;
    let currentUserName = null;
    
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          currentUserId = decoded.userId || decoded.id || null;
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

    // Update voucher advance
    const selectSql = 'SELECT total_expense, advance FROM vouchers WHERE voucher_id = ? LIMIT 1';
    const rows = await executeQuery(selectSql, [voucher_id]);
    const current = rows[0] || { total_expense: 0, advance: 0 };
    const newAdvance = parseFloat(current.advance || 0) + parseFloat(advance_amount || 0);
    const newRemaining = newAdvance - parseFloat(current.total_expense || 0);

    const updateSql = 'UPDATE vouchers SET advance = ?, remaining_amount = ?, updated_at = NOW() WHERE voucher_id = ?';
    await executeQuery(updateSql, [newAdvance, newRemaining, voucher_id]);

    // Record history
    const historySql = `
      INSERT INTO voucher_history (row_id, user_id, amount, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    await executeQuery(historySql, [voucher_id, currentUserId || 0, advance_amount]);

    // Insert into advance_history
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

    // ✅ Sync with Rental Trip if selected
    if (rental_trip_id && rental_trip_id !== "") {
      try {
        // 1. Insert into rental payments log
        await executeQuery(
          'INSERT INTO rental_trip_payments (trip_id, amount, remarks) VALUES (?, ?, ?)',
          [rental_trip_id, advance_amount, `Advance via Voucher ${voucher_no || 'N/A'}`]
        );

        // Ensure voucher_no column exists
        try {
          await executeQuery("ALTER TABLE rental_trips ADD COLUMN voucher_no VARCHAR(100) AFTER state");
        } catch (e) {}

        // 2. Update total received_amount and voucher_no in rental_trips
        await executeQuery(
          'UPDATE rental_trips SET received_amount = (SELECT SUM(amount) FROM rental_trip_payments WHERE trip_id = ?), voucher_no = ? WHERE id = ?',
          [rental_trip_id, voucher_no, rental_trip_id]
        );
        
        // 3. Recalculate profit_loss if trip is closed
        const tripData = await executeQuery('SELECT status, received_amount, total_expense FROM rental_trips WHERE id = ?', [rental_trip_id]);
        if (tripData.length > 0 && tripData[0].status === 'Closed') {
          const profitLoss = (parseFloat(tripData[0].received_amount || 0) - parseFloat(tripData[0].total_expense || 0)) || 0;
          await executeQuery('UPDATE rental_trips SET profit_loss = ? WHERE id = ?', [profitLoss, rental_trip_id]);
        }
      } catch (rentalError) {
        console.error('Error syncing with rental trip:', rentalError);
      }
    }

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