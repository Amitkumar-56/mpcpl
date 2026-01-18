import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// Helper function to get payment type text
function getPaymentTypeText(paymentType) {
  switch(paymentType) {
    case '1': return 'Cash';
    case '2': return 'RTGS';
    case '3': return 'NEFT';
    case '4': return 'UPI';
    case '5': return 'CHEQUE';
    default: return 'Unknown';
  }
}

// ✅ GET: Customer data fetch
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Check if day_remaining_amount column exists
    try {
      const columns = await executeQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'customer_balances' 
        AND COLUMN_NAME = 'day_remaining_amount'
      `);
      
      if (columns.length === 0) {
        await executeQuery(`
          ALTER TABLE customer_balances 
          ADD COLUMN day_remaining_amount DECIMAL(10,2) DEFAULT 0.00
        `);
        console.log('Added day_remaining_amount column to customer_balances');
      }
    } catch (alterError) {
      console.log('day_remaining_amount column check:', alterError.message);
    }

    // Fetch customer with balance info
    const customerRows = await executeQuery(
      `SELECT c.id, c.name, c.phone, c.client_type, c.billing_type,
              cb.day_limit, cb.amtlimit, cb.balance, 
              COALESCE(cb.total_day_amount, 0) as total_day_amount, 
              COALESCE(cb.day_remaining_amount, 0) as day_remaining_amount,
              cb.is_active
       FROM customers c
       LEFT JOIN customer_balances cb ON c.id = cb.com_id
       WHERE c.id = ?`,
      [parseInt(id)]
    );

    if (!customerRows || customerRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerRows[0];

    // Get individual pending requests
    const pendingRequests = await executeQuery(
      `SELECT 
         fr.id,
         fr.rid,
         fr.vehicle_number,
         fr.completed_date,
         DATE(fr.completed_date) AS day_date,
         COALESCE(fr.totalamt, fr.price * fr.aqty) AS amount,
         fr.aqty,
         fr.price,
         fr.payment_status,
         p.pname AS product_name,
         fs.station_name
       FROM filling_requests fr
       LEFT JOIN products p ON fr.product = p.id
       LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
       ORDER BY fr.completed_date ASC`,
      [parseInt(id)]
    );

    // Group by day for day-wise breakdown
    const dayWiseMap = {};
    pendingRequests.forEach(req => {
      const dayDate = req.day_date;
      if (!dayWiseMap[dayDate]) {
        dayWiseMap[dayDate] = {
          day_date: dayDate,
          transaction_count: 0,
          day_total: 0,
          requests: []
        };
      }
      dayWiseMap[dayDate].transaction_count++;
      dayWiseMap[dayDate].day_total += parseFloat(req.amount || 0);
      dayWiseMap[dayDate].requests.push({
        id: req.id,
        rid: req.rid,
        vehicle_number: req.vehicle_number,
        completed_date: req.completed_date,
        amount: parseFloat(req.amount || 0),
        payment_status: req.payment_status,
        product_name: req.product_name,
        station_name: req.station_name
      });
    });
    
    const pendingRows = Object.values(dayWiseMap).sort((a, b) => 
      new Date(a.day_date) - new Date(b.day_date)
    );

    // Total unpaid amount
    const totalUnpaid = pendingRequests.reduce((sum, req) => sum + parseFloat(req.amount || 0), 0);

    // Calculate payment days pending
    let paymentDaysPending = 0;
    const oldestUnpaidRows = await executeQuery(
      `SELECT MIN(DATE(fr.completed_date)) AS oldest_date
       FROM filling_requests fr
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0`,
      [parseInt(id)]
    );
    const oldestDate = oldestUnpaidRows[0]?.oldest_date;
    if (oldestDate) {
      const start = new Date(oldestDate);
      start.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = now.getTime() - start.getTime();
      paymentDaysPending = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      customer: {
        ...customer,
        balance: customer.balance || 0,
        total_day_amount: customer.total_day_amount || 0,
        day_remaining_amount: customer.day_remaining_amount || 0
      },
      balance: {
        current_balance: customer.balance || 0,
        total_day_amount: customer.total_day_amount || 0,
        day_remaining_amount: customer.day_remaining_amount || 0
      },
      pending: {
        total_amount: totalUnpaid,
        payment_days_pending: paymentDaysPending,
        day_wise_breakdown: pendingRows || [],
        request_count: pendingRequests.length,
        individual_requests: pendingRequests || []
      }
    });
  } catch (error) {
    console.error("Recharge request GET API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ✅ POST: Process recharge/payment for ALL CUSTOMER TYPES
// ✅ POST: Process recharge/payment for ALL CUSTOMER TYPES
export async function POST(request) {
  let connection;
  try {
    const body = await request.json();
    const { 
      customerId, 
      amount, 
      paymentType = '1', 
      transactionId = '', 
      utrNo = '', 
      comments = '', 
      paymentDate = new Date().toISOString().split('T')[0] 
    } = body;

    console.log('Processing recharge for customer:', customerId, 'Amount:', amount, 'Payment Type:', paymentType);

    if (!customerId || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid customer ID and amount are required" },
        { status: 400 }
      );
    }

    // Get database connection for transaction
    const pool = require('@/lib/db');
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Get customer details
    const [customerRows] = await connection.query(
      `SELECT c.id, c.client_type, c.name, c.billing_type,
              cb.balance, cb.amtlimit, cb.total_day_amount, cb.day_remaining_amount,
              cb.day_limit
       FROM customers c
       LEFT JOIN customer_balances cb ON c.id = cb.com_id
       WHERE c.id = ?`,
      [parseInt(customerId)]
    );

    if (!customerRows || customerRows.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerRows[0];
    const clientType = customer.client_type;
    const oldBalance = parseFloat(customer.balance || 0);
    const oldAmtLimit = parseFloat(customer.amtlimit || 0);
    const currentTotalDayAmount = parseFloat(customer.total_day_amount || 0);
    const currentDayRemainingAmount = parseFloat(customer.day_remaining_amount || 0);
    
    const rechargeAmount = parseFloat(amount);
    const paymentTypeText = getPaymentTypeText(paymentType);
    const safeTransactionId = transactionId || '';
    const safeUtrNo = utrNo || transactionId || '';
    const safeComments = comments || '';
    const safePaymentDate = paymentDate || new Date().toISOString().split('T')[0];
    
    console.log('Customer Details:', {
      clientType,
      oldBalance,
      oldAmtLimit,
      rechargeAmount,
      paymentType: paymentTypeText
    });

    // Variables for response
    let paidRequests = [];
    let pendingRequests = [];
    let amountPaid = 0;
    let invoicesPaid = 0;
    let daysCleared = 0;
    let newBalance = oldBalance;
    let newAmtLimit = oldAmtLimit;
    let newTotalDayAmount = currentTotalDayAmount;
    let newDayRemainingAmount = currentDayRemainingAmount;

    // ============================================
    // ✅ CASH PAYMENT: Update cash_balance table (ONLY for cash payments)
    // ============================================
    if (paymentType === "1") { // ONLY for Cash payment
      try {
        console.log('💰 Updating cash_balance for CASH payment');
        
        // Check if cash_balance table exists
        const [cashBalanceRows] = await connection.query(
          `SELECT id, balance FROM cash_balance ORDER BY id DESC LIMIT 1`
        );
        
        let oldCashBalance = 0;
        let cashBalanceId = null;
        
        if (cashBalanceRows && cashBalanceRows.length > 0) {
          oldCashBalance = parseFloat(cashBalanceRows[0].balance || 0);
          cashBalanceId = cashBalanceRows[0].id;
          
          // Update existing cash balance (ADD amount)
          const [updateResult] = await connection.query(
            `UPDATE cash_balance 
             SET balance = balance + ?, 
                 updated_at = NOW()
             WHERE id = ?`,
            [rechargeAmount, cashBalanceId]
          );
          
          const newCashBalance = oldCashBalance + rechargeAmount;
          
          console.log('💰 Cash balance updated:', {
            id: cashBalanceId,
            oldCashBalance: oldCashBalance,
            newCashBalance: newCashBalance,
            addedAmount: rechargeAmount,
            affectedRows: updateResult.affectedRows
          });
          
          // Insert cash transaction record
          try {
            await connection.query(
              `INSERT INTO cash_transactions 
               (amount, transaction_type, description, customer_id, created_at) 
               VALUES (?, 'credit', 'Recharge from customer: ${customer.name}', ?, NOW())`,
              [rechargeAmount, parseInt(customerId)]
            );
          } catch (cashTransError) {
            console.log('Cash transaction log note:', cashTransError.message);
          }
          
        } else {
          // Insert new cash balance record
          const [insertResult] = await connection.query(
            `INSERT INTO cash_balance (balance, updated_at) 
             VALUES (?, NOW())`,
            [rechargeAmount]
          );
          cashBalanceId = insertResult.insertId;
          
          console.log('💰 New cash balance record created:', {
            insertId: cashBalanceId,
            balance: rechargeAmount
          });
        }
        
      } catch (cashError) {
        console.error('❌ Cash balance update error:', cashError);
        // Don't fail transaction - just log error
      }
    } else {
      console.log(`📊 Payment type is ${paymentTypeText} (${paymentType}), skipping cash_balance update`);
    }

    // ============================================
    // ✅ COMMON: Insert into recharge_wallets and recharge_requests for ALL PAYMENT TYPES
    // ============================================
    
    // Insert into recharge_wallets for ALL payment types
    try {
      const [walletResult] = await connection.query(
        `INSERT INTO recharge_wallets 
         (com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`,
        [parseInt(customerId), rechargeAmount, safePaymentDate, paymentTypeText, safeTransactionId, safeUtrNo, safeComments]
      );
      console.log(`✅ Inserted into recharge_wallets, ID: ${walletResult.insertId}, Payment: ${paymentTypeText}, Amount: ₹${rechargeAmount}`);
    } catch (walletError) {
      console.error('❌ recharge_wallets insert error:', walletError);
      // Don't rollback - continue with transaction
    }
    
    // Insert into recharge_requests for ALL payment types
    try {
      const [requestResult] = await connection.query(
        `INSERT INTO recharge_requests 
         (cid, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`,
        [parseInt(customerId), rechargeAmount, safePaymentDate, paymentTypeText, safeTransactionId, safeUtrNo, safeComments]
      );
      console.log(`✅ Inserted into recharge_requests, ID: ${requestResult.insertId}, Payment: ${paymentTypeText}, Amount: ₹${rechargeAmount}`);
    } catch (requestError) {
      console.error('❌ recharge_requests insert error:', requestError);
      // Don't rollback - continue with transaction
    }

    // ============================================
    // ✅ 1. PREPAID CUSTOMER (client_type = '1')
    // ============================================
    if (clientType === "1") {
      console.log('🔵 Processing PREPAID customer');
      
      // ✅ PREPAID RULES:
      // 1. balance से MINUS (payment received)
      // 2. amtlimit में ADD (credit limit increase)
      
      newBalance = oldBalance - rechargeAmount;
      newAmtLimit = oldAmtLimit + rechargeAmount;
      
      // Step 1: Update customer_balances
      await connection.query(
        `UPDATE customer_balances 
         SET balance = ?, 
             amtlimit = ?, 
             updated_at = NOW()
         WHERE com_id = ?`,
        [newBalance, newAmtLimit, parseInt(customerId)]
      );
      
      // Step 2: Insert into filling_history as INWARD transaction
      await connection.query(
        `INSERT INTO filling_history 
         (trans_type, credit, credit_date, old_amount, new_amount, remaining_limit, cl_id, created_by, payment_status) 
         VALUES ('inward', ?, ?, ?, ?, ?, ?, 1, 1)`,
        [rechargeAmount, safePaymentDate, oldBalance, newBalance, newAmtLimit, parseInt(customerId)]
      );
      
      // Step 3: Insert into limit_history
      await connection.query(
        `INSERT INTO limit_history 
         (com_id, old_limit, change_amount, new_limit, changed_by, change_date) 
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [parseInt(customerId), oldAmtLimit, rechargeAmount, newAmtLimit]
      );

      await connection.commit();
      connection.release();
      
      console.log(`✅ PREPAID recharge successful: ₹${rechargeAmount} via ${paymentTypeText}`);
      
      return NextResponse.json({
        success: true,
        message: `Prepaid wallet recharged with ₹${rechargeAmount.toFixed(2)} via ${paymentTypeText}`,
        customerType: 'prepaid',
        old_balance: oldBalance,
        new_balance: newBalance,
        old_limit: oldAmtLimit,
        new_limit: newAmtLimit,
        amountPaid: 0,
        invoicesPaid: 0,
        rechargeAmount,
        paymentType: paymentTypeText,
        transactionType: 'INWARD',
        cashUpdated: paymentType === "1" // Whether cash balance was updated
      });
    }

    // =============================================
    // ✅ 2. POSTPAID CUSTOMER (client_type = '2')
    // =============================================
    if (clientType === "2") {
      console.log('🟣 Processing POSTPAID customer');
      
      // ✅ POSTPAID RULES:
      // 1. balance से MINUS (payment received)
      // 2. amtlimit में ADD (credit limit increase)
      // 3. Pending invoices pay करेगा
      
      newBalance = oldBalance - rechargeAmount;
      newAmtLimit = oldAmtLimit + rechargeAmount;
      
      let remainingAmount = rechargeAmount;
      let amountUsedForInvoices = 0;
      
      // Get pending invoices
      const [pendingInvoices] = await connection.query(
        `SELECT id, rid, vehicle_number, completed_date,
                COALESCE(totalamt, price * aqty) AS amount,
                payment_status
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0
         ORDER BY completed_date ASC`,
        [parseInt(customerId)]
      );

      console.log('Found pending invoices:', pendingInvoices.length);
      
      // Pay invoices oldest first
      for (const invoice of pendingInvoices) {
        if (remainingAmount <= 0) break;
        
        const invoiceAmount = parseFloat(invoice.amount || 0);
        
        if (remainingAmount >= invoiceAmount) {
          // ✅ Can pay this invoice
          
          // Update filling_requests
          await connection.query(
            `UPDATE filling_requests 
             SET payment_status = 1, 
                 payment_date = NOW()
             WHERE id = ?`,
            [invoice.id]
          );
          
          // Update filling_history for this invoice
          try {
            await connection.query(
              `UPDATE filling_history 
               SET payment_status = 1
               WHERE rid = ?`,
              [invoice.rid]
            );
          } catch (historyError) {
            console.log('History update note:', historyError.message);
          }
          
          paidRequests.push({
            id: invoice.id,
            rid: invoice.rid,
            vehicle_number: invoice.vehicle_number,
            completed_date: invoice.completed_date,
            amount: invoiceAmount
          });
          
          amountUsedForInvoices += invoiceAmount;
          remainingAmount -= invoiceAmount;
          invoicesPaid++;
          
          console.log(`Paid invoice ${invoice.id}: ₹${invoiceAmount}`);
        } else {
          // Cannot pay this invoice
          pendingRequests.push({
            id: invoice.id,
            rid: invoice.rid,
            vehicle_number: invoice.vehicle_number,
            completed_date: invoice.completed_date,
            amount: invoiceAmount,
            required: invoiceAmount,
            available: remainingAmount
          });
        }
      }
      
      // Step 1: Update customer_balances
      await connection.query(
        `UPDATE customer_balances 
         SET balance = ?, 
             amtlimit = ?,
             updated_at = NOW()
         WHERE com_id = ?`,
        [newBalance, newAmtLimit, parseInt(customerId)]
      );
      
      // Step 2: Insert into filling_history as INWARD transaction
      await connection.query(
        `INSERT INTO filling_history 
         (trans_type, credit, credit_date, old_amount, new_amount, remaining_limit, cl_id, created_by, payment_status) 
         VALUES ('inward', ?, ?, ?, ?, ?, ?, 1, 1)`,
        [rechargeAmount, safePaymentDate, oldBalance, newBalance, newAmtLimit, parseInt(customerId)]
      );
      
      // Step 3: Insert into limit_history
      await connection.query(
        `INSERT INTO limit_history 
         (com_id, old_limit, change_amount, new_limit, changed_by, change_date) 
         VALUES (?, ?, ?, ?, 1, NOW())`,
        [parseInt(customerId), oldAmtLimit, rechargeAmount, newAmtLimit]
      );

      await connection.commit();
      connection.release();
      
      console.log(`✅ POSTPAID payment successful: ₹${rechargeAmount} via ${paymentTypeText}`);
      
      return NextResponse.json({
        success: true,
        message: `Postpaid payment of ₹${rechargeAmount.toFixed(2)} via ${paymentTypeText} processed`,
        customerType: 'postpaid',
        old_balance: oldBalance,
        new_balance: newBalance,
        old_limit: oldAmtLimit,
        new_limit: newAmtLimit,
        amountPaid: amountUsedForInvoices,
        invoicesPaid,
        remainingCredit: remainingAmount > 0 ? remainingAmount : 0,
        paidRequests: paidRequests.length > 0 ? paidRequests : undefined,
        pendingRequests: pendingRequests.length > 0 ? pendingRequests : undefined,
        rechargeAmount,
        paymentType: paymentTypeText,
        transactionType: 'INWARD',
        cashUpdated: paymentType === "1" // Whether cash balance was updated
      });
    }

    // ============================================
    // ✅ 3. DAY LIMIT CUSTOMER (client_type = '3')
    // ============================================
    if (clientType === "3") {
      console.log('🟡 Processing DAY LIMIT customer');
      
      // Day Limit logic
      newBalance = oldBalance - rechargeAmount;
      newTotalDayAmount = currentTotalDayAmount + rechargeAmount;
      newDayRemainingAmount = currentDayRemainingAmount + rechargeAmount;
      
      let remainingAmount = newDayRemainingAmount;
      
      // Get pending requests grouped by day
      const [pendingReqRows] = await connection.query(
        `SELECT id, rid, vehicle_number, completed_date,
                COALESCE(totalamt, price * aqty) AS amount,
                DATE(completed_date) as day_date,
                payment_status
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0
         ORDER BY completed_date ASC`,
        [parseInt(customerId)]
      );

      console.log('Found pending requests:', pendingReqRows.length);
      
      // Group by day
      const dayGroups = {};
      pendingReqRows.forEach(req => {
        const dayDate = req.day_date;
        if (!dayGroups[dayDate]) {
          dayGroups[dayDate] = [];
        }
        dayGroups[dayDate].push(req);
      });

      const sortedDays = Object.keys(dayGroups).sort();
      
      // Pay day by day
      for (const dayDate of sortedDays) {
        if (remainingAmount <= 0) break;
        
        const dayRequests = dayGroups[dayDate];
        const dayTotal = dayRequests.reduce((sum, req) => sum + parseFloat(req.amount || 0), 0);
        
        if (remainingAmount >= dayTotal) {
          daysCleared++;
          amountPaid += dayTotal;
          remainingAmount -= dayTotal;
          
          // Update each request in this day
          for (const req of dayRequests) {
            // Update filling_requests
            await connection.query(
              `UPDATE filling_requests 
               SET payment_status = 1, 
                   payment_date = NOW()
               WHERE id = ?`,
              [req.id]
            );
            
            // Update filling_history for this request
            try {
              await connection.query(
                `UPDATE filling_history 
                 SET payment_status = 1
                 WHERE rid = ?`,
                [req.rid]
              );
            } catch (historyError) {
              console.log('History update note:', historyError.message);
            }
            
            paidRequests.push({
              id: req.id,
              rid: req.rid,
              vehicle_number: req.vehicle_number,
              completed_date: req.completed_date,
              amount: parseFloat(req.amount || 0),
              day_date: req.day_date
            });
            
            invoicesPaid++;
          }
          
          console.log(`Paid day ${dayDate}: ₹${dayTotal}, Requests: ${dayRequests.length}`);
        } else {
          // Cannot pay for this day
          dayRequests.forEach(req => {
            pendingRequests.push({
              id: req.id,
              rid: req.rid,
              vehicle_number: req.vehicle_number,
              completed_date: req.completed_date,
              amount: parseFloat(req.amount || 0),
              day_date: req.day_date
            });
          });
          break;
        }
      }
      
      // Update remaining amount
      newDayRemainingAmount = remainingAmount;
      
      // Step 1: Update customer_balances
      await connection.query(
        `UPDATE customer_balances 
         SET balance = ?, 
             total_day_amount = ?, 
             day_remaining_amount = ?,
             updated_at = NOW()
         WHERE com_id = ?`,
        [newBalance, newTotalDayAmount, newDayRemainingAmount, parseInt(customerId)]
      );

      await connection.commit();
      connection.release();
      
      console.log(`✅ DAY LIMIT payment successful: ₹${rechargeAmount} via ${paymentTypeText}`);
      
      return NextResponse.json({
        success: true,
        message: `Day limit payment of ₹${rechargeAmount.toFixed(2)} via ${paymentTypeText} processed`,
        customerType: 'day_limit',
        old_balance: oldBalance,
        new_balance: newBalance,
        newTotalDayAmount,
        dayRemainingAmount: newDayRemainingAmount,
        amountPaid,
        invoicesPaid,
        daysCleared,
        paidRequests: paidRequests.length > 0 ? paidRequests : undefined,
        pendingRequests: pendingRequests.length > 0 ? pendingRequests : undefined,
        rechargeAmount,
        paymentType: paymentTypeText,
        cashUpdated: paymentType === "1" // Whether cash balance was updated
      });
    }

    // Unknown customer type
    await connection.rollback();
    connection.release();
    return NextResponse.json({
      success: false,
      error: `Unknown customer type: ${clientType}`
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Recharge POST API error:", error);
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}