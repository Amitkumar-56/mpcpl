// app/api/customers/client-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = parseInt(searchParams.get('id'));
    const pname = searchParams.get('pname') || '';

    if (!cid) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Fetch customer name first
    const customerResult = await executeQuery(
      'SELECT name FROM customers WHERE id = ?',
      [cid]
    );
    
    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerName = customerResult[0].name;

    // Fetch customer balance info including limit types
    const customerBalanceInfo = await executeQuery(
      'SELECT balance, amtlimit, day_limit, hold_balance, cst_limit, last_reset_date, day_amount, day_limit_expiry, is_active FROM customer_balances WHERE com_id = ?',
      [cid]
    );

    // Fetch distinct products
    const products = await executeQuery('SELECT DISTINCT pname FROM products');
    
    // Build main query - include both inward and outward transactions
    let sql = `
      SELECT 
        fh.*,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number,
        fr.payment_status,
        ep.name AS updated_by_name
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE fh.cl_id = ?
    `;
    
    const params = [cid];
    
    if (pname) {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }
    
    sql += ' ORDER BY fh.id DESC';
    
    const transactions = await executeQuery(sql, params);

    // Get pending transactions for payment processing
    const pendingTransactions = await executeQuery(
      `SELECT fr.id, fr.totalamt as amount, fr.completed_date, fr.payment_status
       FROM filling_requests fr
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
       ORDER BY fr.completed_date ASC`,
      [cid]
    );
    
    // Calculate balance
    const balanceResult = await executeQuery(
      'SELECT balance FROM customer_balances WHERE com_id = ?',
      [cid]
    );
    
    const balance = balanceResult.length > 0 ? Math.round(balanceResult[0].balance) : 0;

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        products: products.map(p => p.pname),
        balance,
        filter: pname,
        customerName,
        pendingTransactions: pendingTransactions || [],
        customerBalanceInfo: customerBalanceInfo.length > 0 ? customerBalanceInfo[0] : null
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { customerId, rechargeAmount } = body;

    if (!customerId || !rechargeAmount) {
      return NextResponse.json(
        { error: 'Customer ID and amount are required' },
        { status: 400 }
      );
    }

    // Start transaction
    await executeQuery('START TRANSACTION');

    try {
      // Get pending transactions (oldest first)
      const pendingTransactions = await executeQuery(
        `SELECT id, totalamt as amount 
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         ORDER BY completed_date ASC`,
        [customerId]
      );

      let remainingAmount = parseFloat(rechargeAmount);
      let invoicesPaid = 0;
      let totalPaidAmount = 0;

      // Pay off oldest invoices first
      for (const transaction of pendingTransactions) {
        if (remainingAmount <= 0) break;

        const transactionAmount = parseFloat(transaction.amount);
        
        if (remainingAmount >= transactionAmount) {
          // Full payment for this invoice
          await executeQuery(
            'UPDATE filling_requests SET payment_status = 1, payment_date = NOW() WHERE id = ?',
            [transaction.id]
          );
          remainingAmount -= transactionAmount;
          totalPaidAmount += transactionAmount;
          invoicesPaid++;
        } else {
          // Partial payment - handle if needed
          break;
        }
      }

      // Update customer balance with any remaining amount (as recharge)
      if (remainingAmount > 0) {
        await executeQuery(
          'UPDATE customer_balances SET balance = balance - ? WHERE com_id = ?',
          [remainingAmount, customerId]
        );

        // Record the recharge in filling_history as inward transaction
        await executeQuery(
          `INSERT INTO filling_history (
            cl_id, trans_type, credit, credit_date, 
            new_amount, remaining_limit, created_by
          ) VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
          [customerId, 'inward', remainingAmount, -remainingAmount, 0, 1]
        );
      }

      await executeQuery('COMMIT');

      return NextResponse.json({
        success: true,
        message: `Payment processed successfully. ${invoicesPaid} invoice(s) paid.`,
        invoicesPaid,
        amountPaid: totalPaidAmount,
        remainingBalance: remainingAmount
      });

    } catch (error) {
      await executeQuery('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const cid = parseInt(formData.get('id'));
    const pname = formData.get('pname') || '';

    if (!cid) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    // Get customer balance info to determine columns
    const customerBalanceInfo = await executeQuery(
      'SELECT day_limit FROM customer_balances WHERE com_id = ?',
      [cid]
    );

    const isDayLimitCustomer = customerBalanceInfo.length > 0 && customerBalanceInfo[0].day_limit > 0;

    // Build export query
    let sql = `
      SELECT 
        fh.*,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number,
        fr.payment_status,
        ep.name AS updated_by_name
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE fh.cl_id = ?
    `;
    
    const params = [cid];
    
    if (pname) {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }
    
    sql += ' ORDER BY fh.id DESC';
    
    const rows = await executeQuery(sql, params);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No records found' }, { status: 404 });
    }

    // Prepare CSV headers - same for all customers
    const csvHeaders = [
      'ID',
      'Station',
      'Completed Date',
      'Product',
      'Vehicle #',
      'Trans Type',
      'Loading Qty',
      'Amount',
      'Credit',
      'Credit Date',
      'Balance',
      'Remaining Limit',
      'Limit',
      'Increase Amount',
      'Decrease Amount',
      'Updated By'
    ];

    // Convert data to CSV format
    const csvRows = rows.map(row => {
      return [
        row.id || '',
        row.station_name || '',
        row.filling_date || row.credit_date || '',
        row.pname || '',
        row.vehicle_number || '',
        row.trans_type || '',
        row.filling_qty || '',
        row.amount || '',
        row.credit || '',
        row.credit_date || '',
        row.new_amount || '',
        isDayLimitCustomer ? (row.remaining_day_limit || '') : (row.remaining_limit || ''),
        row.limit_type || '',
        row.in_amount || '',
        row.d_amount || '',
        row.updated_by_name || ''
      ];
    });

    // Create CSV content manually
    let csvContent = csvHeaders.join(',') + '\n';
    
    csvRows.forEach(row => {
      // Escape fields that might contain commas or quotes
      const escapedRow = row.map(field => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
      });
      csvContent += escapedRow.join(',') + '\n';
    });

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="transaction_history_${cid}.csv"`
      }
    });

  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}