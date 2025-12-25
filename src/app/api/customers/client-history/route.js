// app/api/customers/client-history/route.js
import { executeQuery, executeTransaction, getConnection } from '@/lib/db';
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

    // Fetch customer balance info
    const customerBalanceInfo = await executeQuery(
      'SELECT balance, amtlimit, day_limit, hold_balance, cst_limit, last_reset_date, total_day_amount, is_active FROM customer_balances WHERE com_id = ?',
      [cid]
    ).catch(() => []);

    // Check customer type
    const isDayLimitCustomer = customerBalanceInfo.length > 0 && customerBalanceInfo[0].day_limit > 0;

    // ✅ Calculate remaining days ONLY for day_limit customers
    if (isDayLimitCustomer) {
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
        fr.payment_date,
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

    // ✅ Get pending transactions for payment processing (UNPAID only)
    const pendingTransactions = await executeQuery(
      `SELECT 
         fr.id,
         COALESCE(fr.totalamt, fr.price * fr.aqty) AS amount,
         fr.completed_date,
         fr.payment_status,
         fr.payment_date,
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
      'SELECT balance, total_day_amount FROM customer_balances WHERE com_id = ?',
      [cid]
    ).catch(() => []);
    
    const balance = balanceResult.length > 0 ? Math.round(balanceResult[0].balance) : 0;
    const totalDayAmount = balanceResult.length > 0 ? parseFloat(balanceResult[0].total_day_amount) || 0 : 0;

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
    
    // ✅ Calculate total outstanding amount (pending + overdue)
    const totalOutstandingAmount = pendingTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );

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
        overdue_status: isPaid ? 'Paid' : overdue ? 'Overdue' : 'Pending',
        is_overdue: overdue
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        products: products.map(p => p.pname),
        balance,
        totalDayAmount, // ✅ Add total_day_amount to response
        filter: pname,
        customerName,
        clientType,
        pendingTransactions: enrichedPending || [],
        customerBalanceInfo: customerBalanceInfo.length > 0 ? customerBalanceInfo[0] : null,
        isCustomerOverdue: isCustomerOverdue,
        totalOutstandingAmount: totalOutstandingAmount
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

    // Use executeTransaction helper to avoid prepared statement error
    const result = await executeTransaction(async (connection) => {
      // Get customer info first to check if day_limit customer
      // ✅ ADD: Check if day_remaining_amount column exists, if not add it
      try {
        // Check if column exists
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'customer_balances' 
          AND COLUMN_NAME = 'day_remaining_amount'
        `);
        
        if (columns.length === 0) {
          // Column doesn't exist, add it
          await connection.execute(`
            ALTER TABLE customer_balances 
            ADD COLUMN day_remaining_amount DECIMAL(10,2) DEFAULT 0.00
          `);
          console.log('Added day_remaining_amount column to customer_balances');
        }
      } catch (alterError) {
        // Column might already exist or other error, ignore
        console.log('day_remaining_amount column check:', alterError.message);
      }

      const [customerInfo] = await connection.execute(
        'SELECT day_limit, amtlimit, is_active, balance, total_day_amount, COALESCE(day_remaining_amount, 0) as day_remaining_amount FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
      
      if (customerInfo.length === 0) {
        throw new Error('Customer balance info not found');
      }

      const isDayLimit = customerInfo[0].day_limit > 0;
      const currentIsActive = parseInt(customerInfo[0].is_active) || 1;
      const currentBalance = parseFloat(customerInfo[0].balance) || 0;
      const currentTotalDayAmount = parseFloat(customerInfo[0].total_day_amount) || 0;
      const currentDayRemainingAmount = parseFloat(customerInfo[0].day_remaining_amount || 0) || 0;

      // ✅ ONLY allow payment processing for day_limit customers
      if (!isDayLimit) {
        throw new Error('Payment processing is only available for day limit customers');
      }

      const paymentAmount = parseFloat(rechargeAmount);
      
      // ✅ Balance logic: Payment amount ADD to balance (inward transaction)
      // Then paid transactions amount SUBTRACT from balance
      // ✅ NEW: Use day_remaining_amount first if available
      let availableAmount = paymentAmount + currentDayRemainingAmount; // Payment + existing remaining
      let tempBalance = currentBalance + paymentAmount; // Add payment to balance first
      let tempTotalDayAmount = currentTotalDayAmount + paymentAmount; // Add payment to total_day_amount
      let invoicesPaid = 0;
      let totalPaidAmount = 0;
      let daysCleared = 0;
      let usedRemainingAmount = 0; // Track how much from day_remaining_amount was used

      // ✅ FIXED: Get pending transactions without GROUP_CONCAT
      const [pendingTransactions] = await connection.execute(
        `SELECT 
           id,
           DATE(completed_date) as day_date,
           COALESCE(totalamt, price * aqty) as amount
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         ORDER BY completed_date ASC`,
        [customerId]
      );

      console.log('Pending transactions:', pendingTransactions);
      console.log('Payment amount:', paymentAmount);
      console.log('Current total_day_amount:', currentTotalDayAmount);
      console.log('New total_day_amount after payment:', tempTotalDayAmount);

      // Group transactions by day manually
      const transactionsByDay = {};
      pendingTransactions.forEach(transaction => {
        const day = transaction.day_date;
        if (!transactionsByDay[day]) {
          transactionsByDay[day] = {
            day_date: day,
            day_total: 0,
            transaction_ids: []
          };
        }
        transactionsByDay[day].day_total += parseFloat(transaction.amount || 0);
        transactionsByDay[day].transaction_ids.push(transaction.id);
      });

      // Convert to array and sort by date
      const pendingTransactionsByDay = Object.values(transactionsByDay).sort((a, b) => 
        new Date(a.day_date) - new Date(b.day_date)
      );

      console.log('Grouped by day:', pendingTransactionsByDay);

      // Clear each day's amount starting from oldest day USING TOTAL_DAY_AMOUNT + day_remaining_amount
      for (const dayData of pendingTransactionsByDay) {
        if (availableAmount <= 0) break;

        const dayTotal = parseFloat(dayData.day_total) || 0;
        const transactionIds = dayData.transaction_ids;

        console.log(`Processing day: ${dayData.day_date}, Total: ${dayTotal}, Available: ${availableAmount} (payment: ${paymentAmount}, remaining: ${currentDayRemainingAmount})`);

        if (availableAmount >= dayTotal) {
          // Full payment for this day - mark all transactions of this day as paid
          if (transactionIds.length > 0) {
            // Create placeholders for IN clause
            const placeholders = transactionIds.map(() => '?').join(',');
            const paymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await connection.execute(
              `UPDATE filling_requests 
               SET payment_status = 1, payment_date = ? 
               WHERE id IN (${placeholders})`,
              [paymentDate, ...transactionIds]
            );
            invoicesPaid += transactionIds.length;
            totalPaidAmount += dayTotal;
            
            // ✅ NEW: Use day_remaining_amount first, then payment amount
            if (currentDayRemainingAmount > 0 && usedRemainingAmount < currentDayRemainingAmount) {
              const remainingToUse = Math.min(dayTotal, currentDayRemainingAmount - usedRemainingAmount);
              usedRemainingAmount += remainingToUse;
              availableAmount -= remainingToUse;
              tempTotalDayAmount -= (dayTotal - remainingToUse); // Only deduct from total_day_amount what wasn't from remaining
            } else {
              tempTotalDayAmount -= dayTotal; // Deduct from total_day_amount
              availableAmount -= dayTotal;
            }
            
            tempBalance -= dayTotal; // ✅ Subtract paid amount from balance
            daysCleared++;
            console.log(`✅ Paid day ${dayData.day_date}: ${transactionIds.length} transactions, Amount: ${dayTotal}, Payment Date: ${paymentDate}`);
          }
        } else {
          // Partial payment - cannot partially pay a day, need full day amount
          console.log(`❌ Insufficient amount for day ${dayData.day_date}: Need ${dayTotal}, Have ${availableAmount}`);
          break;
        }
      }

      // ✅ NEW: Calculate remaining amounts
      // remainingDayAmount = unused payment in total_day_amount
      // dayRemainingAmount = unused payment amount (extra payment)
      const remainingDayAmount = tempTotalDayAmount;
      const newDayRemainingAmount = Math.max(0, availableAmount); // Extra payment amount

      console.log('Payment summary:', {
        paymentAmount,
        totalPaidAmount,
        invoicesPaid,
        daysCleared,
        remainingDayAmount,
        currentBalance,
        newBalance: tempBalance
      });

      // ✅ CORRECTED LOGIC:
      // 1. Balance = currentBalance + paymentAmount - totalPaidAmount
      //    (Payment added, then paid transactions subtracted)
      // 2. Total_day_amount = remaining_amount (for future payments)
      const newBalance = tempBalance;
      const newTotalDayAmount = remainingDayAmount;
      
      // Check if customer is still overdue after payment (for day_limit customers)
      let newIsActive = currentIsActive;
      let isOverdue = false;
      
      if (isDayLimit && customerInfo.length > 0) {
        const dayLimit = parseInt(customerInfo[0].day_limit) || 0;
        
        // Check remaining unpaid transactions
        const [remainingUnpaid] = await connection.execute(
          `SELECT completed_date
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           ORDER BY completed_date ASC
           LIMIT 1`,
          [customerId]
        );

        if (remainingUnpaid.length > 0 && dayLimit > 0) {
          const oldestUnpaidDate = new Date(remainingUnpaid[0].completed_date);
          oldestUnpaidDate.setHours(0, 0, 0, 0);
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
          const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
          
          isOverdue = daysElapsed >= dayLimit;
          newIsActive = isOverdue ? 0 : 1;
          console.log(`Overdue check: Days elapsed: ${daysElapsed}, Limit: ${dayLimit}, Overdue: ${isOverdue}`);
        } else {
          // No remaining unpaid transactions - customer is active
          newIsActive = 1;
          console.log('✅ No remaining unpaid transactions - customer activated');
        }
      }
      
      // ✅ Update balance, total_day_amount, day_remaining_amount and is_active
      await connection.execute(
        'UPDATE customer_balances SET balance = ?, total_day_amount = ?, day_remaining_amount = ?, is_active = ? WHERE com_id = ?',
        [newBalance, newTotalDayAmount, newDayRemainingAmount, newIsActive, customerId]
      );

      // Record the recharge in filling_history as inward transaction
      if (paymentAmount > 0) {
        await connection.execute(
          `INSERT INTO filling_history (
            cl_id, trans_type, amount, credit, credit_date, 
            new_amount, remaining_limit, created_by, payment_status
          ) VALUES (?, 'inward', ?, ?, NOW(), ?, ?, ?, 1)`,
          [
            customerId, 
            paymentAmount, // amount (positive)
            paymentAmount, // credit (positive)
            newBalance,    // new_amount (balance after payment and deductions)
            customerInfo[0].day_limit, // Use day_limit instead of amtlimit
            1, // created_by
          ]
        );
      }

      // Return result for executeTransaction
      return {
        invoicesPaid,
        totalPaidAmount,
        remainingDayAmount,
        dayRemainingAmount: newDayRemainingAmount, // ✅ NEW: Extra payment amount
        daysCleared,
        isOverdue,
        newIsActive,
        newBalance,
        newTotalDayAmount,
        isDayLimit
      };

    });

    // Build success message
    let message = '';
    if (result.isDayLimit) {
      const daysMessage = result.daysCleared === 1 
        ? '1 day payment made' 
        : `${result.daysCleared} days payment made`;
      message = `Payment processed successfully. ${daysMessage}. ${result.invoicesPaid} unpaid invoice(s) paid. Amount: ₹${result.totalPaidAmount}.`;
      
      if (result.remainingDayAmount > 0) {
        message += ` Remaining balance in day account: ₹${result.remainingDayAmount}.`;
      }
      
      // ✅ NEW: Show extra payment amount
      if (result.dayRemainingAmount > 0) {
        message += ` Extra payment stored: ₹${result.dayRemainingAmount} (will be used for future requests).`;
      }
      
      message += result.isOverdue ? ' ⚠️ Status: Overdue' : ' ✅ Status: Active';
    }

    // Create audit log entry for payment
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS customer_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          user_id INT,
          user_name VARCHAR(255),
          remarks TEXT,
          amount DECIMAL(10,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_customer_id (customer_id),
          INDEX idx_created_at (created_at)
        )
      `);
      
      // Fetch employee name from employee_profile
      let employeeName = 'System';
      try {
        const employeeResult = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [1]
        );
        if (employeeResult.length > 0) {
          employeeName = employeeResult[0].name;
        }
      } catch (empError) {
        console.error('Error fetching employee name:', empError);
      }
      
      await executeQuery(
        `INSERT INTO customer_audit_log (customer_id, action_type, user_id, user_name, remarks, amount) VALUES (?, ?, ?, ?, ?, ?)`,
        [customerId, 'payment', 1, employeeName, `Payment processed - ${result.invoicesPaid} invoice(s) paid, ${result.daysCleared} day(s) cleared`, result.totalPaidAmount]
      );
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    return NextResponse.json({
      success: true,
      message,
      invoicesPaid: result.invoicesPaid,
      amountPaid: result.totalPaidAmount,
      remainingDayAmount: result.remainingDayAmount,
      dayRemainingAmount: result.dayRemainingAmount, // ✅ NEW: Extra payment amount
      daysCleared: result.daysCleared,
      isOverdue: result.isOverdue,
      isActive: result.newIsActive,
      newBalance: result.newBalance,
      newTotalDayAmount: result.newTotalDayAmount
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to process payment' 
      },
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

    // Build export query
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

    // Get customer info to determine type
    const customerBalanceInfo = await executeQuery(
      'SELECT day_limit, amtlimit FROM customer_balances WHERE com_id = ?',
      [cid]
    );
    
    const isDayLimitCustomer = customerBalanceInfo.length > 0 && customerBalanceInfo[0].day_limit > 0;
    const isAmountLimitCustomer = customerBalanceInfo.length > 0 && customerBalanceInfo[0].amtlimit > 0;

    // Prepare CSV headers based on customer type
    let csvHeaders = [
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
      'Balance'
    ];

    // Add columns based on customer type
    if (isDayLimitCustomer) {
      csvHeaders.push('Day Limit');
      csvHeaders.push('Final Remaining');
      csvHeaders.push('Due Days');
      csvHeaders.push('Status');
    } else if (isAmountLimitCustomer) {
      csvHeaders.push('Remaining Limit');
      csvHeaders.push('Increase Amount');
      csvHeaders.push('Decrease Amount');
      csvHeaders.push('Limit Type');
    }
    
    csvHeaders.push('Payment Status');
    csvHeaders.push('Updated By');

    // Convert data to CSV format based on customer type
    const csvRows = rows.map(row => {
      const baseRow = [
        row.id || '',
        row.station_name || '',
        formatDateForCSV(row.completed_date || row.filling_date || row.credit_date),
        row.pname || '',
        row.vehicle_number || '',
        row.trans_type || '',
        row.filling_qty || '',
        formatCurrencyForCSV(row.amount),
        formatCurrencyForCSV(row.credit),
        formatDateForCSV(row.credit_date),
        formatCurrencyForCSV(row.new_amount)
      ];

      // Add columns based on customer type
      let additionalColumns = [];
      
      if (isDayLimitCustomer) {
        // Calculate due days for day limit customers
        const transactionDate = new Date(row.completed_date || row.filling_date || row.created_at);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        transactionDate.setHours(0, 0, 0, 0);
        const daysDifference = Math.floor((currentDate - transactionDate) / (1000 * 60 * 60 * 24));
        
        // Determine status for day limit customers
        let status = '';
        if (row.trans_type === "inward") {
          status = "Recharge";
        } else if (row.payment_status === 1 || row.request_payment_status === 1) {
          status = "Paid";
        } else if (row.payment_status === 0 || row.request_payment_status === 0) {
          const dayLimit = customerBalanceInfo[0]?.day_limit || 0;
          status = (dayLimit > 0 && daysDifference >= dayLimit) ? "Overdue" : "Pending";
        } else {
          status = "Standard";
        }

        additionalColumns = [
          customerBalanceInfo[0]?.day_limit || '',
          row.remaining_day_limit || '',
          daysDifference,
          status
        ];
      } else if (isAmountLimitCustomer) {
        additionalColumns = [
          formatCurrencyForCSV(row.remaining_limit),
          formatCurrencyForCSV(row.in_amount),
          formatCurrencyForCSV(row.d_amount),
          row.limit_type || ''
        ];
      }

      // Payment status
      const paymentStatus = (row.payment_status === 1 || row.request_payment_status === 1) ? 'Paid' : 'Unpaid';

      return [
        ...baseRow,
        ...additionalColumns,
        paymentStatus,
        row.updated_by_name || ''
      ];
    });

    // Create CSV content
    let csvContent = csvHeaders.join(',') + '\n';
    
    csvRows.forEach(row => {
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

// Helper functions for CSV formatting
function formatCurrencyForCSV(amount) {
  if (!amount) return '0.00';
  const num = parseFloat(amount);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

function formatDateForCSV(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}