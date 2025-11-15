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
    ).catch(() => []);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerName = customerResult[0].name;

    // Fetch customer balance info including limit types - IMPORTANT: Get day_limit information
    const customerBalanceInfo = await executeQuery(
      'SELECT balance, amtlimit, day_limit, hold_balance, cst_limit, last_reset_date, day_amount, is_active FROM customer_balances WHERE com_id = ?',
      [cid]
    ).catch(() => []);

    // Fetch distinct products
    const products = await executeQuery('SELECT DISTINCT pname FROM products').catch(() => []);
    
    let sql = `
      SELECT 
        fh.id,
        fh.trans_type,
        fh.filling_qty,
        fh.amount,
        fh.credit,
        fh.credit_date,
        fh.new_amount,
        fh.remaining_limit,
        fh.filling_date,
        fh.created_at,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number,
        fr.payment_status,
        fr.completed_date,
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
    
    const transactions = await executeQuery(sql, params).catch(() => []);

    // Get pending transactions for payment processing
    const pendingTransactions = await executeQuery(
      `SELECT 
         fr.id,
         COALESCE(fr.totalamt, fr.price * fr.aqty) AS amount,
         fr.completed_date,
         fr.payment_status,
         fr.vehicle_number,
         fr.trans_type,
         fr.aqty AS loading_qty,
         fs.station_name,
         p.pname
       FROM filling_requests fr
       LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
       LEFT JOIN products p ON fr.product = p.id
       WHERE fr.cid = ? AND fr.status = 'Completed'
       ORDER BY fr.completed_date ASC`,
      [cid]
    ).catch(() => []);
    
    const balanceResult = await executeQuery(
      'SELECT balance FROM customer_balances WHERE com_id = ?',
      [cid]
    ).catch(() => []);
    
    const balance = balanceResult.length > 0 ? Math.round(balanceResult[0].balance) : 0;

    const dayLimit = customerBalanceInfo.length > 0 ? parseInt(customerBalanceInfo[0].day_limit) || 0 : 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Reset to start of day for accurate calculation
    
    const enrichedPending = (pendingTransactions || []).map((t) => {
      const completed = t.completed_date ? new Date(t.completed_date) : null;
      // Calculate remaining days: current date - completed date (days elapsed since completion)
      let remainingDays = 0;
      if (completed) {
        completed.setHours(0, 0, 0, 0); // Reset to start of day
        const timeDiff = currentDate.getTime() - completed.getTime();
        remainingDays = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
      }
      
      const isPaid = Number(t.payment_status) === 1;
      // Overdue if: not paid AND day limit > 0 AND remaining days (elapsed) >= day limit
      const overdue = !isPaid && dayLimit > 0 && remainingDays >= dayLimit;
      
      // Calculate recharge amount (amount paid for this transaction)
      const recharge = isPaid ? parseFloat(t.amount || 0) : 0;
      
      // Calculate outstanding for this specific transaction
      // Outstanding = transaction amount (if not paid, 0 if paid)
      const transactionOutstanding = isPaid ? 0 : parseFloat(t.amount || 0);
      
      // Outstanding after payment = transaction outstanding - recharge
      // For paid transactions, outstanding after payment = 0
      // For unpaid transactions, outstanding after payment = transaction amount
      const outstandingAfterPayment = isPaid ? 0 : transactionOutstanding;
      
      return {
        ...t,
        days_limit: dayLimit,
        outstanding_balance: transactionOutstanding, // Outstanding for this specific transaction
        remaining_days: remainingDays, // Days elapsed since completion (current date - completed date)
        total_days: dayLimit, // Total day limit assigned
        recharge: recharge, // Amount paid (recharge) for this transaction
        outstanding_after_payment: outstandingAfterPayment, // Outstanding after payment
        overdue_status: isPaid ? 'Paid' : overdue ? 'Overdue' : 'Open'
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        products: products.map(p => p.pname),
        balance,
        filter: pname,
        customerName,
        pendingTransactions: enrichedPending || [],
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
      // Get customer info first to check if day_limit customer
      const customerInfo = await executeQuery(
        'SELECT day_limit, amtlimit FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
      const isDayLimit = customerInfo.length > 0 && (parseInt(customerInfo[0].day_limit) || 0) > 0;

      // Get current balance before payment
      const balanceBefore = await executeQuery(
        'SELECT balance FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
      const currentBalance = balanceBefore.length > 0 ? parseFloat(balanceBefore[0].balance) || 0 : 0;

      let remainingAmount = parseFloat(rechargeAmount);
      let invoicesPaid = 0;
      let totalPaidAmount = 0;
      let daysCleared = 0;

      // For day_limit customers: Allocate payment per day based on completed_date
      if (isDayLimit) {
        // Group pending transactions by completed_date (per day)
        const pendingTransactionsByDay = await executeQuery(
          `SELECT 
             DATE(completed_date) as day_date,
             SUM(totalamt) as day_total,
             GROUP_CONCAT(id) as transaction_ids
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           GROUP BY DATE(completed_date)
           ORDER BY DATE(completed_date) ASC`,
          [customerId]
        );

        // Clear each day's amount starting from oldest day
        for (const dayData of pendingTransactionsByDay) {
          if (remainingAmount <= 0) break;

          const dayTotal = parseFloat(dayData.day_total) || 0;
          const transactionIds = dayData.transaction_ids.split(',').map(id => parseInt(id.trim()));

          if (remainingAmount >= dayTotal) {
            // Full payment for this day - mark all transactions of this day as paid
            if (transactionIds.length > 0) {
              await executeQuery(
                `UPDATE filling_requests 
                 SET payment_status = 1, payment_date = NOW() 
                 WHERE id IN (${transactionIds.map(() => '?').join(',')})`,
                transactionIds
              );
              invoicesPaid += transactionIds.length;
              totalPaidAmount += dayTotal;
              remainingAmount -= dayTotal;
              daysCleared++;
            }
          } else {
            // Partial payment - cannot partially pay a day, need full day amount
            break;
          }
        }
      } else {
        // For credit_limit customers: Pay off oldest invoices first (transaction by transaction)
        const pendingTransactions = await executeQuery(
          `SELECT id, totalamt as amount 
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           ORDER BY completed_date ASC`,
          [customerId]
        );

        for (const transaction of pendingTransactions) {
          if (remainingAmount <= 0) break;

          const transactionAmount = parseFloat(transaction.amount);
          
          if (remainingAmount >= transactionAmount) {
            await executeQuery(
              'UPDATE filling_requests SET payment_status = 1, payment_date = NOW() WHERE id = ?',
              [transaction.id]
            );
            remainingAmount -= transactionAmount;
            totalPaidAmount += transactionAmount;
            invoicesPaid++;
          } else {
            break;
          }
        }
      }

      // Update customer balance (reduce balance by payment amount)
      const newBalance = currentBalance - parseFloat(rechargeAmount);
      await executeQuery(
        'UPDATE customer_balances SET balance = ? WHERE com_id = ?',
        [newBalance, customerId]
      );

      // Record the recharge in filling_history as inward transaction with credit
      // For day_limit customers, credit = recharge amount
      // For credit_limit customers, update amtlimit and remaining_limit
      if (remainingAmount > 0 || totalPaidAmount > 0) {
        if (!isDayLimit && remainingAmount > 0) {
          // Credit limit customer - add remaining amount to amtlimit
          await executeQuery(
            'UPDATE customer_balances SET amtlimit = amtlimit + ? WHERE com_id = ?',
            [remainingAmount, customerId]
          );
        }

        // Get updated amtlimit for credit_limit customers
        let remainingLimit = 0;
        if (!isDayLimit) {
          const updatedInfo = await executeQuery(
            'SELECT amtlimit FROM customer_balances WHERE com_id = ?',
            [customerId]
          );
          remainingLimit = updatedInfo.length > 0 ? parseFloat(updatedInfo[0].amtlimit) || 0 : 0;
        }

        // Record in filling_history - for day_limit, credit = total recharge amount
        const creditAmount = isDayLimit ? parseFloat(rechargeAmount) : remainingAmount;
        
        if (creditAmount > 0 || totalPaidAmount > 0) {
          await executeQuery(
            `INSERT INTO filling_history (
              cl_id, trans_type, credit, credit_date, 
              new_amount, remaining_limit, created_by
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
            [
              customerId, 
              'inward', 
              creditAmount, // For day_limit: total recharge, for credit_limit: remaining after paying invoices
              newBalance, 
              isDayLimit ? 0 : remainingLimit, 
              1
            ]
          );
        }
      }

      await executeQuery('COMMIT');

      const message = isDayLimit
        ? `Payment processed successfully. ${invoicesPaid} invoice(s) paid across ${daysCleared} day(s). Amount: ₹${totalPaidAmount}. ${remainingAmount > 0 ? `Remaining: ₹${remainingAmount} (credited).` : ''}`
        : `Payment processed successfully. ${invoicesPaid} invoice(s) paid. Amount: ₹${totalPaidAmount}. ${remainingAmount > 0 ? `Remaining: ₹${remainingAmount} (added to amtlimit).` : ''}`;

      return NextResponse.json({
        success: true,
        message,
        invoicesPaid,
        amountPaid: totalPaidAmount,
        remainingBalance: remainingAmount,
        daysCleared: isDayLimit ? daysCleared : undefined
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

    // Build export query with ALL fields
    let sql = `
      SELECT 
        fh.id,
        fh.trans_type,
        fh.filling_qty,
        fh.amount,
        fh.credit,
        fh.credit_date,
        fh.new_amount,
        fh.remaining_limit,
        fh.remaining_day_limit,
        fh.limit_type,
        fh.in_amount,
        fh.d_amount,
        fh.filling_date,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number,
        fr.payment_status,
        fr.completed_date,
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

    // Prepare CSV headers - ALL columns as requested
    const csvHeaders = [
      '#',
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

    // Convert data to CSV format with ALL fields
    const csvRows = rows.map(row => {
      return [
        row.id || '',
        row.station_name || '',
        row.completed_date || row.filling_date || row.credit_date || '',
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