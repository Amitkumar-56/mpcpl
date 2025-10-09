import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.json();
    
    const {
      amount,
      payment_date,
      payment_type,
      transaction_id,
      utr_no,
      comments,
      com_id
    } = formData;

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount. Amount must be greater than 0.' },
        { status: 400 }
      );
    }

    // Validate date
    if (!payment_date || !/^\d{4}-\d{2}-\d{2}$/.test(payment_date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
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
        { status: 404 }
      );
    }

    const { amtlimit: old_limit, balance: old_balance } = balanceResult[0];
    
    // Calculate new values
    const new_limit = old_limit + amount;
    const new_balance = old_balance - amount;
    const status = 'Approved';

    // Start transaction - implement proper transaction handling with your database library
    try {
      // Insert into recharge_wallets
      await executeQuery(
        `INSERT INTO recharge_wallets (status, payment_type, payment_date, amount, transaction_id, utr_no, comments, com_id) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [status, payment_type, payment_date, amount, transaction_id, utr_no, comments, com_id]
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
        { success: true, message: 'Recharge added successfully.' },
        { status: 200 }
      );

    } catch (dbError) {
      console.error('Database transaction error:', dbError);
      return NextResponse.json(
        { error: 'Failed to process recharge request - transaction failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process recharge request' },
      { status: 500 }
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
        { status: 400 }
      );
    }

    // Fetch customer details and balance
    const [customerResult, balanceResult] = await Promise.all([
      executeQuery(
        'SELECT name, phone FROM customers WHERE id = ?',
        [parseInt(id)]
      ),
      executeQuery(
        'SELECT balance, amtlimit FROM customer_balances WHERE com_id = ?',
        [parseInt(id)]
      )
    ]);

    if (customerResult.length === 0) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult[0];
    const balance = balanceResult.length > 0 ? balanceResult[0] : {
      balance: 0,
      amtlimit: 0
    };

    return NextResponse.json({
      customer: {
        name: customer.name || 'No name found',
        phone: customer.phone || 'No phone found'
      },
      balance: {
        current_balance: balance.balance || 0,
        current_limit: balance.amtlimit || 0
      }
    });

  } catch (error) {
    console.error('Error fetching customer data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer data' },
      { status: 500 }
    );
  }
}