// app/api/customers/client-history/route.js
import { executeQuery, executeTransaction, getConnection } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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

    // Check if remaining_day_limit column exists
    let hasRemainingDayLimit = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      if (colsInfo && Array.isArray(colsInfo) && colsInfo.length > 0) {
        const colSet = new Set(colsInfo.map(r => (r.Field || r.field || '')));
        hasRemainingDayLimit = colSet.has('remaining_day_limit');
      }
    } catch (colError) {
      console.warn('Could not check remaining_day_limit column:', colError.message);
      // Continue without the column - will use NULL
      hasRemainingDayLimit = false;
    }

    const remainingDayLimitField = hasRemainingDayLimit ? 'fh.remaining_day_limit,' : 'NULL as remaining_day_limit,';

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
        fh.in_amount,
        fh.d_amount,
        ${remainingDayLimitField}
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

    let transactions = [];
    try {
      transactions = await executeQuery(sql, params);
    } catch (queryError) {
      console.error('Error executing transactions query:', queryError);
      console.error('SQL:', sql);
      console.error('Params:', params);
      // Return empty array instead of failing
      transactions = [];
    }

    // ✅ Get pending transactions for payment processing (UNPAID only)
    let pendingTransactions = [];
    try {
      pendingTransactions = await executeQuery(
        `SELECT 
           fr.id,
           COALESCE(fr.totalamt, fr.price * fr.aqty) AS amount,
           fr.completed_date,
           fr.payment_status,
           fr.payment_date,
           fr.vehicle_number,
           'Outward' as trans_type,
           fr.aqty AS loading_qty,
           fs.station_name,
           p.pname
         FROM filling_requests fr
         LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
         LEFT JOIN products p ON fr.product = p.id
         WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
         ORDER BY fr.completed_date ASC`,
        [cid]
      );
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      pendingTransactions = [];
    }

    // ✅ Calculate payment statistics from filling_history
    let paymentStats = [];
    try {
      paymentStats = await executeQuery(
        `SELECT 
           COUNT(DISTINCT CASE WHEN fh.trans_type = 'inward' AND fh.payment_status = 1 THEN fh.rid END) as paid_requests_count,
           SUM(CASE WHEN fh.trans_type = 'inward' AND fh.payment_status = 1 THEN fh.amount ELSE 0 END) as total_paid_amount,
           COUNT(DISTINCT CASE WHEN fh.trans_type = 'Outward' AND fh.payment_status = 0 THEN fh.rid END) as unpaid_requests_count,
           SUM(CASE WHEN fh.trans_type = 'Outward' AND fh.payment_status = 0 THEN fh.amount ELSE 0 END) as total_unpaid_amount
         FROM filling_history fh
         WHERE fh.cl_id = ?`,
        [cid]
      );
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      paymentStats = [];
    }

    const paidRequestsCount = paymentStats.length > 0 ? parseInt(paymentStats[0].paid_requests_count || 0) : 0;
    const totalPaidAmount = paymentStats.length > 0 ? parseFloat(paymentStats[0].total_paid_amount || 0) : 0;
    const unpaidRequestsCount = paymentStats.length > 0 ? parseInt(paymentStats[0].unpaid_requests_count || 0) : pendingTransactions.length;
    const totalUnpaidAmountFromHistory = paymentStats.length > 0 ? parseFloat(paymentStats[0].total_unpaid_amount || 0) : 0;

    // Get balance and day limit info
    let balanceResult = [];
    try {
      balanceResult = await executeQuery(
        'SELECT balance, total_day_amount FROM customer_balances WHERE com_id = ?',
        [cid]
      );
    } catch (error) {
      console.error('Error fetching balance:', error);
      balanceResult = [];
    }

    const balance = balanceResult.length > 0 ? Math.round(balanceResult[0].balance) : 0;
    const totalDayAmount = balanceResult.length > 0 ? parseFloat(balanceResult[0].total_day_amount) || 0 : 0;
    const dayLimit = customerBalanceInfo.length > 0 ? parseInt(customerBalanceInfo[0].day_limit) || 0 : 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // ✅ Calculate days open (kitne days ke requests unpaid hain)
    let daysOpen = 0;
    let overdueBalance = 0;
    let overdueDetails = null;

    if (isDayLimitCustomer && dayLimit > 0 && pendingTransactions.length > 0) {
      // Get oldest unpaid transaction
      const oldestUnpaid = pendingTransactions[0];
      if (oldestUnpaid.completed_date) {
        const oldestUnpaidDate = new Date(oldestUnpaid.completed_date);
        oldestUnpaidDate.setHours(0, 0, 0, 0);
        const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
        daysOpen = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));

        // Calculate overdue balance (only if days elapsed >= day limit)
        if (daysOpen >= dayLimit) {
          // Get all overdue transactions (completed before day limit exceeded)
          overdueBalance = totalOutstandingAmount;

          overdueDetails = {
            days_elapsed: daysOpen,
            day_limit: dayLimit,
            days_overdue: daysOpen - dayLimit,
            overdue_amount: overdueBalance,
            oldest_unpaid_date: oldestUnpaidDate.toISOString(),
            total_unpaid_requests: pendingTransactions.length
          };
        }
      }
    }

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

      // ✅ Check payment_status from both filling_history and filling_requests
      const isPaid = Number(t.payment_status) === 1 || Number(t.request_payment_status) === 1;
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

    // Build response safely
    let responseData;
    try {
      responseData = {
        success: true,
        data: {
          transactions: transactions || [],
          products: (products || []).map(p => p.pname || '').filter(Boolean),
          balance: balance || 0,
          totalDayAmount: totalDayAmount || 0,
          filter: pname || '',
          customerName: customerName || '',
          clientType: clientType || '',
          pendingTransactions: enrichedPending || [],
          customerBalanceInfo: customerBalanceInfo.length > 0 ? customerBalanceInfo[0] : null,
          isCustomerOverdue: isCustomerOverdue || false,
          totalOutstandingAmount: totalOutstandingAmount || 0,
          // ✅ NEW: Payment statistics from filling_history
          paymentStats: {
            paid_requests_count: paidRequestsCount || 0,
            total_paid_amount: totalPaidAmount || 0,
            unpaid_requests_count: unpaidRequestsCount || 0,
            total_unpaid_amount: totalUnpaidAmountFromHistory || totalOutstandingAmount || 0
          },
          // ✅ NEW: Days open and overdue details
          daysOpen: daysOpen || 0,
          overdueBalance: overdueBalance || 0,
          overdueDetails: overdueDetails || null
        }
      };
    } catch (responseError) {
      console.error('Error building response:', responseError);
      throw responseError;
    }

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('API Error in client-history GET:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to fetch customer history',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { customerId, rechargeAmount, payment_type, payment_date, remarks } = body;

    if (!customerId || !rechargeAmount) {
      return NextResponse.json(
        { error: 'Customer ID and amount are required' },
        { status: 400 }
      );
    }

    // Get current user for audit logging
    let currentUser = null;
    try {
      currentUser = await getCurrentUser();
    } catch (err) {
      console.log('Could not get current user:', err);
    }

    // Get customer details first (including billing_type)
    const customerDetails = await executeQuery(
      'SELECT id, name, client_type, billing_type FROM customers WHERE id = ?',
      [customerId]
    );

    if (customerDetails.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerDetails[0];
    const clientType = parseInt(customer.client_type) || 0; // 1=Prepaid, 2=Postpaid, 3=Day Limit
    const billingType = parseInt(customer.billing_type) || 1; // 1=Billing, 2=Non-Billing
    const isNonBilling = billingType === 2;
    const isCashPayment = parseInt(payment_type) === 1; // 1=Cash
    const paymentDate = payment_date || new Date().toISOString().split("T")[0];
    const paymentRemarks = remarks || "";

    // Get current balance info before transaction (for reference outside transaction)
    // If balance record doesn't exist, create it
    let customerBalanceInfo = await executeQuery(
      'SELECT is_active, balance FROM customer_balances WHERE com_id = ?',
      [customerId]
    );

    if (customerBalanceInfo.length === 0) {
      // Create default balance record for customer
      await executeQuery(
        `INSERT INTO customer_balances 
         (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [0, 0, 0, 0, customerId, 0, 0, 1]
      );
      // Fetch again after creation
      customerBalanceInfo = await executeQuery(
        'SELECT is_active, balance FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
    }

    const currentIsActive = customerBalanceInfo.length > 0 ? (parseInt(customerBalanceInfo[0].is_active) || 1) : 1;
    const currentBalance = customerBalanceInfo.length > 0 ? (parseFloat(customerBalanceInfo[0].balance) || 0) : 0;

    // Use executeTransaction helper to avoid prepared statement error
    const result = await executeTransaction(async (connection) => {
      // ✅ ADD: Check if day_remaining_amount column exists, if not add it
      try {
        const [columns] = await connection.execute(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'customer_balances' 
          AND COLUMN_NAME = 'day_remaining_amount'
        `);

        if (columns.length === 0) {
          await connection.execute(`
            ALTER TABLE customer_balances 
            ADD COLUMN day_remaining_amount DECIMAL(10,2) DEFAULT 0.00
          `);
          console.log('Added day_remaining_amount column to customer_balances');
        }
      } catch (alterError) {
        console.log('day_remaining_amount column check:', alterError.message);
      }

      let [customerInfo] = await connection.execute(
        'SELECT day_limit, amtlimit, is_active, balance, total_day_amount, COALESCE(day_remaining_amount, 0) as day_remaining_amount, cst_limit FROM customer_balances WHERE com_id = ?',
        [customerId]
      );

      // Auto-create balance record if it doesn't exist
      if (customerInfo.length === 0) {
        // Determine default values based on client type
        const defaultAmtLimit = clientType === 2 ? 0 : 0; // Postpaid can have credit limit set later
        const defaultDayLimit = clientType === 3 ? 0 : 0; // Day limit can be set later

        await connection.execute(
          `INSERT INTO customer_balances 
           (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [0, 0, defaultAmtLimit, defaultAmtLimit, customerId, defaultDayLimit, 0, 1]
        );

        // Fetch again after creation
        [customerInfo] = await connection.execute(
          'SELECT day_limit, amtlimit, is_active, balance, total_day_amount, COALESCE(day_remaining_amount, 0) as day_remaining_amount, cst_limit FROM customer_balances WHERE com_id = ?',
          [customerId]
        );
      }

      const isDayLimit = customerInfo[0].day_limit > 0;
      const isPrepaid = clientType === 1;
      const isPostpaid = clientType === 2;
      const currentIsActive = parseInt(customerInfo[0].is_active) || 1;
      const currentBalance = parseFloat(customerInfo[0].balance) || 0;
      const currentTotalDayAmount = parseFloat(customerInfo[0].total_day_amount) || 0;
      const currentDayRemainingAmount = parseFloat(customerInfo[0].day_remaining_amount || 0) || 0;
      const currentCreditLimit = parseFloat(customerInfo[0].cst_limit || customerInfo[0].amtlimit || 0);

      const paymentAmount = parseFloat(rechargeAmount);

      // ============================================================
      // PREPAID CUSTOMER (client_type = 1): Recharge = Balance se MINUS
      // ============================================================
      if (isPrepaid) {
        // ✅ Recharge = Payment = Balance se MINUS, amtlimit me ADD
        const newBalance = currentBalance - paymentAmount;
        const newAmtLimit = currentCreditLimit + paymentAmount; // Add to amtlimit

        // Update balance and amtlimit
        await connection.execute(
          'UPDATE customer_balances SET balance = ?, amtlimit = ? WHERE com_id = ?',
          [newBalance, newAmtLimit, customerId]
        );

        // Record in filling_history as inward transaction (recharge record)
        // Balance se MINUS but filling_history me inward type (recharge entry)
        if (paymentAmount > 0) {
          // For non-billing customers, include credit_date and remarks (payment_type column doesn't exist)
          if (isNonBilling) {
            // Check if remarks column exists
            let hasRemarksColumn = false;
            try {
              const [colsInfo] = await connection.execute('SHOW COLUMNS FROM filling_history');
              const colSet = new Set(colsInfo.map(r => r.Field));
              hasRemarksColumn = colSet.has('remarks');
            } catch (colError) {
              console.warn('Could not check remarks column:', colError.message);
            }

            if (hasRemarksColumn) {
              await connection.execute(
                `INSERT INTO filling_history (
                  cl_id, trans_type, credit, credit_date, 
                  new_amount, remaining_limit, created_by, payment_status, remarks
                ) VALUES (?, 'inward', ?, ?, ?, ?, ?, 1, ?)`,
                [
                  customerId,
                  paymentAmount, // Credit amount only (no amount field for recharge)
                  paymentDate, // Use payment_date instead of NOW()
                  newBalance, // New balance (after deduction from balance)
                  newAmtLimit, // New amtlimit (after adding recharge)
                  currentUser?.userId || 1,
                  paymentRemarks, // remarks
                ]
              );
            } else {
              await connection.execute(
                `INSERT INTO filling_history (
                  cl_id, trans_type, credit, credit_date, 
                  new_amount, remaining_limit, created_by, payment_status
                ) VALUES (?, 'inward', ?, ?, ?, ?, ?, 1)`,
                [
                  customerId,
                  paymentAmount, // Credit amount only (no amount field for recharge)
                  paymentDate, // Use payment_date instead of NOW()
                  newBalance, // New balance (after deduction from balance)
                  newAmtLimit, // New amtlimit (after adding recharge)
                  currentUser?.userId || 1,
                ]
              );
            }
          } else {
            await connection.execute(
              `INSERT INTO filling_history (
                cl_id, trans_type, credit, credit_date, 
                new_amount, remaining_limit, created_by, payment_status
              ) VALUES (?, 'inward', ?, NOW(), ?, ?, ?, 1)`,
              [
                customerId,
                paymentAmount, // Credit amount only (no amount field for recharge)
                newBalance, // New balance (after deduction from balance)
                newAmtLimit, // New amtlimit (after adding recharge)
                currentUser?.userId || 1,
              ]
            );
          }
        }

        return {
          customerType: 'prepaid',
          newBalance,
          amountRecharged: paymentAmount,
          invoicesPaid: 0,
          totalPaidAmount: 0,
          daysCleared: 0,
          isDayLimit: false,
          newIsActive: currentIsActive
        };
      }

      // ============================================================
      // POSTPAID CUSTOMER (client_type = 2): Recharge = Balance se MINUS, Outstanding se pay
      // ============================================================
      if (isPostpaid) {
        // ✅ Recharge = Payment = Balance se MINUS
        const balanceAfterRecharge = currentBalance - paymentAmount;
        let remainingAmount = paymentAmount; // Amount available to pay outstanding
        let invoicesPaid = 0;
        let totalPaidAmount = 0;

        // Get pending transactions (outstanding invoices - oldest first)
        const [pendingTransactions] = await connection.execute(
          `SELECT 
             id,
             COALESCE(totalamt, price * aqty) as amount,
             completed_date
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
           ORDER BY completed_date ASC`,
          [customerId]
        );

        // Pay off oldest outstanding invoices first from recharge amount
        for (const transaction of pendingTransactions) {
          if (remainingAmount <= 0) break;

          const transactionAmount = parseFloat(transaction.amount || 0);

          if (remainingAmount >= transactionAmount) {
            const paymentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
            await connection.execute(
              'UPDATE filling_requests SET payment_status = 1, payment_date = ? WHERE id = ?',
              [paymentDate, transaction.id]
            );
            remainingAmount -= transactionAmount; // Outstanding se minus
            totalPaidAmount += transactionAmount;
            invoicesPaid++;
          } else {
            // Not enough to pay this invoice fully
            break;
          }
        }

        // ✅ Final balance: Balance se recharge minus, outstanding invoices paid
        // Balance = Previous Balance - Recharge Amount
        // Outstanding invoices paid from recharge amount (outstanding se minus)
        // amtlimit = Previous amtlimit + Recharge Amount
        const finalBalance = balanceAfterRecharge;
        const newAmtLimit = currentCreditLimit + paymentAmount; // Add to amtlimit

        // Update balance and amtlimit
        await connection.execute(
          'UPDATE customer_balances SET balance = ?, amtlimit = ? WHERE com_id = ?',
          [finalBalance, newAmtLimit, customerId]
        );

        // Record recharge in filling_history as inward transaction (recharge record)
        // Balance se MINUS but filling_history me inward type (recharge entry)
        // Outstanding invoices paid from this payment
        if (paymentAmount > 0) {
          // For non-billing customers, include credit_date and remarks (payment_type column doesn't exist)
          if (isNonBilling) {
            // Check if remarks column exists
            let hasRemarksColumn = false;
            try {
              const [colsInfo] = await connection.execute('SHOW COLUMNS FROM filling_history');
              const colSet = new Set(colsInfo.map(r => r.Field));
              hasRemarksColumn = colSet.has('remarks');
            } catch (colError) {
              console.warn('Could not check remarks column:', colError.message);
            }

            if (hasRemarksColumn) {
              await connection.execute(
                `INSERT INTO filling_history (
                  cl_id, trans_type, credit, credit_date, 
                  new_amount, remaining_limit, created_by, payment_status, remarks
                ) VALUES (?, 'inward', ?, ?, ?, ?, ?, 1, ?)`,
                [
                  customerId,
                  paymentAmount, // Credit amount only (no amount field for recharge)
                  paymentDate, // Use payment_date instead of NOW()
                  finalBalance, // New balance (after deduction from balance)
                  newAmtLimit, // New amtlimit (after adding recharge)
                  currentUser?.userId || 1,
                  paymentRemarks, // remarks
                ]
              );
            } else {
              await connection.execute(
                `INSERT INTO filling_history (
                  cl_id, trans_type, credit, credit_date, 
                  new_amount, remaining_limit, created_by, payment_status
                ) VALUES (?, 'inward', ?, ?, ?, ?, ?, 1)`,
                [
                  customerId,
                  paymentAmount, // Credit amount only (no amount field for recharge)
                  paymentDate, // Use payment_date instead of NOW()
                  finalBalance, // New balance (after deduction from balance)
                  newAmtLimit, // New amtlimit (after adding recharge)
                  currentUser?.userId || 1,
                ]
              );
            }
          } else {
            await connection.execute(
              `INSERT INTO filling_history (
                cl_id, trans_type, credit, credit_date, 
                new_amount, remaining_limit, created_by, payment_status
              ) VALUES (?, 'inward', ?, NOW(), ?, ?, ?, 1)`,
              [
                customerId,
                paymentAmount, // Credit amount only (no amount field for recharge)
                finalBalance, // New balance (after deduction from balance)
                newAmtLimit, // New amtlimit (after adding recharge)
                currentUser?.userId || 1,
              ]
            );
          }
        }

        return {
          customerType: 'postpaid',
          newBalance: finalBalance,
          amountRecharged: paymentAmount,
          invoicesPaid,
          totalPaidAmount, // Amount paid to outstanding invoices
          daysCleared: 0,
          remainingBalance: remainingAmount, // Extra payment (if any) - will be used for future outstanding
          isDayLimit: false,
          newIsActive: currentIsActive
        };
      }

      // ============================================================
      // DAY LIMIT CUSTOMER (client_type = 3): Recharge = Balance se MINUS, Outstanding se pay day-wise
      // ============================================================
      if (isDayLimit) {
        // ✅ Recharge = Payment = Balance se MINUS
        // Balance deduct first, then use to pay outstanding invoices
        let availableAmount = paymentAmount + currentDayRemainingAmount; // Available to pay outstanding
        let tempBalance = currentBalance - paymentAmount; // ✅ Balance se MINUS (recharge)
        let tempTotalDayAmount = currentTotalDayAmount + paymentAmount; // Track total recharged
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

        // ✅ Track paid request IDs
        const paidRequestIdsList = [];

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

              // ✅ Update filling_requests payment_status
              await connection.execute(
                `UPDATE filling_requests 
               SET payment_status = 1, payment_date = ? 
               WHERE id IN (${placeholders})`,
                [paymentDate, ...transactionIds]
              );

              // ✅ Update filling_history payment_status for OUTWARD transactions
              // Get RIDs from filling_requests
              const [requestRows] = await connection.execute(
                `SELECT rid FROM filling_requests WHERE id IN (${placeholders})`,
                [...transactionIds]
              );

              if (requestRows.length > 0) {
                const rids = requestRows.map(r => r.rid).filter(Boolean);
                if (rids.length > 0) {
                  const ridPlaceholders = rids.map(() => '?').join(',');
                  const [updateResult] = await connection.execute(
                    `UPDATE filling_history 
                   SET payment_status = 1 
                   WHERE rid IN (${ridPlaceholders}) AND trans_type = 'Outward' AND payment_status = 0`,
                    [...rids]
                  );
                  console.log(`✅ Updated ${updateResult.affectedRows || 0} filling_history records to paid status for RIDs:`, rids);
                } else {
                  console.warn('⚠️ No RIDs found for transaction IDs:', transactionIds);
                }
              } else {
                console.warn('⚠️ No request rows found for transaction IDs:', transactionIds);
              }

              invoicesPaid += transactionIds.length;
              totalPaidAmount += dayTotal;

              // ✅ Track paid request IDs
              paidRequestIdsList.push(...transactionIds);

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

              // ✅ Outstanding invoices paid from available amount (outstanding se minus)
              // Balance already deducted, so no need to subtract again
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
        // 1. Balance = currentBalance - paymentAmount (Recharge = Balance se MINUS)
        // 2. Outstanding invoices paid from payment amount (outstanding se minus)
        // 3. Total_day_amount = remaining_amount (for future payments)
        const newBalance = tempBalance; // Already deducted paymentAmount
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

        // Record the recharge in filling_history as inward transaction (recharge record)
        // Balance se MINUS but filling_history me inward type (recharge entry)
        // Outstanding day-wise invoices paid from this payment
        if (paymentAmount > 0) {
          // For non-billing customers, include credit_date and remarks (payment_type column doesn't exist)
          if (isNonBilling) {
            // Check if remarks column exists
            let hasRemarksColumn = false;
            try {
              const colsInfo = await connection.execute('SHOW COLUMNS FROM filling_history');
              const colSet = new Set(colsInfo[0].map(r => r.Field));
              hasRemarksColumn = colSet.has('remarks');
            } catch (colError) {
              console.warn('Could not check remarks column:', colError.message);
            }

            if (hasRemarksColumn) {
              await connection.execute(
                `INSERT INTO filling_history (
                cl_id, trans_type, credit, credit_date, 
                new_amount, remaining_limit, created_by, payment_status, remarks
              ) VALUES (?, 'inward', ?, ?, ?, ?, ?, 1, ?)`,
                [
                  customerId,
                  paymentAmount, // Credit amount only (no amount field for recharge)
                  paymentDate, // Use payment_date instead of NOW()
                  newBalance,    // New balance (after deduction from balance)
                  customerInfo[0].day_limit, // Use day_limit instead of amtlimit
                  currentUser?.userId || 1, // created_by
                  paymentRemarks, // remarks
                ]
              );
            } else {
              await connection.execute(
                `INSERT INTO filling_history (
                cl_id, trans_type, credit, credit_date, 
                new_amount, remaining_limit, created_by, payment_status
              ) VALUES (?, 'inward', ?, ?, ?, ?, ?, 1)`,
                [
                  customerId,
                  paymentAmount, // Credit amount only (no amount field for recharge)
                  paymentDate, // Use payment_date instead of NOW()
                  newBalance,    // New balance (after deduction from balance)
                  customerInfo[0].day_limit, // Use day_limit instead of amtlimit
                  currentUser?.userId || 1, // created_by
                ]
              );
            }
          } else {
            await connection.execute(
              `INSERT INTO filling_history (
              cl_id, trans_type, credit, credit_date, 
              new_amount, remaining_limit, created_by, payment_status
            ) VALUES (?, 'inward', ?, NOW(), ?, ?, ?, 1)`,
              [
                customerId,
                paymentAmount, // Credit amount only (no amount field for recharge)
                newBalance,    // New balance (after deduction from balance)
                customerInfo[0].day_limit, // Use day_limit instead of amtlimit
                currentUser?.userId || 1, // created_by
              ]
            );
          }
        }

        // Return result for executeTransaction (Day Limit)
        return {
          customerType: 'day_limit',
          invoicesPaid,
          totalPaidAmount,
          remainingDayAmount,
          dayRemainingAmount: newDayRemainingAmount,
          daysCleared,
          isOverdue,
          newIsActive,
          newBalance,
          newTotalDayAmount,
          isDayLimit: true,
          paidRequestIds: paidRequestIdsList // ✅ IDs of requests that were paid
        };
      }

      // If we reach here, customer type is unknown
      throw new Error(`Unknown customer type: ${clientType}. Expected 1 (Prepaid), 2 (Postpaid), or 3 (Day Limit).`);

    });

    // ✅ Get all requests (paid and unpaid) for day limit customers
    let paidRequests = [];
    let pendingRequests = [];

    if (result.customerType === 'day_limit' && result.paidRequestIds) {
      // Get paid requests details
      if (result.paidRequestIds.length > 0) {
        const placeholders = result.paidRequestIds.map(() => '?').join(',');
        paidRequests = await executeQuery(
          `SELECT 
            fr.id, fr.rid, fr.vehicle_number, fr.completed_date,
            COALESCE(fr.totalamt, fr.price * fr.aqty) as amount,
            p.pname AS product_name,
            fs.station_name
           FROM filling_requests fr
           LEFT JOIN products p ON fr.product = p.id
           LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
           WHERE fr.id IN (${placeholders})
           ORDER BY fr.completed_date ASC`,
          result.paidRequestIds
        );
      }

      // Get remaining unpaid requests
      const unpaidPlaceholders = result.paidRequestIds.length > 0
        ? `AND fr.id NOT IN (${result.paidRequestIds.map(() => '?').join(',')})`
        : '';
      const unpaidParams = result.paidRequestIds.length > 0
        ? [customerId, ...result.paidRequestIds]
        : [customerId];

      pendingRequests = await executeQuery(
        `SELECT 
          fr.id, fr.rid, fr.vehicle_number, fr.completed_date,
          COALESCE(fr.totalamt, fr.price * fr.aqty) as amount,
          p.pname AS product_name,
          fs.station_name
         FROM filling_requests fr
         LEFT JOIN products p ON fr.product = p.id
         LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
         WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
         ${unpaidPlaceholders}
         ORDER BY fr.completed_date ASC`,
        unpaidParams
      );
    } else if (result.customerType === 'postpaid') {
      // For postpaid, get paid and unpaid requests
      paidRequests = await executeQuery(
        `SELECT 
          fr.id, fr.rid, fr.vehicle_number, fr.completed_date, fr.payment_date,
          COALESCE(fr.totalamt, fr.price * fr.aqty) as amount,
          p.pname AS product_name,
          fs.station_name
         FROM filling_requests fr
         LEFT JOIN products p ON fr.product = p.id
         LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
         WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 1
           AND fr.payment_date >= DATE_SUB(NOW(), INTERVAL 1 MINUTE)
         ORDER BY fr.completed_date ASC`,
        [customerId]
      );

      pendingRequests = await executeQuery(
        `SELECT 
          fr.id, fr.rid, fr.vehicle_number, fr.completed_date,
          COALESCE(fr.totalamt, fr.price * fr.aqty) as amount,
          p.pname AS product_name,
          fs.station_name
         FROM filling_requests fr
         LEFT JOIN products p ON fr.product = p.id
         LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
         WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
         ORDER BY fr.completed_date ASC`,
        [customerId]
      );
    }

    // Build success message based on customer type
    let message = '';
    let customerTypeName = '';

    if (result.customerType === 'prepaid') {
      customerTypeName = 'Prepaid';
      message = `Wallet recharge successful! Amount: ₹${rechargeAmount}. New balance: ₹${result.newBalance.toFixed(2)}.`;
    } else if (result.customerType === 'postpaid') {
      customerTypeName = 'Postpaid';
      message = `Recharge successful! Amount: ₹${rechargeAmount}. `;
      if (result.invoicesPaid > 0) {
        message += `${result.invoicesPaid} unpaid invoice(s) paid (₹${result.totalPaidAmount.toFixed(2)}). `;
      }
      message += `New balance: ₹${result.newBalance.toFixed(2)}.`;
      if (result.remainingBalance > 0) {
        message += ` Remaining credit: ₹${result.remainingBalance.toFixed(2)}.`;
      }
    } else if (result.customerType === 'day_limit') {
      customerTypeName = 'Day Limit';
      const daysMessage = result.daysCleared === 1
        ? '1 day payment made'
        : `${result.daysCleared} days payment made`;
      message = `Payment processed successfully. ${daysMessage}. ${result.invoicesPaid} unpaid invoice(s) paid. Amount: ₹${result.totalPaidAmount.toFixed(2)}.`;

      if (result.remainingDayAmount > 0) {
        message += ` Remaining balance in day account: ₹${result.remainingDayAmount.toFixed(2)}.`;
      }

      if (result.dayRemainingAmount > 0) {
        message += ` Extra payment stored: ₹${result.dayRemainingAmount.toFixed(2)} (will be used for future requests).`;
      }

      message += result.isOverdue ? ' ⚠️ Status: Overdue' : ' ✅ Status: Active';
    }

    // ✅ COMPREHENSIVE AUDIT LOGGING - Both customer_audit_log and audit_log
    try {
      // Get user info
      let userId = currentUser?.userId || null;
      let userName = currentUser?.userName || null;

      // Ensure customer_audit_log table exists
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

      // Insert into customer_audit_log
      // ✅ ENSURE: Always fetch employee name if userId exists
      let finalUserName = userName;
      if (!finalUserName && userId) {
        try {
          const empResult = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (empResult.length > 0 && empResult[0].name) {
            finalUserName = empResult[0].name;
          }
        } catch (empError) {
          console.error('Error fetching employee name for audit log:', empError);
        }
      }

      // If still no name, use Employee ID format instead of 'System'
      if (!finalUserName && userId) {
        finalUserName = `Employee ID: ${userId}`;
      } else if (!finalUserName) {
        finalUserName = 'Unknown';
      }

      await executeQuery(
        `INSERT INTO customer_audit_log (customer_id, action_type, user_id, user_name, remarks, amount) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          customerId,
          'recharge',
          userId,
          finalUserName,
          `${customerTypeName} Recharge: ₹${rechargeAmount}${result.invoicesPaid > 0 ? ` | ${result.invoicesPaid} invoice(s) paid` : ''}`,
          parseFloat(rechargeAmount)
        ]
      );

      // ✅ ALSO create comprehensive audit log using createAuditLog
      try {
        await createAuditLog({
          page: 'Customers',
          uniqueCode: `CUSTOMER-${customerId}`,
          section: 'Customer Recharge',
          userId,
          userName,
          action: 'recharge',
          remarks: `${customerTypeName} customer recharge: ₹${rechargeAmount}${result.invoicesPaid > 0 ? ` | ${result.invoicesPaid} invoice(s) paid (₹${result.totalPaidAmount?.toFixed(2) || 0})` : ''}`,
          oldValue: {
            customer_id: customerId,
            customer_name: customer.name,
            customer_type: customerTypeName,
            previous_balance: currentBalance
          },
          newValue: {
            customer_id: customerId,
            customer_name: customer.name,
            customer_type: customerTypeName,
            new_balance: result.newBalance,
            recharge_amount: parseFloat(rechargeAmount),
            invoices_paid: result.invoicesPaid || 0,
            amount_paid: result.totalPaidAmount || 0
          },
          fieldName: 'balance',
          recordType: 'customer',
          recordId: customerId
        });
      } catch (comprehensiveLogError) {
        console.error('Error creating comprehensive audit log:', comprehensiveLogError);
        // Don't fail the operation
      }

    } catch (auditError) {
      console.error('Error creating audit log for recharge:', auditError);
      // Don't fail the main operation
    }

    return NextResponse.json({
      success: true,
      message,
      customerType: result.customerType,
      amountRecharged: parseFloat(rechargeAmount),
      newBalance: result.newBalance,
      invoicesPaid: result.invoicesPaid || 0,
      amountPaid: result.totalPaidAmount || 0,
      remainingDayAmount: result.remainingDayAmount || 0,
      dayRemainingAmount: result.dayRemainingAmount || 0,
      daysCleared: result.daysCleared || 0,
      isOverdue: result.isOverdue || false,
      isActive: result.newIsActive !== undefined ? result.newIsActive : currentIsActive,
      newTotalDayAmount: result.newTotalDayAmount || 0,
      remainingBalance: result.remainingBalance || 0,
      // ✅ Add paid and pending requests list
      paidRequests: paidRequests.map(req => ({
        id: req.id,
        rid: req.rid,
        vehicle_number: req.vehicle_number,
        completed_date: req.completed_date,
        amount: parseFloat(req.amount || 0),
        product_name: req.product_name,
        station_name: req.station_name,
        payment_status: 'paid'
      })),
      pendingRequests: pendingRequests.map(req => ({
        id: req.id,
        rid: req.rid,
        vehicle_number: req.vehicle_number,
        completed_date: req.completed_date,
        amount: parseFloat(req.amount || 0),
        product_name: req.product_name,
        station_name: req.station_name,
        payment_status: 'pending'
      }))
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

    // Check which columns exist
    let hasRemainingDayLimit = false;
    let hasLimitType = false;
    let hasInAmount = false;
    let hasDAmount = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history').catch(() => []);
      if (colsInfo && colsInfo.length > 0) {
        const colSet = new Set(colsInfo.map(r => r.Field));
        hasRemainingDayLimit = colSet.has('remaining_day_limit');
        hasLimitType = colSet.has('limit_type');
        hasInAmount = colSet.has('in_amount');
        hasDAmount = colSet.has('d_amount');
      }
    } catch (colError) {
      console.warn('Could not check columns:', colError.message);
      // Continue without these columns - will use NULL
    }

    // Build export query with conditional columns
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
        ${hasRemainingDayLimit ? 'fh.remaining_day_limit,' : 'NULL as remaining_day_limit,'}
        ${hasLimitType ? 'fh.limit_type,' : 'NULL as limit_type,'}
        ${hasInAmount ? 'fh.in_amount,' : 'NULL as in_amount,'}
        ${hasDAmount ? 'fh.d_amount,' : 'NULL as d_amount,'}
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
      year: 'numeric',
      timeZone: 'Asia/Kolkata'
    });
  } catch (error) {
    return dateString;
  }
}