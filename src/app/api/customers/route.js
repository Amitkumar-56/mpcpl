// app/api/customers/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auditLog";

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

      // ✅ Create Audit Log
      try {
        let userId = null;
        let userName = null;
        try {
          const currentUser = await getCurrentUser();
          if (currentUser && currentUser.userId) {
            userId = currentUser.userId;
            userName = currentUser.userName;
            // If userName not found, fetch from employee_profile
            if (!userName && userId) {
              const users = await executeQuery(
                `SELECT name FROM employee_profile WHERE id = ?`,
                [userId]
              );
              if (users.length > 0 && users[0].name) {
                userName = users[0].name;
              }
            }
          }
        } catch (userError) {
          // Silent fail
        }

        await createAuditLog({
          page: 'Customers',
          uniqueCode: `CUSTOMER-${customerId}`,
          section: 'Customer Management',
          userId,
          userName,
          action: 'edit',
          remarks: `Customer switched to Day Limit: ${limitValue} days`,
          oldValue: {
            customer_id: customerId,
            customer_name: currentCustomer.name,
            previous_client_type: currentCustomer.client_type,
            previous_day_limit: 0
          },
          newValue: {
            customer_id: customerId,
            customer_name: currentCustomer.name,
            new_client_type: '3',
            new_day_limit: limitValue
          },
          fieldName: 'client_type',
          recordType: 'customer',
          recordId: customerId
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
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

      // Fetch current customer balance from customer_balance table
      const balanceRows = await executeQuery(
        'SELECT balance FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
      
      const currentBalance = balanceRows.length > 0 ? (balanceRows[0].balance || 0) : 0;
      const calculatedAmtlimit = Math.max(0, limitValue - currentBalance); // Ensure non-negative

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
          [limitValue, calculatedAmtlimit, customerId]
        );
      } else {
        await executeQuery(
          `INSERT INTO customer_balances 
           (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [currentBalance, 0, calculatedAmtlimit, limitValue, customerId, 0, 0, 0, null, 1]
        );
      }

      // ✅ Create Audit Log
      try {
        let userId = null;
        let userName = null;
        try {
          const currentUser = await getCurrentUser();
          if (currentUser && currentUser.userId) {
            userId = currentUser.userId;
            userName = currentUser.userName;
            // If userName not found, fetch from employee_profile
            if (!userName && userId) {
              const users = await executeQuery(
                `SELECT name FROM employee_profile WHERE id = ?`,
                [userId]
              );
              if (users.length > 0 && users[0].name) {
                userName = users[0].name;
              }
            }
          }
        } catch (userError) {
          // Silent fail
        }

        await createAuditLog({
          page: 'Customers',
          uniqueCode: `CUSTOMER-${customerId}`,
          section: 'Customer Management',
          userId,
          userName,
          action: 'edit',
          remarks: `Customer switched to Postpaid with credit limit ₹${limitValue}`,
          oldValue: {
            customer_id: customerId,
            customer_name: currentCustomer.name,
            previous_client_type: currentCustomer.client_type,
            previous_cst_limit: 0
          },
          newValue: {
            customer_id: customerId,
            customer_name: currentCustomer.name,
            new_client_type: '2',
            new_cst_limit: limitValue
          },
          fieldName: 'client_type',
          recordType: 'customer',
          recordId: customerId
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
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

// ✅ Customer deletion removed - customers cannot be deleted
// Use status update (disable) instead