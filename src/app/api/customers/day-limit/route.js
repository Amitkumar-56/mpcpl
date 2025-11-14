import db from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { action, customerId, adjustType, amount, days, reason } = await request.json();

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
        const parsedDays = Number(days ?? amount);
        if (!adjustType || !parsedDays || parsedDays <= 0 || !reason) {
          return NextResponse.json(
            { error: 'Adjust type, days, and reason are required' },
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
            newDayLimit = currentDayLimit + parsedDays;
          } else if (adjustType === 'decrease') {
            newDayLimit = Math.max(0, currentDayLimit - parsedDays);
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

          try {
            const [schemaRows] = await connection.execute('SHOW COLUMNS FROM day_limit_logs');
            const schemaCols = new Set(schemaRows.map(r => r.Field));

            const cols = [];
            const vals = [];

            if (schemaCols.has('customer_id')) { cols.push('customer_id'); vals.push(customerId); }
            if (schemaCols.has('adjust_type')) { cols.push('adjust_type'); vals.push(adjustType); }
            if (schemaCols.has('days')) { cols.push('days'); vals.push(parsedDays); }
            else if (schemaCols.has('amount')) { cols.push('amount'); vals.push(parsedDays); }
            if (schemaCols.has('previous_limit')) { cols.push('previous_limit'); vals.push(currentDayLimit); }
            if (schemaCols.has('new_limit')) { cols.push('new_limit'); vals.push(newDayLimit); }
            if (schemaCols.has('reason')) { cols.push('reason'); vals.push(reason); }

            if (cols.length > 0) {
              const placeholders = cols.map(() => '?').join(', ');
              const sql = `INSERT INTO day_limit_logs (${cols.join(', ')}) VALUES (${placeholders})`;
              await connection.execute(sql, vals);
            }
          } catch (e) {
            // If log table structure is unknown, skip logging safely
          }

          await connection.commit();

          return NextResponse.json({
            message: `Day limit ${adjustType === 'increase' ? 'increased' : 'decreased'} successfully`,
            previousLimit: currentDayLimit,
            newLimit: newDayLimit,
            change: adjustType === 'increase' ? `+${parsedDays} day(s)` : `-${parsedDays} day(s)`
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

          try {
            const [schemaRows] = await connection.execute('SHOW COLUMNS FROM day_limit_logs');
            const schemaCols = new Set(schemaRows.map(r => r.Field));
            const cols = [];
            const vals = [];
            if (schemaCols.has('customer_id')) { cols.push('customer_id'); vals.push(customerId); }
            if (schemaCols.has('adjust_type')) { cols.push('adjust_type'); vals.push('reset'); }
            if (schemaCols.has('days')) { cols.push('days'); vals.push(0); }
            else if (schemaCols.has('amount')) { cols.push('amount'); vals.push(0); }
            if (schemaCols.has('previous_limit')) { cols.push('previous_limit'); vals.push(0); }
            if (schemaCols.has('new_limit')) { cols.push('new_limit'); vals.push(0); }
            if (schemaCols.has('reason')) { cols.push('reason'); vals.push('Manual daily usage reset'); }
            if (cols.length > 0) {
              const placeholders = cols.map(() => '?').join(', ');
              const sql = `INSERT INTO day_limit_logs (${cols.join(', ')}) VALUES (${placeholders})`;
              await connection.execute(sql, vals);
            }
          } catch (e) {
            // Skip logging on schema mismatch
          }

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