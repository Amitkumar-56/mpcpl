// src/app/api/nb-stock/create-nb-expense/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET() {
  try {
    // Fetch all non-billing stocks with station and product names
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
    
    // Get user ID from token
    let user_id = 1;
    let employeeName = 'Unknown User';
    
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          user_id = decoded.userId || decoded.id || 1;
          
          // Get employee name
          const employeeResult = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [user_id]
          );
          if (employeeResult.length > 0) {
            employeeName = employeeResult[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
      user_id = formData.get('user_id') || 1;
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

    // Check total stock availability
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
          error: `Insufficient stock! Available: ${totalCurrentStock} Ltr, Requested: ${amount} Ltr` 
        },
        { status: 400 }
      );
    }

    // Get station and product names
    let stationName = `Station ${station_id}`;
    let productName = `Product ${product_id}`;
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
    } catch (nameError) {
      console.error('Error fetching names:', nameError);
    }

    // Start transaction
    try {
      // 1. Insert expense record
      const expenseResult = await executeQuery(
        `INSERT INTO nb_expense 
         (payment_date, title, reason, paid_to, amount, station_id, product_id, 
          created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [payment_date, title, reason, paid_to, amount, station_id, product_id, user_id]
      );
      
      const expenseId = expenseResult.insertId;

      // 2. Update stock
      let remaining = amount;
      for (const row of stockAggregateRows) {
        if (remaining <= 0) break;
        const rowStock = parseFloat(row.stock) || 0;
        if (rowStock <= 0) continue;
        const deduct = Math.min(remaining, rowStock);
        await executeQuery(
          `UPDATE non_billing_stocks 
           SET stock = stock - ?, updated_at = NOW(), updated_by = ?
           WHERE id = ?`,
          [deduct, user_id, row.id]
        );
        remaining -= deduct;
      }
      
      const newStock = oldStock - amount;

      // 3. Create log in nb_stock_logs
      try {
        // Check if table exists
        await executeQuery(`
          CREATE TABLE IF NOT EXISTS nb_stock_logs (
            id INT PRIMARY KEY AUTO_INCREMENT,
            station_id INT NOT NULL,
            product_id INT NOT NULL,
            action VARCHAR(100) NOT NULL,
            old_stock DECIMAL(15, 2) DEFAULT 0,
            new_stock DECIMAL(15, 2) DEFAULT 0,
            quantity DECIMAL(15, 2) DEFAULT 0,
            performed_by INT,
            performed_by_name VARCHAR(255),
            performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reason TEXT
          )
        `);
        
        await executeQuery(
          `INSERT INTO nb_stock_logs 
           (station_id, product_id, action, old_stock, new_stock, quantity,
            performed_by, performed_by_name, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [station_id, product_id, 'Expense Deduction', oldStock, newStock, amount,
           user_id, employeeName, `Expense: ${title} - Paid to: ${paid_to} - Reason: ${reason || 'N/A'}`]
        );
        console.log('✅ NB Stock log created');
      } catch (logError) {
        console.error('Error creating stock log:', logError);
        // Continue even if log fails
      }

      // 4. Create filling_history entry
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
      } catch (historyError) {
        console.error('Error creating filling_history:', historyError);
      }

      // 5. Create audit log
      try {
        await createAuditLog({
          page: 'NB Stock',
          uniqueCode: `NB-EXPENSE-${expenseId}`,
          section: 'Create NB Expense',
          userId: user_id,
          userName: employeeName,
          action: 'create',
          remarks: `NB Expense created: ${title} - ${amount} Ltr to ${paid_to}. Stock deducted from ${stationName} - ${productName}`,
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
            created_by: user_id,
            created_by_name: employeeName
          },
          fieldName: 'stock',
          recordType: 'nb_expense',
          recordId: expenseId
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: `Expense created successfully by ${employeeName}! Stock updated from ${oldStock} Ltr to ${newStock} Ltr.`,
        data: {
          expenseId,
          oldStock,
          newStock,
          createdBy: employeeName,
          userId: user_id,
          stationName,
          productName
        }
      });

    } catch (transactionError) {
      console.error('Transaction error:', transactionError);
      return NextResponse.json(
        { 
          success: false, 
          error: transactionError.message || "Failed to complete all operations" 
        },
        { status: 500 }
      );
    }

  } catch (err) {
    console.error('Error creating expense:', err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}