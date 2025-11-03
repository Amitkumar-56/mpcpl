// src/app/api/customers/recharge-request/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { 
    status: 200,
    headers: corsHeaders 
  });
}

export async function POST(request) {
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type must be application/json' },
        { status: 400, headers: corsHeaders }
      );
    }

    const formData = await request.json();
    
    console.log('Received form data:', formData);

    const {
      amount,
      payment_date,
      payment_type,
      transaction_id,
      utr_no,
      comments,
      com_id
    } = formData;

    // Validate required fields
    if (!com_id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Amount must be greater than 0.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get customer type first
    const customerTypeResult = await executeQuery(
      'SELECT client_type FROM customers WHERE id = ?',
      [com_id]
    );

    if (customerTypeResult.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const clientType = customerTypeResult[0].client_type;
    console.log('Customer client type:', clientType);

    let resultData = {};

    try {
      if (clientType === "3") {
        // Day Limit Customer - Payment amount = Future requests capacity
        resultData = await handleDayLimitPayment(com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments);
      } else {
        // Regular Customer (Prepaid/Postpaid)
        resultData = await handleRegularRecharge(com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments);
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Payment processed successfully',
          data: resultData
        },
        { status: 200, headers: corsHeaders }
      );

    } catch (dbError) {
      console.error('Database processing error:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error: ' + (dbError.message || 'Failed to process payment request'),
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process payment request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Day Limit Payment Handler - Payment amount determines future request capacity
async function handleDayLimitPayment(customerId, amount, paymentDate, paymentType, transactionId, utrNo, comments) {
  // Get current customer balance and day limit info - ONLY EXISTING COLUMNS
  const [balanceResult, pendingRequests] = await Promise.all([
    executeQuery(
      `SELECT balance, day_limit_expiry, day_limit, day_amount, total_day_amount
       FROM customer_balances 
       WHERE com_id = ?`,
      [customerId]
    ),
    executeQuery(
      `SELECT id, totalamt as amount, completed_date
       FROM filling_requests 
       WHERE cid = ? AND payment_status = 0 AND status = 'Completed'
       ORDER BY completed_date ASC`,
      [customerId]
    )
  ]);

  let currentBalance, currentDayAmount, currentTotalDayAmount, dayLimit;

  if (balanceResult.length === 0) {
    // Create balance record if doesn't exist - ONLY EXISTING COLUMNS
    await executeQuery(
      `INSERT INTO customer_balances (com_id, balance, day_amount, total_day_amount, day_limit) 
       VALUES (?, ?, ?, ?, ?)`,
      [customerId, 0, 0, 0, 30]
    );
    
    currentBalance = 0;
    currentDayAmount = 0;
    currentTotalDayAmount = 0;
    dayLimit = 30;
  } else {
    currentBalance = parseFloat(balanceResult[0].balance) || 0;
    currentDayAmount = parseFloat(balanceResult[0].day_amount) || 0;
    currentTotalDayAmount = parseFloat(balanceResult[0].total_day_amount) || 0;
    dayLimit = balanceResult[0].day_limit || 30;
  }

  console.log('Current balance:', currentBalance);
  console.log('Payment amount:', amount);
  console.log('Current day amount:', currentDayAmount);
  console.log('Current total day amount:', currentTotalDayAmount);
  console.log('Pending requests:', pendingRequests.length);

  // Calculate new values after payment
  const paymentAmount = parseFloat(amount);
  const newBalance = currentBalance - paymentAmount;
  const newTotalDayAmount = currentTotalDayAmount + paymentAmount;
  
  console.log('New balance after payment:', newBalance);
  console.log('New total day amount:', newTotalDayAmount);

  let paidRequests = [];
  let clearedPendingAmount = 0;

  // First, clear pending requests with the payment amount
  let remainingAmount = paymentAmount;
  
  for (const request of pendingRequests) {
    if (remainingAmount <= 0) break;
    
    const requestAmount = parseFloat(request.amount);
    
    if (remainingAmount >= requestAmount) {
      // Pay this pending request
      paidRequests.push(request.id);
      clearedPendingAmount += requestAmount;
      remainingAmount -= requestAmount;
    } else {
      break;
    }
  }

  console.log('Paid pending requests:', paidRequests.length);
  console.log('Amount used for pending:', clearedPendingAmount);
  console.log('Remaining amount for new requests:', remainingAmount);

  // Update customer_balances - ONLY EXISTING COLUMNS
  await executeQuery(
    `UPDATE customer_balances 
     SET balance = ?, 
         total_day_amount = ?,
         day_amount = day_amount + ?,
         updated_at = NOW()
     WHERE com_id = ?`,
    [newBalance, newTotalDayAmount, paymentAmount, customerId]
  );

  // Mark paid pending requests as paid
  if (paidRequests.length > 0) {
    await executeQuery(
      `UPDATE filling_requests 
       SET payment_status = 1, payment_date = ? 
       WHERE id IN (${paidRequests.map(() => '?').join(',')})`,
      [paymentDate, ...paidRequests]
    );
  }

  // Insert into filling_history - CORRECTED for Day Limit Customer (without comments column)
  const paymentTypeText = getPaymentTypeText(paymentType);
  
  await executeQuery(
    `INSERT INTO filling_history (
      trans_type, credit, credit_date, old_amount, new_amount, 
      remaining_day_limit, cl_id, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'inward', // trans_type
      amount, // credit
      paymentDate, // credit_date
      currentBalance, // old_amount
      newBalance, // new_amount
      dayLimit, // remaining_day_limit (using day_limit as remaining limit)
      customerId, // cl_id
      1 // created_by
    ]
  );

  // Insert into recharge_wallets table - Handle NULL values properly
  const paymentTypeTextForDB = getPaymentTypeForDB(paymentType);
  const safeUtrNo = utrNo && utrNo.trim() !== '' ? utrNo : '';
  const safeTransactionId = transactionId && transactionId.trim() !== '' ? transactionId : '';
  const safeComments = comments && comments.trim() !== '' ? comments : '';

  await executeQuery(
    `INSERT INTO recharge_wallets (com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customerId, amount, paymentDate, paymentTypeTextForDB, safeTransactionId, safeUtrNo, safeComments, 'Approved']
  );

  // Insert into recharge_requests table - Handle NULL values properly
  await executeQuery(
    `INSERT INTO recharge_requests (cid, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customerId, amount, paymentDate, paymentTypeTextForDB, safeTransactionId, safeUtrNo, safeComments, 'Approved']
  );

  // Record in day_limit_history - Create table if needed or skip if doesn't exist
  try {
    await executeQuery(
      `INSERT INTO day_limit_history (com_id, payment_amount, requests_cleared, cleared_amount, remaining_capacity, payment_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customerId, amount, paidRequests.length, clearedPendingAmount, remainingAmount, paymentDate]
    );
  } catch (error) {
    console.log('day_limit_history table might not exist, skipping...');
  }

  return {
    paid_requests: paidRequests.length,
    total_pending_requests: pendingRequests.length,
    cleared_pending_amount: clearedPendingAmount,
    remaining_capacity: remainingAmount,
    old_balance: currentBalance,
    new_balance: newBalance,
    old_total_day_amount: currentTotalDayAmount,
    new_total_day_amount: newTotalDayAmount,
    payment_amount: paymentAmount,
    future_request_capacity: remainingAmount,
    message: `Payment successful! 
             - Cleared ${paidRequests.length} pending requests (₹${clearedPendingAmount})
             - Can make new requests worth: ₹${remainingAmount}
             - Balance: ₹${currentBalance} → ₹${newBalance}
             - Total recharged: ₹${newTotalDayAmount}`
  };
}

// Regular Customer Recharge Handler
async function handleRegularRecharge(customerId, amount, paymentDate, paymentType, transactionId, utrNo, comments) {
  // Fetch current balance - ONLY EXISTING COLUMNS
  const balanceResult = await executeQuery(
    'SELECT amtlimit, balance FROM customer_balances WHERE com_id = ?',
    [customerId]
  );
  
  let oldBalance, oldLimit;

  if (balanceResult.length === 0) {
    // Create balance record if doesn't exist
    await executeQuery(
      'INSERT INTO customer_balances (com_id, balance, amtlimit) VALUES (?, ?, ?)',
      [customerId, 0, 0]
    );
    
    oldBalance = 0;
    oldLimit = 0;
  } else {
    oldBalance = parseFloat(balanceResult[0].balance) || 0;
    oldLimit = parseFloat(balanceResult[0].amtlimit) || 0;
  }
  
  const paymentAmount = parseFloat(amount);
  const new_limit = oldLimit + paymentAmount;
  const new_balance = oldBalance - paymentAmount;

  console.log('Regular customer recharge:');
  console.log('Old balance:', oldBalance, 'Old limit:', oldLimit);
  console.log('New balance:', new_balance, 'New limit:', new_limit);

  // Update customer_balances
  await executeQuery(
    `UPDATE customer_balances 
     SET amtlimit = ?, balance = ?, updated_at = NOW()
     WHERE com_id = ?`,
    [new_limit, new_balance, customerId]
  );

  // Insert into filling_history - CORRECTED for Regular Customer (without comments column)
  const paymentTypeText = getPaymentTypeText(paymentType);
  
  await executeQuery(
    `INSERT INTO filling_history (
      trans_type, credit, credit_date, old_amount, new_amount, 
      remaining_limit, cl_id, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'inward', // trans_type
      amount, // credit
      paymentDate, // credit_date
      oldBalance, // old_amount
      new_balance, // new_amount
      new_limit, // remaining_limit
      customerId, // cl_id
      1 // created_by
    ]
  );

  // Insert into limit_history
  await executeQuery(
    `INSERT INTO limit_history (com_id, old_limit, change_amount, new_limit, changed_by, change_date) 
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [customerId, oldLimit, amount, new_limit, 1]
  );

  // Insert into recharge_wallets table - Handle NULL values properly
  const paymentTypeTextForDB = getPaymentTypeForDB(paymentType);
  const safeUtrNo = utrNo && utrNo.trim() !== '' ? utrNo : '';
  const safeTransactionId = transactionId && transactionId.trim() !== '' ? transactionId : '';
  const safeComments = comments && comments.trim() !== '' ? comments : '';

  await executeQuery(
    `INSERT INTO recharge_wallets (com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customerId, amount, paymentDate, paymentTypeTextForDB, safeTransactionId, safeUtrNo, safeComments, 'Approved']
  );

  // Insert into recharge_requests table - Handle NULL values properly
  await executeQuery(
    `INSERT INTO recharge_requests (cid, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customerId, amount, paymentDate, paymentTypeTextForDB, safeTransactionId, safeUtrNo, safeComments, 'Approved']
  );

  return {
    old_balance: oldBalance,
    new_balance: new_balance,
    old_limit: oldLimit,
    new_limit: new_limit,
    message: `Recharge successful! 
             - Balance: ₹${oldBalance} → ₹${new_balance}
             - Limit: ₹${oldLimit} → ₹${new_limit}`
  };
}

// Helper function to get payment type text for display
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

// Helper function to get payment type for database (text values)
function getPaymentTypeForDB(paymentType) {
  switch(paymentType) {
    case '1': return 'Cash';
    case '2': return 'RTGS';
    case '3': return 'NEFT';
    case '4': return 'UPI';
    case '5': return 'CHEQUE';
    default: return 'Unknown';
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    console.log('GET request received for customer ID:', id);

    if (!id) {
      console.log('No customer ID provided');
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate customer ID
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      console.log('Invalid customer ID:', id);
      return NextResponse.json(
        { error: 'Invalid Customer ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Fetching data for customer ID:', customerId);

    // Fetch customer details first to check if customer exists
    const customerCheck = await executeQuery(
      'SELECT id, name, phone, client_type FROM customers WHERE id = ?',
      [customerId]
    );

    console.log('Customer check result:', customerCheck);

    if (customerCheck.length === 0) {
      console.log('Customer not found with ID:', customerId);
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const customer = customerCheck[0];
    console.log('Customer found:', customer);

    // Fetch customer details, balance, and pending requests - ONLY EXISTING COLUMNS
    const [balanceResult, pendingResult] = await Promise.all([
      executeQuery(
        `SELECT balance, amtlimit, day_amount, total_day_amount, day_limit, day_limit_expiry, is_active
         FROM customer_balances 
         WHERE com_id = ?`,
        [customerId]
      ),
      executeQuery(
        `SELECT 
           COUNT(*) as pending_count,
           COALESCE(SUM(totalamt), 0) as pending_amount,
           MIN(totalamt) as min_request_amount,
           MAX(totalamt) as max_request_amount
         FROM filling_requests 
         WHERE cid = ? 
         AND status = 'Completed' 
         AND payment_status = 0`,
        [customerId]
      )
    ]);

    console.log('Balance result:', balanceResult);
    console.log('Pending result:', pendingResult);

    const balance = balanceResult.length > 0 ? balanceResult[0] : {
      balance: 0,
      amtlimit: 0,
      day_amount: 0,
      total_day_amount: 0,
      day_limit: 30,
      day_limit_expiry: null,
      is_active: 0
    };

    const pending = pendingResult.length > 0 ? pendingResult[0] : {
      pending_count: 0,
      pending_amount: 0,
      min_request_amount: 0,
      max_request_amount: 0
    };

    const responseData = {
      success: true,
      customer: {
        name: customer.name || 'No name found',
        phone: customer.phone || 'No phone found',
        client_type: customer.client_type,
        day_limit: balance.day_limit || 0,
        day_limit_expiry: balance.day_limit_expiry,
        is_active: balance.is_active,
        day_amount: balance.day_amount || 0,
        total_day_amount: balance.total_day_amount || 0
      },
      balance: {
        current_balance: Number(balance.balance) || 0,
        current_limit: Number(balance.amtlimit) || 0,
        day_amount: Number(balance.day_amount) || 0,
        total_day_amount: Number(balance.total_day_amount) || 0
      },
      pending: {
        request_count: Number(pending.pending_count) || 0,
        total_amount: Number(pending.pending_amount) || 0,
        min_amount: Number(pending.min_request_amount) || 0,
        max_amount: Number(pending.max_request_amount) || 0
      }
    };

    console.log('Sending response:', responseData);

    return NextResponse.json(responseData, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error fetching customer data:', error);
    console.error('Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customer data: ' + error.message,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}