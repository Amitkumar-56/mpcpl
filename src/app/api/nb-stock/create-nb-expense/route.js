// src/app/api/nb-stock/create-nb-expense/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET() {
  try {
    // Fetch all non-billing stocks with station and product names
    // Show all records with stock quantity for dropdown
    // Use SUM to aggregate stock if there are multiple records per station_id/product_id
    // Show all items even if stock is 0, so user can see what's available
    const data = await executeQuery(
      `SELECT 
        n.station_id, 
        f.station_name, 
        n.product_id, 
        p.pname, 
        COALESCE(SUM(n.stock), 0) as stock
       FROM non_billing_stocks n
       LEFT JOIN filling_stations f ON n.station_id = f.id
       LEFT JOIN products p ON n.product_id = p.id
       WHERE f.station_name IS NOT NULL AND p.pname IS NOT NULL
       GROUP BY n.station_id, n.product_id, f.station_name, p.pname
       HAVING COALESCE(SUM(n.stock), 0) >= 0
       ORDER BY f.station_name, p.pname, COALESCE(SUM(n.stock), 0) DESC`
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching non-billing stocks for dropdown:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const payment_date = formData.get('payment_date');
    const title = formData.get('title');
    const reason = formData.get('reason');
    const paid_to = formData.get('paid_to');
    const amount = parseFloat(formData.get('amount'));
    const station_product = formData.get('station_product');
    
    // Get user ID from cookies/token
    let user_id = 1;
    let userName = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          user_id = decoded.userId || decoded.id || 1;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [user_id]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      // Fallback to form data
      user_id = formData.get('user_id') || req.headers.get('x-user-id') || 1;
      console.error('Error getting user info:', userError);
    }
    
    const [station_id, product_id] = station_product.split('-').map(Number);

    // Validation
    if (!payment_date || !title || !paid_to || !amount || !station_id || !product_id) {
      return NextResponse.json(
        { success: false, error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Check total stock availability (aggregate across possible multiple rows)
    const stockAggregateRows = await executeQuery(
      `SELECT id, stock FROM non_billing_stocks 
       WHERE station_id = ? AND product_id = ? 
       ORDER BY COALESCE(updated_at, created_at) DESC, id DESC`,
      [station_id, product_id]
    );

    if (stockAggregateRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selected stock item not found" },
        { status: 404 }
      );
    }

    const totalCurrentStock = stockAggregateRows.reduce((sum, r) => sum + (parseFloat(r.stock) || 0), 0);
    const oldStock = totalCurrentStock;
    
    if (totalCurrentStock < amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient stock! Available: ${totalCurrentStock}, Requested: ${amount}` 
        },
        { status: 400 }
      );
    }

    // Insert expense record
    await executeQuery(
      `INSERT INTO nb_expense 
       (payment_date, title, reason, paid_to, amount, station_id, product_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [payment_date, title, reason, paid_to, amount, station_id, product_id]
    );

    // ✅ Update stock across rows without over-deducting:
    // Deduct from latest rows first until the requested amount is fully deducted
    {
      let remaining = amount;
      for (const row of stockAggregateRows) {
        if (remaining <= 0) break;
        const rowStock = parseFloat(row.stock) || 0;
        if (rowStock <= 0) continue;
        const deduct = Math.min(remaining, rowStock);
        // Try to update with updated_at column; fallback if column doesn't exist
        try {
          await executeQuery(
            `UPDATE non_billing_stocks 
             SET stock = stock - ?, updated_at = NOW(), updated_by = ?
             WHERE id = ?`,
            [deduct, user_id, row.id]
          );
        } catch (updateError) {
          // Fallback without updated_at
          await executeQuery(
            `UPDATE non_billing_stocks 
             SET stock = stock - ?, updated_by = ?
             WHERE id = ?`,
            [deduct, user_id, row.id]
          );
        }
        remaining -= deduct;
      }
      // Safety: remaining should be 0 here based on availability check
    }
    const newStock = oldStock - amount;
    
    // ✅ Create filling_history entry for NB stock expense (Inward - stock deducted)
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      const colSet = new Set(colsInfo.map(r => r.Field));
      const hasStockType = colSet.has('stock_type');
      const hasRemarks = colSet.has('remarks');
      
      const fields = ['fs_id', 'product_id', 'trans_type', 'current_stock', 'filling_qty', 'available_stock', 'filling_date', 'created_by'];
      const values = [station_id, product_id, 'Inward', oldStock, amount, newStock, new Date(), user_id];
      
      if (hasStockType) {
        fields.push('stock_type');
        values.push('NB Stock');
      }
      if (hasRemarks) {
        fields.push('remarks');
        values.push(`NB Expense: ${title} - ${reason || 'N/A'}`);
      }
      if (colSet.has('amount')) {
        fields.push('amount');
        values.push(amount);
      }
      
      const placeholders = fields.map(() => '?').join(', ');
      const insertQuery = `INSERT INTO filling_history (${fields.join(', ')}) VALUES (${placeholders})`;
      
      await executeQuery(insertQuery, values);
      console.log('✅ Filling history entry created for NB stock expense (inward)');
    } catch (historyError) {
      console.error('❌ Error creating filling_history entry for NB stock expense:', historyError);
      // Continue even if history insert fails
    }

    // Get station and product names, and user role for audit log
    let stationName = `Station ${station_id}`;
    let productName = `Product ${product_id}`;
    let userRole = null;
    try {
      const stationResult = await executeQuery(
        `SELECT station_name FROM filling_stations WHERE id = ?`,
        [station_id]
      );
      if (stationResult.length > 0) {
        stationName = stationResult[0].station_name;
      }
      
      const productResult = await executeQuery(
        `SELECT pname FROM products WHERE id = ?`,
        [product_id]
      );
      if (productResult.length > 0) {
        productName = productResult[0].pname;
      }

      // Get user role for audit log
      const userResult = await executeQuery(
        `SELECT role FROM employee_profile WHERE id = ?`,
        [user_id]
      );
      if (userResult.length > 0) {
        userRole = Number(userResult[0].role);
      }
    } catch (nameError) {
      console.error('Error fetching names:', nameError);
    }

    // Get expense ID
    const expenseResult = await executeQuery(
      `SELECT id FROM nb_expense WHERE station_id = ? AND product_id = ? AND payment_date = ? AND title = ? ORDER BY id DESC LIMIT 1`,
      [station_id, product_id, payment_date, title]
    );
    const expenseId = expenseResult.length > 0 ? expenseResult[0].id : null;

    // Create audit log with role information
    const roleNames = {
      1: 'Staff',
      2: 'Incharge',
      3: 'Team Leader',
      4: 'Accountant',
      5: 'Admin',
      6: 'Driver'
    };

    await createAuditLog({
      page: 'NB Stock',
      uniqueCode: expenseId ? `NB-EXPENSE-${expenseId}` : `NB-EXPENSE-${station_id}-${product_id}`,
      section: 'Create NB Expense',
      userId: user_id,
      userName: userName,
      action: 'add',
      remarks: `NB Expense created: ${title} - ₹${amount} to ${paid_to || 'N/A'}. Stock deducted from ${stationName} - ${productName}. Created by: ${userName} (ID: ${user_id}, Role: ${userRole ? roleNames[userRole] || userRole : 'N/A'})`,
      oldValue: { 
        stock: oldStock, 
        station_id, 
        product_id,
        station_name: stationName,
        product_name: productName
      },
      newValue: { 
        stock: newStock, 
        station_id, 
        product_id, 
        expense_amount: amount,
        station_name: stationName,
        product_name: productName,
        created_by_employee_id: user_id,
        created_by_name: userName,
        created_by_role: userRole,
        created_by_role_name: userRole ? roleNames[userRole] || 'Unknown' : null
      },
      fieldName: 'stock',
      recordType: 'nb_stock',
      recordId: expenseId
    });

    // ✅ FIX: Create log entry for stock update (legacy table) with employee name and date/time
    try {
      // Check if performed_by_name column exists, if not add it
      const colsInfo = await executeQuery(`SHOW COLUMNS FROM nb_stock_logs LIKE 'performed_by_name'`);
      if (colsInfo.length === 0) {
        await executeQuery(`ALTER TABLE nb_stock_logs ADD COLUMN performed_by_name VARCHAR(255) AFTER performed_by`);
      }
      
      // Check if performed_date and performed_time columns exist
      const dateColInfo = await executeQuery(`SHOW COLUMNS FROM nb_stock_logs LIKE 'performed_date'`);
      if (dateColInfo.length === 0) {
        await executeQuery(`ALTER TABLE nb_stock_logs ADD COLUMN performed_date DATE AFTER performed_at`);
      }
      const timeColInfo = await executeQuery(`SHOW COLUMNS FROM nb_stock_logs LIKE 'performed_time'`);
      if (timeColInfo.length === 0) {
        await executeQuery(`ALTER TABLE nb_stock_logs ADD COLUMN performed_time TIME AFTER performed_date`);
      }
      
      // Get current date and time in Indian timezone
      const now = new Date();
      const currentDate = now.toISOString().slice(0, 10); // YYYY-MM-DD
      const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
      
      await executeQuery(
        `INSERT INTO nb_stock_logs 
         (station_id, product_id, action, old_stock, new_stock, quantity, performed_by, performed_by_name, performed_at, performed_date, performed_time, reason)
         VALUES (?, ?, 'Expense Deduction', ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
        [station_id, product_id, oldStock, newStock, amount, user_id, userName || 'Unknown', currentDate, currentTime, `Expense: ${title} - ${reason || 'N/A'}`]
      );
      console.log('✅ NB Stock log created for expense deduction with employee name:', userName);
    } catch (logError) {
      // If column doesn't exist or other error, try without new columns
      try {
        await executeQuery(
          `INSERT INTO nb_stock_logs 
           (station_id, product_id, action, old_stock, new_stock, quantity, performed_by, performed_at, reason)
           VALUES (?, ?, 'Expense Deduction', ?, ?, ?, ?, NOW(), ?)`,
          [station_id, product_id, oldStock, newStock, amount, user_id, `Expense: ${title} - ${reason || 'N/A'}`]
        );
      } catch (fallbackError) {
        console.log('⚠️ NB Stock logs table may not exist, skipping:', fallbackError.message);
        // Continue even if log creation fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Expense created successfully! Stock has been updated.",
    });

  } catch (err) {
    console.error('Error creating expense:', err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
