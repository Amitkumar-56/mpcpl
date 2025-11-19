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

export async function GET(request) {
  try {
    console.log('GET request received');
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Customer ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate customer ID
    const customerId = parseInt(id);
    if (isNaN(customerId)) {
      return NextResponse.json(
        { error: 'Invalid Customer ID' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('Fetching data for customer ID:', customerId);

    // Fetch customer details
    const customerCheck = await executeQuery(
      'SELECT id, name, phone, client_type FROM customers WHERE id = ?',
      [customerId]
    );

    console.log('Customer check result:', customerCheck);

    if (customerCheck.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const customer = customerCheck[0];

    // Fetch balance and pending requests
    const [balanceResult, pendingResult] = await Promise.all([
      executeQuery(
        `SELECT balance, amtlimit, total_day_amount, day_limit
         FROM customer_balances 
         WHERE com_id = ?`,
        [customerId]
      ).catch(error => {
        console.log('Balance query error, using default:', error);
        return [];
      }),
      executeQuery(
        `SELECT 
           COUNT(*) as pending_count,
           COALESCE(SUM(totalamt), 0) as pending_amount
         FROM filling_requests 
         WHERE cid = ? 
         AND status = 'Completed' 
         AND payment_status = 0`,
        [customerId]
      ).catch(error => {
        console.log('Pending query error, using default:', error);
        return [{ pending_count: 0, pending_amount: 0 }];
      })
    ]);

    const balance = balanceResult.length > 0 ? balanceResult[0] : {
      balance: 0,
      amtlimit: 0,
      total_day_amount: 0,
      day_limit: 0
    };

    const pending = pendingResult.length > 0 ? pendingResult[0] : {
      pending_count: 0,
      pending_amount: 0
    };

    const responseData = {
      success: true,
      customer: {
        name: customer.name || 'No name found',
        phone: customer.phone || 'No phone found',
        client_type: customer.client_type,
        day_limit: balance.day_limit || 0
      },
      balance: {
        current_balance: Number(balance.balance) || 0,
        current_limit: Number(balance.amtlimit) || 0,
        total_day_amount: Number(balance.total_day_amount) || 0
      },
      pending: {
        request_count: Number(pending.pending_count) || 0,
        total_amount: Number(pending.pending_amount) || 0
      }
    };

    console.log('Sending response:', responseData);

    return NextResponse.json(responseData, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('GET Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch customer data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(request) {
  try {
    console.log('POST request received');
    
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

    // Get customer type
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

    if (clientType === "3") {
      resultData = await handleDayLimitPayment(com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments);
    } else {
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

  } catch (error) {
    console.error('POST Error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process payment request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Day Limit Payment Handler - SIMPLE PAYMENT TO DAYS CONVERSION
async function handleDayLimitPayment(customerId, amount, paymentDate, paymentType, transactionId, utrNo, comments) {
  console.log('🚀 Processing day limit payment for customer:', customerId);
  
  // Get current balance and day limit data
  const balanceResult = await executeQuery(
    `SELECT balance, total_day_amount, day_limit FROM customer_balances WHERE com_id = ?`,
    [customerId]
  );

  let currentBalance, currentTotalDayAmount, currentDayLimit;

  if (balanceResult.length === 0) {
    // Create balance record
    await executeQuery(
      `INSERT INTO customer_balances (com_id, balance, total_day_amount, day_limit) VALUES (?, ?, ?, ?)`,
      [customerId, 0, 0, 0]
    );
    currentBalance = 0;
    currentTotalDayAmount = 0;
    currentDayLimit = 0;
  } else {
    currentBalance = parseFloat(balanceResult[0].balance) || 0;
    currentTotalDayAmount = parseFloat(balanceResult[0].total_day_amount) || 0;
    currentDayLimit = parseInt(balanceResult[0].day_limit) || 0;
  }

  const paymentAmount = parseFloat(amount);
  
  // ✅ BALANCE से PAYMENT AMOUNT CUT होगा
  const newBalance = currentBalance - paymentAmount;
  // ✅ TOTAL_DAY_AMOUNT में PAYMENT AMOUNT ADD होगा
  const newTotalDayAmount = currentTotalDayAmount + paymentAmount;

  console.log('💰 Balance Update:', {
    currentBalance: currentBalance,
    paymentAmount: paymentAmount,
    newBalance: newBalance,
    currentTotalDayAmount: currentTotalDayAmount,
    newTotalDayAmount: newTotalDayAmount
  });

  // Step 1: Get pending requests
  const pendingRequests = await executeQuery(
    `SELECT id, totalamt as amount 
     FROM filling_requests 
     WHERE cid = ? AND payment_status = 0 AND status = 'Completed'
     ORDER BY completed_date ASC`,
    [customerId]
  );

  console.log('📋 Pending requests:', pendingRequests.length);

  let paidRequests = [];
  let clearedPendingAmount = 0;
  let remainingAmount = paymentAmount;

  // Step 2: Clear pending requests first
  for (const request of pendingRequests) {
    if (remainingAmount <= 0) break;
    
    const requestAmount = parseFloat(request.amount);
    
    if (remainingAmount >= requestAmount) {
      paidRequests.push(request.id);
      clearedPendingAmount += requestAmount;
      remainingAmount -= requestAmount;
    } else {
      break;
    }
  }

  console.log('✅ Pending Requests Cleared:', {
    paidRequests: paidRequests.length,
    clearedPendingAmount: clearedPendingAmount,
    remainingAmount: remainingAmount
  });

  // Mark paid requests as paid
  if (paidRequests.length > 0) {
    await executeQuery(
      `UPDATE filling_requests 
       SET payment_status = 1, payment_date = ? 
       WHERE id IN (${paidRequests.map(() => '?').join(',')})`,
      [paymentDate, ...paidRequests]
    );
  }

  // Step 3: ✅ SIMPLE DAY CALCULATION - Payment amount से direct days calculate करें
  let daysToAdd = 0;
  let amountUsedForDays = 0;
  let remainingChange = 0;
  
  // ✅ SIMPLE RULE: पूरा payment amount से days calculate करें
  // ₹1,00,000 = 1 day
  if (paymentAmount > 0) {
    daysToAdd = Math.floor(paymentAmount / 100000);
    amountUsedForDays = daysToAdd * 100000;
    remainingChange = paymentAmount - amountUsedForDays;
    
    console.log('📅 Days Calculation from Payment:', {
      paymentAmount: paymentAmount,
      daysToAdd: daysToAdd,
      amountUsedForDays: amountUsedForDays,
      remainingChange: remainingChange,
      perDayRate: 100000
    });
  }

  // Step 4: ✅ DAY_LIMIT में DAYS ADD होंगे
  let newDayLimit = currentDayLimit + daysToAdd;
  
  console.log('📈 Day Limit Update:', {
    currentDayLimit: currentDayLimit,
    daysAdded: daysToAdd,
    newDayLimit: newDayLimit
  });

  // Step 5: ✅ FINAL DATABASE UPDATE
  await executeQuery(
    `UPDATE customer_balances 
     SET balance = ?, total_day_amount = ?, day_limit = ?, updated_at = NOW()
     WHERE com_id = ?`,
    [newBalance, newTotalDayAmount, newDayLimit, customerId]
  );

  // Step 6: Insert into recharge tables
  const paymentTypeText = getPaymentTypeForDB(paymentType);
  const safeUtrNo = utrNo || '';
  const safeTransactionId = transactionId || '';
  const safeComments = comments || '';

  await executeQuery(
    `INSERT INTO recharge_wallets (com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`,
    [customerId, amount, paymentDate, paymentTypeText, safeTransactionId, safeUtrNo, safeComments]
  );

  await executeQuery(
    `INSERT INTO recharge_requests (cid, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`,
    [customerId, amount, paymentDate, paymentTypeText, safeTransactionId, safeUtrNo, safeComments]
  );

  // Step 7: Insert into filling_history
  await executeQuery(
    `INSERT INTO filling_history (trans_type, credit, credit_date, old_amount, new_amount, cl_id, created_by) 
     VALUES ('inward', ?, ?, ?, ?, ?, 1)`,
    [amount, paymentDate, currentBalance, newBalance, customerId]
  );

  const result = {
    paid_requests: paidRequests.length,
    cleared_pending_amount: clearedPendingAmount,
    days_added: daysToAdd,
    amount_used_for_days: amountUsedForDays,
    remaining_change: remainingChange,
    old_balance: currentBalance,
    new_balance: newBalance,
    old_total_day_amount: currentTotalDayAmount,
    new_total_day_amount: newTotalDayAmount,
    old_day_limit: currentDayLimit,
    new_day_limit: newDayLimit,
    payment_amount: paymentAmount,
    message: `Payment Successful! 
✅ Cleared ${paidRequests.length} pending requests (₹${clearedPendingAmount})
📅 Added ${daysToAdd} days from payment amount (₹${amountUsedForDays})
💰 Balance: ₹${currentBalance} → ₹${newBalance}
📊 Total Day Amount: ₹${currentTotalDayAmount} → ₹${newTotalDayAmount}
📆 Day Limit: ${currentDayLimit} → ${newDayLimit} days
💎 Remaining Credit: ₹${remainingChange}`
  };

  console.log('🎉 FINAL RESULT:', result);
  return result;
}

// Regular Customer Recharge Handler
async function handleRegularRecharge(customerId, amount, paymentDate, paymentType, transactionId, utrNo, comments) {
  console.log('Processing regular recharge for customer:', customerId);
  
  const balanceResult = await executeQuery(
    'SELECT amtlimit, balance FROM customer_balances WHERE com_id = ?',
    [customerId]
  );
  
  let oldBalance, oldLimit;

  if (balanceResult.length === 0) {
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

  // Update customer_balances
  await executeQuery(
    `UPDATE customer_balances 
     SET amtlimit = ?, balance = ?, updated_at = NOW()
     WHERE com_id = ?`,
    [new_limit, new_balance, customerId]
  );

  // Insert into recharge tables
  const paymentTypeText = getPaymentTypeForDB(paymentType);
  const safeUtrNo = utrNo || '';
  const safeTransactionId = transactionId || '';
  const safeComments = comments || '';

  await executeQuery(
    `INSERT INTO recharge_wallets (com_id, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created_at) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`,
    [customerId, amount, paymentDate, paymentTypeText, safeTransactionId, safeUtrNo, safeComments]
  );

  await executeQuery(
    `INSERT INTO recharge_requests (cid, amount, payment_date, payment_type, transaction_id, utr_no, comments, status, created) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved', NOW())`,
    [customerId, amount, paymentDate, paymentTypeText, safeTransactionId, safeUtrNo, safeComments]
  );

  // Insert into filling_history
  await executeQuery(
    `INSERT INTO filling_history (trans_type, credit, credit_date, old_amount, new_amount, remaining_limit, cl_id, created_by) 
     VALUES ('inward', ?, ?, ?, ?, ?, ?, 1)`,
    [amount, paymentDate, oldBalance, new_balance, new_limit, customerId]
  );

  // Insert into limit_history
  await executeQuery(
    `INSERT INTO limit_history (com_id, old_limit, change_amount, new_limit, changed_by, change_date) 
     VALUES (?, ?, ?, ?, 1, NOW())`,
    [customerId, oldLimit, amount, new_limit]
  );

  return {
    old_balance: oldBalance,
    new_balance: new_balance,
    old_limit: oldLimit,
    new_limit: new_limit,
    message: `Recharge successful! 
Balance: ₹${oldBalance} → ₹${new_balance}
Limit: ₹${oldLimit} → ₹${new_limit}`
  };
}

// Helper function
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