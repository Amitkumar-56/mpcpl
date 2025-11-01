import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { action, customerId, adjustType, amount, reason } = await request.json();

    if (!customerId) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get database connection
    const connection = await db.getConnection();
    
    try {
      if (action === 'adjust_day_limit') {
        if (!adjustType || !amount || !reason) {
          return NextResponse.json(
            { error: 'Adjust type, amount, and reason are required' },
            { status: 400 }
          );
        }

        // Start transaction
        await connection.beginTransaction();

        try {
          // Get current day limit from customers table
          const [customerRows] = await connection.execute(
            'SELECT day_limit FROM customers WHERE id = ?',
            [customerId]
          );

          if (customerRows.length === 0) {
            throw new Error('Customer not found');
          }

          const currentDayLimit = customerRows[0].day_limit || 0;
          let newDayLimit;

          if (adjustType === 'increase') {
            newDayLimit = currentDayLimit + parseFloat(amount);
          } else if (adjustType === 'decrease') {
            newDayLimit = Math.max(0, currentDayLimit - parseFloat(amount));
          } else {
            throw new Error('Invalid adjust type');
          }

          // Update day_limit in customers table
          await connection.execute(
            'UPDATE customers SET day_limit = ? WHERE id = ?',
            [newDayLimit, customerId]
          );

          // Update day_limit in customer_balances table if exists
          const [balanceRows] = await connection.execute(
            'SELECT id FROM customer_balances WHERE com_id = ?',
            [customerId]
          );

          if (balanceRows.length > 0) {
            await connection.execute(
              'UPDATE customer_balances SET day_limit = ? WHERE com_id = ?',
              [newDayLimit, customerId]
            );
          }

          // Log the adjustment
          await connection.execute(
            `INSERT INTO day_limit_logs 
             (customer_id, adjust_type, amount, previous_limit, new_limit, reason, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [customerId, adjustType, amount, currentDayLimit, newDayLimit, reason]
          );

          await connection.commit();

          return NextResponse.json({
            message: `Day limit ${adjustType === 'increase' ? 'increased' : 'decreased'} successfully`,
            previousLimit: currentDayLimit,
            newLimit: newDayLimit,
            change: adjustType === 'increase' ? `+₹${amount}` : `-₹${amount}`
          });

        } catch (error) {
          await connection.rollback();
          throw error;
        }

      } else if (action === 'reset_day_limit') {
        // Start transaction
        await connection.beginTransaction();

        try {
          // Reset day_amount in customer_balances table
          const [balanceRows] = await connection.execute(
            'SELECT id FROM customer_balances WHERE com_id = ?',
            [customerId]
          );

          if (balanceRows.length > 0) {
            await connection.execute(
              'UPDATE customer_balances SET day_amount = 0, last_reset_date = NOW() WHERE com_id = ?',
              [customerId]
            );
          }

          // Also update customers table if it has day_amount field
          await connection.execute(
            'UPDATE customers SET day_amount = 0, last_reset_date = NOW() WHERE id = ?',
            [customerId]
          );

          // Log the reset
          await connection.execute(
            `INSERT INTO day_limit_logs 
             (customer_id, adjust_type, amount, previous_limit, new_limit, reason, created_at) 
             VALUES (?, 'reset', 0, 0, 0, 'Manual daily usage reset', NOW())`,
            [customerId]
          );

          await connection.commit();

          return NextResponse.json({
            message: 'Daily usage reset successfully'
          });

        } catch (error) {
          await connection.rollback();
          throw error;
        }
      } else {
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
      }

    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error in day limit API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}