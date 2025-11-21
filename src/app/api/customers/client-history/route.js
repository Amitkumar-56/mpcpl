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
      'SELECT name, client_type FROM customers WHERE id = ?',
      [cid]
    ).catch(() => []);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customerName = customerResult[0].name;
    const clientType = customerResult[0].client_type;

    // Fetch customer balance info including limit types
    const customerBalanceInfo = await executeQuery(
      'SELECT balance, amtlimit, day_limit, hold_balance, cst_limit, last_reset_date, day_amount, is_active FROM customer_balances WHERE com_id = ?',
      [cid]
    ).catch(() => []);

    // ✅ CORRECTED: Calculate remaining days for day limit customers based on OLDEST UNPAID completed_date only
    if (customerBalanceInfo.length > 0 && customerBalanceInfo[0].day_limit > 0) {
      // Get OLDEST UNPAID completed transaction's completed_date
      const oldestUnpaidCompleted = await executeQuery(
        `SELECT completed_date 
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0
         ORDER BY completed_date ASC 
         LIMIT 1`,
        [cid]
      );
      
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      if (oldestUnpaidCompleted.length > 0 && oldestUnpaidCompleted[0].completed_date) {
        const oldestUnpaidDate = new Date(oldestUnpaidCompleted[0].completed_date);
        oldestUnpaidDate.setHours(0, 0, 0, 0);
        
        // Calculate days elapsed: current_date - oldest_unpaid_date
        const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
        const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
        
        // Remaining days = day_limit - days_elapsed
        customerBalanceInfo[0].days_elapsed = daysElapsed;
        customerBalanceInfo[0].remaining_days = Math.max(0, customerBalanceInfo[0].day_limit - daysElapsed);
        customerBalanceInfo[0].oldest_unpaid_date = oldestUnpaidDate;
        
        console.log('📅 Day Limit Calculation - OLDEST UNPAID DATE:', {
          oldestUnpaidDate: oldestUnpaidDate.toISOString(),
          currentDate: currentDate.toISOString(),
          daysElapsed,
          dayLimit: customerBalanceInfo[0].day_limit,
          remainingDays: customerBalanceInfo[0].remaining_days
        });
      } else {
        // No unpaid completed transactions, so all days remaining
        customerBalanceInfo[0].days_elapsed = 0;
        customerBalanceInfo[0].remaining_days = customerBalanceInfo[0].day_limit;
        customerBalanceInfo[0].oldest_unpaid_date = null;
      }
    } else {
      if (customerBalanceInfo.length > 0) {
        customerBalanceInfo[0].days_elapsed = 0;
        customerBalanceInfo[0].remaining_days = 0;
        customerBalanceInfo[0].oldest_unpaid_date = null;
      }
    }

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
        fh.remaining_day_limit,
        fh.payment_status,
        fh.filling_date,
        fh.created_at,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number,
        fr.payment_status as request_payment_status,
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

    // ✅ CORRECTED: Get pending transactions for payment processing (UNPAID only)
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
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
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
    currentDate.setHours(0, 0, 0, 0);
    
    // Check if customer has exceeded day limit (based on oldest unpaid transaction)
    let isCustomerOverdue = false;
    if (dayLimit > 0 && pendingTransactions.length > 0) {
      const oldestUnpaid = pendingTransactions[0];
      if (oldestUnpaid.completed_date) {
        const oldestUnpaidDate = new Date(oldestUnpaid.completed_date);
        oldestUnpaidDate.setHours(0, 0, 0, 0);
        const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
        const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
        isCustomerOverdue = daysElapsed >= dayLimit;
      }
    }
    
    const enrichedPending = (pendingTransactions || []).map((t) => {
      const completed = t.completed_date ? new Date(t.completed_date) : null;
      
      // Calculate remaining days: current date - completed date (days elapsed since completion)
      let remainingDays = 0;
      if (completed) {
        completed.setHours(0, 0, 0, 0);
        const timeDiff = currentDate.getTime() - completed.getTime();
        remainingDays = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
      }
      
      const isPaid = Number(t.payment_status) === 1;
      // Overdue if: not paid AND (this transaction is overdue OR customer limit exceeded)
      // When limit exceeded, ALL unpaid transactions are marked as overdue
      const overdue = !isPaid && dayLimit > 0 && (remainingDays >= dayLimit || isCustomerOverdue);
      
      // Calculate recharge amount (amount paid for this transaction)
      const recharge = isPaid ? parseFloat(t.amount || 0) : 0;
      
      // Calculate outstanding for this specific transaction
      const transactionOutstanding = isPaid ? 0 : parseFloat(t.amount || 0);
      
      const outstandingAfterPayment = isPaid ? 0 : transactionOutstanding;
      
      return {
        ...t,
        days_limit: dayLimit,
        outstanding_balance: transactionOutstanding,
        remaining_days: remainingDays,
        total_days: dayLimit,
        recharge: recharge,
        outstanding_after_payment: outstandingAfterPayment,
        overdue_status: isPaid ? 'Paid' : overdue ? 'Overdue' : 'Open',
        is_overdue: overdue
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
        clientType,
        pendingTransactions: enrichedPending || [],
        customerBalanceInfo: customerBalanceInfo.length > 0 ? customerBalanceInfo[0] : null,
        isCustomerOverdue: isCustomerOverdue
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
        'SELECT day_limit, amtlimit, is_active FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
      const isDayLimit = customerInfo.length > 0 && (parseInt(customerInfo[0].day_limit) || 0) > 0;
      const currentIsActive = customerInfo.length > 0 ? (parseInt(customerInfo[0].is_active) || 1) : 1;

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

      // ✅ CORRECTED: For day_limit customers: Allocate payment per day based on completed_date (UNPAID only)
      if (isDayLimit) {
        // Group UNPAID pending transactions by completed_date (per day)
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
        // For credit_limit customers: Pay off oldest UNPAID invoices first
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
      
      // Check if customer is still overdue after payment (for day_limit customers)
      // ✅ IMPORTANT: If at least 1 day is paid, customer should be active (unless remaining unpaid days are overdue)
      let newIsActive = currentIsActive;
      let isOverdue = false;
      
      if (isDayLimit && customerInfo.length > 0) {
        const dayLimit = parseInt(customerInfo[0].day_limit) || 0;
        
        // Check remaining unpaid days
        const remainingUnpaidDays = await executeQuery(
          `SELECT 
             DATE(completed_date) as day_date,
             SUM(totalamt) as day_total
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           GROUP BY DATE(completed_date)
           ORDER BY DATE(completed_date) ASC
           LIMIT 1`,
          [customerId]
        );

        if (daysCleared > 0) {
          // ✅ If at least 1 day is paid, check if remaining unpaid days are overdue
          if (remainingUnpaidDays.length > 0 && dayLimit > 0) {
            // Check if oldest unpaid day is overdue
            const oldestUnpaidDate = new Date(remainingUnpaidDays[0].day_date);
            oldestUnpaidDate.setHours(0, 0, 0, 0);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
            const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
            
            isOverdue = daysElapsed >= dayLimit;
            // ✅ If remaining unpaid days are NOT overdue, customer is active
            // ✅ If remaining unpaid days ARE overdue, customer is inactive
            newIsActive = isOverdue ? 0 : 1;
          } else {
            // No remaining unpaid transactions - customer is active
            newIsActive = 1;
          }
        } else {
          // No days cleared - check if customer is overdue
          if (remainingUnpaidDays.length > 0 && dayLimit > 0) {
            const oldestUnpaidDate = new Date(remainingUnpaidDays[0].day_date);
            oldestUnpaidDate.setHours(0, 0, 0, 0);
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0);
            const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
            const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
            
            isOverdue = daysElapsed >= dayLimit;
            newIsActive = isOverdue ? 0 : 1;
          }
        }
      }
      
      await executeQuery(
        'UPDATE customer_balances SET balance = ?, is_active = ? WHERE com_id = ?',
        [newBalance, newIsActive, customerId]
      );

      // Record the recharge in filling_history as inward transaction with credit
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
              new_amount, remaining_limit, created_by, payment_status
            ) VALUES (?, ?, ?, NOW(), ?, ?, ?, 1)`,
            [
              customerId, 
              'inward', 
              creditAmount,
              newBalance, 
              isDayLimit ? 0 : remainingLimit, 
              1,
              1 // payment_status = 1 (Paid)
            ]
          );
        }
      }

      await executeQuery('COMMIT');

      // Build message with days payment information
      let message = '';
      if (isDayLimit) {
        const daysMessage = daysCleared === 1 
          ? '1 day payment made' 
          : `${daysCleared} days payment made`;
        message = `Payment processed successfully. ${daysMessage}. ${invoicesPaid} unpaid invoice(s) paid. Amount: ₹${totalPaidAmount}. ${remainingAmount > 0 ? `Remaining: ₹${remainingAmount} (credited).` : ''} ${isOverdue ? '⚠️ Status: Overdue - Please clear remaining payments' : '✅ Status: Active'}`;
      } else {
        message = `Payment processed successfully. ${invoicesPaid} unpaid invoice(s) paid. Amount: ₹${totalPaidAmount}. ${remainingAmount > 0 ? `Remaining: ₹${remainingAmount} (added to amtlimit).` : ''}`;
      }

      return NextResponse.json({
        success: true,
        message,
        invoicesPaid,
        amountPaid: totalPaidAmount,
        remainingBalance: remainingAmount,
        daysCleared: isDayLimit ? daysCleared : undefined,
        isOverdue: isDayLimit ? isOverdue : false,
        isActive: newIsActive
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
        fh.payment_status,
        fh.filling_date,
        p.pname, 
        fs.station_name, 
        fr.vehicle_number,
        fr.payment_status as request_payment_status,
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
      'Limit Type',
      'Increase Amount',
      'Decrease Amount',
      'Payment Status',
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
        (row.payment_status === 1 || row.request_payment_status === 1) ? 'Paid' : 'Unpaid',
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