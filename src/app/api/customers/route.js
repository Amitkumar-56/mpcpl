// app/api/customers/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await executeQuery(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.address,
        c.region,
        c.email,
        c.billing_type,
        c.client_type,
        COALESCE(cb.amtlimit, 0) AS amtlimit,
        COALESCE(cb.balance, 0) AS balance,
        COALESCE(cb.cst_limit, 0) AS cst_limit,
        COALESCE(cb.day_amount, 0) AS day_amount,
        COALESCE(cb.total_day_amount, 0) AS total_day_amount,
        COALESCE(cb.day_limit, 0) AS day_limit,
        COALESCE(cb.is_active, 1) AS is_active
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.roleid IN (1, 3) 
      ORDER BY c.id DESC
    `);

    // Transform the data to match the expected format
    const transformedRows = rows.map(row => ({
      ...row,
      // Ensure all required fields are present
      is_active: row.is_active ?? 1,
      day_limit: row.day_limit ?? 0,
      day_amount: row.day_amount ?? 0,
      total_day_amount: row.total_day_amount ?? 0
    }));

    return NextResponse.json(transformedRows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const body = await req.json();
    const customerId = parseInt(body.customerId);
    const targetType = String(body.targetType || '').toLowerCase();
    const limitValueRaw = body.limitValue;
    const limitValue = Number(limitValueRaw);

    if (!customerId || !['post', 'day'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (targetType === 'day') {
      if (isNaN(limitValue) || limitValue < 0) {
        return NextResponse.json({ error: 'Invalid day limit' }, { status: 400 });
      }
      await executeQuery('UPDATE customers SET client_type = ?, day_limit = ? WHERE id = ?', ['3', limitValue, customerId]);
      const balRows = await executeQuery('SELECT id FROM customer_balances WHERE com_id = ?', [customerId]);
      if (balRows.length > 0) {
        await executeQuery('UPDATE customer_balances SET day_limit = ?, day_amount = 0, day_limit_expiry = NULL WHERE com_id = ?', [limitValue, customerId]);
      } else {
        await executeQuery(
          'INSERT INTO customer_balances (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, day_amount, day_limit_expiry, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [0, 0, 0, 0, customerId, limitValue, 0, null, 1]
        );
      }
      return NextResponse.json({ success: true, message: 'Switched to Day Limit', customerId, day_limit: limitValue });
    }

    if (targetType === 'post') {
      if (isNaN(limitValue) || limitValue < 0) {
        return NextResponse.json({ error: 'Invalid credit limit' }, { status: 400 });
      }
      await executeQuery('UPDATE customers SET client_type = ?, amtlimit = NULL WHERE id = ?', ['2', customerId]);
      const balRows = await executeQuery('SELECT id FROM customer_balances WHERE com_id = ?', [customerId]);
      if (balRows.length > 0) {
        await executeQuery('UPDATE customer_balances SET cst_limit = ?, amtlimit = ? WHERE com_id = ?', [limitValue, limitValue, customerId]);
      } else {
        await executeQuery(
          'INSERT INTO customer_balances (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, day_amount, day_limit_expiry, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [0, 0, limitValue, limitValue, customerId, 0, 0, null, 1]
        );
      }
      return NextResponse.json({ success: true, message: 'Switched to Postpaid', customerId, amtlimit: limitValue });
    }

  } catch (error) {
    console.error('Switch type error:', error);
    return NextResponse.json({ error: 'Failed to switch customer type' }, { status: 500 });
  }
}