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

    if (!payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch current balance and limit
    const balanceResult = await executeQuery(
      'SELECT amtlimit, balance FROM customer_balances WHERE com_id = ?',
      [com_id]
    );
    
    if (balanceResult.length === 0) {
      return NextResponse.json(
        { error: 'Customer balance not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const { amtlimit: old_limit, balance: old_balance } = balanceResult[0];
    
    // Calculate new values
    const new_limit = parseFloat(old_limit) + parseFloat(amount);
    const new_balance = parseFloat(old_balance) - parseFloat(amount);
    const status = 'Approved';

    // Start transaction
    try {
      // Insert into recharge_wallets
      await executeQuery(
        `INSERT INTO recharge_wallets (status, payment_type, payment_date, amount, transaction_id, utr_no, comments, com_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [status, payment_type, payment_date, amount, transaction_id || null, utr_no || null, comments || null, com_id]
      );

      // Update customer_balances
      await executeQuery(
        `UPDATE customer_balances 
         SET amtlimit = amtlimit + ?, balance = balance - ? 
         WHERE com_id = ?`,
        [amount, amount, com_id]
      );

      // Insert into filling_history
      await executeQuery(
        `INSERT INTO filling_history (trans_type, credit, credit_date, new_amount, remaining_limit, cl_id, created_by)  
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ['Inward', amount, payment_date, new_balance, new_limit, com_id, 1]
      );

      // Insert into limit_history
      await executeQuery(
        `INSERT INTO limit_history (com_id, old_limit, change_amount, new_limit, changed_by, change_date) 
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [com_id, old_limit, amount, new_limit, 1]
      );

      // Update cash balance if payment type is cash (1)
      if (payment_type === '1') {
        await executeQuery(
          'UPDATE cash_balance SET balance = balance + ?',
          [amount]
        );
      }

      return NextResponse.json(
        { 
          success: true, 
          message: 'Recharge added successfully.',
          data: {
            new_balance,
            new_limit
          }
        },
        { status: 200, headers: corsHeaders }
      );

    } catch (dbError) {
      console.error('Database transaction error:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to process recharge request - transaction failed',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        },
        { status: 500, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process recharge request',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request) {
  try {
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

    // Fetch customer details and balance
    const [customerResult, balanceResult] = await Promise.all([
      executeQuery(
        'SELECT name, phone FROM customers WHERE id = ?',
        [customerId]
      ),
      executeQuery(
        'SELECT balance, amtlimit FROM customer_balances WHERE com_id = ?',
        [customerId]
      )
    ]);

    if (customerResult.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const customer = customerResult[0];
    const balance = balanceResult.length > 0 ? balanceResult[0] : {
      balance: 0,
      amtlimit: 0
    };

    return NextResponse.json({
      success: true,
      customer: {
        name: customer.name || 'No name found',
        phone: customer.phone || 'No phone found'
      },
      balance: {
        current_balance: Number(balance.balance) || 0,
        current_limit: Number(balance.amtlimit) || 0
      }
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error fetching customer data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch customer data',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500, headers: corsHeaders }
    );
  }
}