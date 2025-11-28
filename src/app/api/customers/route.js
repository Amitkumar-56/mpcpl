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
        c.status,
        COALESCE(cb.amtlimit, 0) AS amtlimit,
        COALESCE(cb.balance, 0) AS balance,
        COALESCE(cb.cst_limit, 0) AS cst_limit,
        
        COALESCE(cb.total_day_amount, 0) AS total_day_amount,
        COALESCE(cb.day_limit, 0) AS day_limit,
        COALESCE(cb.is_active, 1) AS is_active
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.roleid IN (1, 3) 
        AND c.status = 1
      ORDER BY c.id DESC
    `);

    // Transform the data to match the expected format
    const transformedRows = rows.map(row => ({
      ...row,
      // Ensure all required fields are present
      is_active: row.is_active ?? 1,
      day_limit: row.day_limit ?? 0,
  
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

    // Get current customer data
    const customerRows = await executeQuery('SELECT * FROM customers WHERE id = ?', [customerId]);
    if (customerRows.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const currentCustomer = customerRows[0];

    if (targetType === 'day') {
      // Switching TO Day Limit (from Prepaid/Postpaid)
      if (isNaN(limitValue) || limitValue < 1) {
        return NextResponse.json({ error: 'Invalid day limit (minimum 1 day)' }, { status: 400 });
      }

      // Update customers table
      await executeQuery(
        'UPDATE customers SET client_type = ? WHERE id = ?', 
        ['3', customerId]
      );

      // Update or insert in customer_balances table
      const balRows = await executeQuery('SELECT id FROM customer_balances WHERE com_id = ?', [customerId]);
      
      if (balRows.length > 0) {
        // Update existing balance record - disable credit limits, enable day limit
        await executeQuery(
          `UPDATE customer_balances 
           SET day_limit = ?, total_day_amount = 0,
               amtlimit = 0, cst_limit = 0, is_active = 1
           WHERE com_id = ?`,
          [limitValue, customerId]
        );
      } else {
        // Insert new balance record for day limit
        await executeQuery(
          `INSERT INTO customer_balances 
           (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [0, 0, 0, 0, customerId, limitValue, 0, 0, null, 1]
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: `Customer switched to Day Limit (${limitValue} days)`, 
        customerId, 
        day_limit: limitValue 
      });

    } else if (targetType === 'post') {
      // Switching FROM Day Limit TO Postpaid
      if (isNaN(limitValue) || limitValue < 0) {
        return NextResponse.json({ error: 'Invalid credit limit amount' }, { status: 400 });
      }

      // Update customers table - set to postpaid
      await executeQuery(
        'UPDATE customers SET client_type = ? WHERE id = ?', 
        ['2', customerId]
      );

      // Update customer_balances table - enable credit limits, disable day limit
      const balRows = await executeQuery('SELECT id FROM customer_balances WHERE com_id = ?', [customerId]);
      
      if (balRows.length > 0) {
        await executeQuery(
          `UPDATE customer_balances 
           SET cst_limit = ?, amtlimit = ?, 
               day_limit = 0, total_day_amount = 0
           WHERE com_id = ?`,
          [limitValue, limitValue, customerId]
        );
      } else {
        await executeQuery(
          `INSERT INTO customer_balances 
           (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [0, 0, limitValue, limitValue, customerId, 0, 0, 0, null, 1]
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: `Customer switched to Postpaid with credit limit ₹${limitValue}`, 
        customerId, 
        cst_limit: limitValue 
      });
    }

  } catch (error) {
    console.error('Switch customer type error:', error);
    return NextResponse.json({ error: 'Failed to switch customer type' }, { status: 500 });
  }
}

// For customer deletion (if needed)
export async function POST(req) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Delete from customer_balances first (foreign key constraint)
    await executeQuery('DELETE FROM customer_balances WHERE com_id = ?', [id]);
    
    // Then delete from customers
    await executeQuery('DELETE FROM customers WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}