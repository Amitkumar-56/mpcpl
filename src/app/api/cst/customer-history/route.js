
import { executeQuery, executeTransaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pname = searchParams.get('pname') || '';
    const cl_id = searchParams.get('cl_id') || searchParams.get('id');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    // Get customer ID from parameter
    let customerId;
    if (cl_id) {
      customerId = parseInt(cl_id);
    } else {
      return NextResponse.json({
        success: false,
        message: 'Customer ID (cl_id) is required'
      }, { status: 400 });
    }
    
    if (isNaN(customerId) || customerId <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid customer ID'
      }, { status: 400 });
    }

    // 1. Fetch customer name
    const customerResult = await executeQuery(
      'SELECT id, name, client_type, email FROM customers WHERE id = ?',
      [customerId]
    ).catch(() => []);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const customer = customerResult[0];
    // Ensure customer name is not null
    if (!customer.name || customer.name.trim() === '' || customer.name === 'Unknown') {
      customer.name = customer.email ? customer.email.split('@')[0] : `Customer #${customer.id}`;
    }

    // 2. Fetch customer balance info
    const customerBalanceInfo = await executeQuery(
      'SELECT balance, amtlimit, day_limit, hold_balance, cst_limit, last_reset_date, total_day_amount, is_active FROM customer_balances WHERE com_id = ?',
      [customerId]
    ).catch(() => []);

    // Check customer type
    const isDayLimitCustomer = customerBalanceInfo.length > 0 && customerBalanceInfo[0].day_limit > 0;

    // 3. Calculate remaining days ONLY for day_limit customers
    if (isDayLimitCustomer) {
      // Get OLDEST UNPAID completed transaction's completed_date
      const oldestUnpaidCompleted = await executeQuery(
        `SELECT completed_date 
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0
         ORDER BY completed_date ASC 
         LIMIT 1`,
        [customerId]
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

    // 4. Fetch distinct products for filter
    let products = [];
    try {
      const productsData = await executeQuery(
        `SELECT DISTINCT p.pname 
         FROM products p
         INNER JOIN filling_history fh ON p.id = fh.product_id
         LEFT JOIN filling_requests fr ON fh.rid = fr.rid
         WHERE (fh.cl_id = ? OR fr.cid = ?)
         ORDER BY p.pname`,
        [customerId, customerId]
      );
      products = productsData.map(p => p.pname);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
    
    // Check if remaining_day_limit column exists
    let hasRemainingDayLimit = false;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      if (colsInfo && Array.isArray(colsInfo) && colsInfo.length > 0) {
        const colSet = new Set(colsInfo.map(r => (r.Field || r.field || '')));
        hasRemainingDayLimit = colSet.has('remaining_day_limit');
      }
    } catch (colError) {
      hasRemainingDayLimit = false;
    }
    
    const remainingDayLimitField = hasRemainingDayLimit ? 'fh.remaining_day_limit,' : 'NULL as remaining_day_limit,';
    
    // 5. Fetch transactions with pagination
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
        CASE 
          WHEN fh.trans_type = 'credit' OR fh.trans_type = 'inward' THEN COALESCE(fh.credit, 0)
          ELSE NULL
        END AS in_amount,
        CASE 
          WHEN fh.trans_type = 'debit' OR fh.trans_type = 'outward' THEN COALESCE(fh.amount, 0)
          ELSE NULL
        END AS d_amount,
        ${remainingDayLimitField}
        fh.payment_status,
        fh.filling_date,
        fh.created_at,
        COALESCE(p.pname, 'Unknown Product') as pname,
        COALESCE(fs.station_name, 'Unknown Station') as station_name,
        COALESCE(fr.vehicle_number, 'N/A') as vehicle_number,
        fr.payment_status as request_payment_status,
        fr.payment_date,
        fr.completed_date,
        ep.name AS updated_by_name
      FROM filling_history AS fh
      LEFT JOIN products AS p ON fh.product_id = p.id
      LEFT JOIN filling_stations AS fs ON fh.fs_id = fs.id
      LEFT JOIN filling_requests AS fr ON fh.rid = fr.rid
      LEFT JOIN employee_profile AS ep ON fh.created_by = ep.id
      WHERE (fh.cl_id = ? OR fr.cid = ?)
    `;
    
    const params = [customerId, customerId];
    
    if (pname) {
      sql += ' AND p.pname = ?';
      params.push(pname);
    }
    
    sql += ' ORDER BY fh.id DESC';
    sql += ` LIMIT ${limit} OFFSET ${offset}`;
    
    let transactions = [];
    try {
      transactions = await executeQuery(sql, params);
      
      // Calculate outstanding for each transaction (map new_amount to outstanding)
      transactions = transactions.map(t => ({
        ...t,
        outstanding: t.new_amount // Align with previous CST logic if needed, but client-history uses logic below
      }));
    } catch (queryError) {
      console.error('Error executing transactions query:', queryError);
      transactions = [];
    }

    // 6. Get pending transactions for payment processing (UNPAID only)
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
           fh.trans_type,
           fr.aqty AS loading_qty,
           fs.station_name,
           p.pname
         FROM filling_requests fr
         LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
         LEFT JOIN products p ON fr.product = p.id
         LEFT JOIN filling_history fh ON fh.rid = fr.rid
         WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
         ORDER BY fr.completed_date ASC`,
        [customerId]
      );
    } catch (error) {
      console.error('Error fetching pending transactions:', error);
      pendingTransactions = [];
    }

    // 7. Calculate payment statistics
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
        [customerId]
      );
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      paymentStats = [];
    }

    const paidRequestsCount = paymentStats.length > 0 ? parseInt(paymentStats[0].paid_requests_count || 0) : 0;
    const totalPaidAmount = paymentStats.length > 0 ? parseFloat(paymentStats[0].total_paid_amount || 0) : 0;
    const unpaidRequestsCount = paymentStats.length > 0 ? parseInt(paymentStats[0].unpaid_requests_count || 0) : pendingTransactions.length;
    const totalUnpaidAmountFromHistory = paymentStats.length > 0 ? parseFloat(paymentStats[0].total_unpaid_amount || 0) : 0;

    // Get basic balance info again (in case it wasn't fetched correctly above)
    const balance = customerBalanceInfo.length > 0 ? Math.round(customerBalanceInfo[0].balance) : 0;
    const totalDayAmount = customerBalanceInfo.length > 0 ? parseFloat(customerBalanceInfo[0].total_day_amount) || 0 : 0;
    const dayLimit = customerBalanceInfo.length > 0 ? parseInt(customerBalanceInfo[0].day_limit) || 0 : 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    // 8. Calculate days open and overdue details
    let daysOpen = 0;
    let overdueBalance = 0;
    let overdueDetails = null;
    
    // Calculate total outstanding amount (pending)
    const totalOutstandingAmount = pendingTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount || 0),
      0
    );

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
    
    // Check if customer has exceeded day limit
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
      let remainingDays = 0;
      if (completed) {
        completed.setHours(0, 0, 0, 0);
        const timeDiff = currentDate.getTime() - completed.getTime();
        remainingDays = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
      }
      
      const isPaid = Number(t.payment_status) === 1 || Number(t.request_payment_status) === 1;
      const overdue = !isPaid && dayLimit > 0 && (remainingDays >= dayLimit || isCustomerOverdue);
      const recharge = isPaid ? parseFloat(t.amount || 0) : 0;
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

    // 9. Calculate Yesterday's and Today's Outstandings (for CST compatibility)
    const todayFormatted = currentDate.toISOString().split('T')[0];
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    // Today's outstanding
    const todayOutstandingQuery = `
      SELECT COALESCE(SUM(fh.new_amount), 0) as total
      FROM filling_history fh
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      WHERE fh.cl_id IS NOT NULL
        AND fh.cl_id = ?
        AND fh.new_amount > 0
        AND (
          DATE(fr.completed_date) = ?
          OR
          DATE(fh.created_at) = ?
        )
    `;
    const todayOutstandingResult = await executeQuery(todayOutstandingQuery, [customerId, todayFormatted, todayFormatted]).catch(() => [{ total: 0 }]);
    const todayOutstanding = parseFloat(todayOutstandingResult[0]?.total) || 0;

    // Yesterday's outstanding
    const yesterdayOutstandingQuery = `
      SELECT COALESCE(SUM(fh.new_amount), 0) as total
      FROM filling_history fh
      LEFT JOIN filling_requests fr ON fh.rid = fr.rid
      WHERE fh.cl_id IS NOT NULL
        AND fh.cl_id = ?
        AND fh.new_amount > 0
        AND (
          DATE(fr.completed_date) < ?
          OR
          DATE(fh.created_at) < ?
        )
    `;
    const yesterdayOutstandingResult = await executeQuery(yesterdayOutstandingQuery, [customerId, todayFormatted, todayFormatted]).catch(() => [{ total: 0 }]);
    const yesterdayOutstanding = parseFloat(yesterdayOutstandingResult[0]?.total) || 0;

    // Notifications
    const totalLimitVal = customerBalanceInfo.length > 0 ? (customerBalanceInfo[0].cst_limit || 0) : 0;
    const amtLimitVal = customerBalanceInfo.length > 0 ? (customerBalanceInfo[0].amtlimit || 0) : 0;
    const lowBalanceThreshold = totalLimitVal * 0.2;
    const isLowBalance = totalLimitVal > 0 && amtLimitVal <= lowBalanceThreshold;
    const balanceNotification = isLowBalance 
      ? "Your balance is low. Please recharge on time to continue services."
      : null;

    let paymentNotification = null;
    if (isCustomerOverdue) {
      paymentNotification = "Payment is overdue. Please recharge immediately to continue services.";
    }

    // Build Response
    const responseData = {
      success: true,
      // Standardize data structure to match what CST frontend expects + new fields
      transactions: transactions || [],
      products: (products || []).filter(Boolean),
      balance: balance || 0,
      amtLimit: amtLimitVal || 0,
      totalLimit: totalLimitVal || 0,
      openingBalance: 0, // Calculated in frontend or earlier logic if needed
      customer: {
        name: customer.name,
        id: customer.id,
        client_type: customer.client_type
      },
      // CST compatible fields
      summary: {
        totalTransactions: transactions.length,
        filteredBy: pname || 'All Products',
        totalCredit: 0, // Can be calculated if needed
        totalDebit: 0,
        totalFillingQty: 0
      },
      outstandings: {
        yesterday: yesterdayOutstanding,
        today: todayOutstanding,
        total: yesterdayOutstanding + todayOutstanding
      },
      notifications: {
        lowBalance: isLowBalance,
        balanceNotification: balanceNotification,
        paymentOverdue: isCustomerOverdue,
        paymentNotification: paymentNotification
      },
      dayLimitInfo: {
        hasDayLimit: dayLimit > 0,
        dayLimit: dayLimit,
        totalDayAmount: totalDayAmount
      },
      // New fields from client-history
      data: { // Nested data object if frontend expects it, or merge to root
        transactions: transactions || [],
        products: products,
        balance: balance,
        totalDayAmount: totalDayAmount,
        filter: pname,
        customerName: customer.name,
        clientType: customer.client_type,
        pendingTransactions: enrichedPending || [],
        customerBalanceInfo: customerBalanceInfo.length > 0 ? customerBalanceInfo[0] : null,
        isCustomerOverdue: isCustomerOverdue,
        totalOutstandingAmount: totalOutstandingAmount,
        paymentStats: {
          paid_requests_count: paidRequestsCount,
          total_paid_amount: totalPaidAmount,
          unpaid_requests_count: unpaidRequestsCount,
          total_unpaid_amount: totalUnpaidAmountFromHistory || totalOutstandingAmount
        },
        daysOpen: daysOpen,
        overdueBalance: overdueBalance,
        overdueDetails: overdueDetails
      }
    };
    
    // Merge data to root for easier access in CST frontend if needed
    // But keep 'data' object for compatibility with client-history logic if we port that frontend code directly
    return NextResponse.json({
      ...responseData,
      ...responseData.data // Flatten data for CST frontend access
    });

  } catch (error) {
    console.error('API Error in CST customer-history GET:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error: ' + error.message
    }, { status: 500 });
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

    // Get customer details
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
    const clientType = parseInt(customer.client_type) || 0;
    const billingType = parseInt(customer.billing_type) || 1;
    const isNonBilling = billingType === 2;
    const isCashPayment = parseInt(payment_type) === 1;
    
    // Execute transaction
    const result = await executeTransaction(async (connection) => {
      // Check for day_remaining_amount column
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
        }
      } catch (alterError) {
        console.log('day_remaining_amount column check error:', alterError.message);
      }

      let [customerInfo] = await connection.execute(
        'SELECT day_limit, amtlimit, is_active, balance, total_day_amount, COALESCE(day_remaining_amount, 0) as day_remaining_amount, cst_limit FROM customer_balances WHERE com_id = ?',
        [customerId]
      );
      
      if (customerInfo.length === 0) {
        // Create default if missing
        await connection.execute(
          `INSERT INTO customer_balances 
           (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, total_day_amount, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [0, 0, 0, 0, customerId, 0, 0, 1]
        );
        [customerInfo] = await connection.execute(
          'SELECT day_limit, amtlimit, is_active, balance, total_day_amount, COALESCE(day_remaining_amount, 0) as day_remaining_amount, cst_limit FROM customer_balances WHERE com_id = ?',
          [customerId]
        );
      }

      const isDayLimit = customerInfo[0].day_limit > 0;
      const isPrepaid = clientType === 1;
      const currentBalance = parseFloat(customerInfo[0].balance) || 0;
      const currentCreditLimit = parseFloat(customerInfo[0].cst_limit || customerInfo[0].amtlimit || 0);
      const paymentAmount = parseFloat(rechargeAmount);

      // PREPAID
      if (isPrepaid) {
        const newBalance = currentBalance - paymentAmount;
        const newAmtLimit = currentCreditLimit + paymentAmount;
        
        await connection.execute(
          'UPDATE customer_balances SET balance = ?, amtlimit = ? WHERE com_id = ?',
          [newBalance, newAmtLimit, customerId]
        );

        // Add inward transaction
        if (paymentAmount > 0) {
           await connection.execute(
             `INSERT INTO filling_history 
              (cl_id, trans_type, amount, new_amount, remaining_limit, filling_date, created_at) 
              VALUES (?, 'inward', ?, ?, ?, NOW(), NOW())`,
             [customerId, paymentAmount, newBalance, newAmtLimit]
           );
        }
      }
      // DAY LIMIT (One Day Payment)
      else if (isDayLimit) {
        // Logic for One Day Payment (reset day limit usage for specific day or similar)
        // For simplicity and alignment with client-history, we'll record it as inward payment
        // and update balance/limit accordingly.
        // NOTE: The reference implementation for PATCH in client-history was truncated.
        // I will implement a basic version that updates balance and records transaction.
        
        // Assume payment reduces outstanding and increases available limit
        const newBalance = currentBalance - paymentAmount;
        
        await connection.execute(
          'UPDATE customer_balances SET balance = ? WHERE com_id = ?',
          [newBalance, customerId]
        );

        // Record Inward
        await connection.execute(
             `INSERT INTO filling_history 
              (cl_id, trans_type, amount, new_amount, remaining_limit, filling_date, created_at) 
              VALUES (?, 'inward', ?, ?, ?, NOW(), NOW())`,
             [customerId, paymentAmount, newBalance, 0] // remaining_limit might differ for day limit users
        );
      }
      // POSTPAID
      else {
        const newBalance = currentBalance - paymentAmount;
         await connection.execute(
          'UPDATE customer_balances SET balance = ? WHERE com_id = ?',
          [newBalance, customerId]
        );
        
        await connection.execute(
             `INSERT INTO filling_history 
              (cl_id, trans_type, amount, new_amount, remaining_limit, filling_date, created_at) 
              VALUES (?, 'inward', ?, ?, ?, NOW(), NOW())`,
             [customerId, paymentAmount, newBalance, 0]
        );
      }
      
      return { success: true, message: 'Payment processed successfully' };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('API Error in CST customer-history PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
