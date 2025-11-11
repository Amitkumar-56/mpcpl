import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.json();
    
    // Extract and validate form data
    const { payment_date, title, paid_to, reason, amount } = formData;

    // Validate required fields
    if (!payment_date || !title || !paid_to || !reason || !amount) {
      return NextResponse.json(
        { 
          error: 'All fields are required'
        },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Check current balance
    const currentBalanceResult = await executeQuery('SELECT balance FROM cash_balance WHERE id = 1');
    const currentBalance = currentBalanceResult[0]?.balance || 0;

    // Check if we have sufficient balance
    if (currentBalance < amountNum) {
      return NextResponse.json(
        { error: `Insufficient balance. Current: ₹${currentBalance}, Required: ₹${amountNum}` },
        { status: 400 }
      );
    }

    // Insert expense record
    const expenseQuery = `
      INSERT INTO expenses (payment_date, title, paid_to, reason, amount) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const expenseResult = await executeQuery(expenseQuery, [
      payment_date,
      title,
      paid_to,
      reason,
      amountNum
    ]);

    const expenseId = expenseResult.insertId;

    // Update cash balance
    const updateBalanceQuery = `
      UPDATE cash_balance 
      SET balance = balance - ?, updated_at = NOW()
      WHERE id = 1
    `;
    
    await executeQuery(updateBalanceQuery, [amountNum]);

    // Get new balance
    const newBalanceResult = await executeQuery('SELECT balance FROM cash_balance WHERE id = 1');
    const newBalance = newBalanceResult[0].balance;

    return NextResponse.json({
      success: true,
      message: 'Expense created and cash balance updated successfully!',
      expenseId: expenseId,
      newBalance: newBalance
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create expense',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET method to fetch current balance
export async function GET(request) {
  try {
    const balanceQuery = 'SELECT balance FROM cash_balance WHERE id = 1';
    const balanceResult = await executeQuery(balanceQuery);
    
    let currentBalance = 0;
    
    if (balanceResult.length > 0) {
      currentBalance = balanceResult[0].balance || 0;
    } else {
      // Initialize cash_balance if empty
      await executeQuery('INSERT INTO cash_balance (balance) VALUES (100000)');
      currentBalance = 100000;
    }

    return NextResponse.json({
      success: true,
      data: {
        currentBalance: currentBalance
      }
    });

  } catch (error) {
    console.error('Error fetching balance data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch balance data'
      },
      { status: 500 }
    );
  }
}