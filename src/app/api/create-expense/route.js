import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.json();
    
    // Extract and validate form data
    const { payment_date, title, details, paid_to, reason, amount } = formData;

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

    // Insert expense record - UPDATED to include details field
    const expenseQuery = `
      INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const expenseResult = await executeQuery(expenseQuery, [
      payment_date,
      title,
      details || '', // Handle empty details
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

    // Create Audit Log
    try {
      let userId = null;
      let userName = null;
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const users = await executeQuery(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name || null;
            }
          }
        }
      } catch (authError) {
        console.error('Error getting user for audit log:', authError);
      }

      await createAuditLog({
        page: 'NB Expenses',
        uniqueCode: expenseId.toString(),
        section: 'Expense Management',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `Expense created: ${title} - ₹${amountNum} paid to ${paid_to}`,
        oldValue: null,
        newValue: {
          expense_id: expenseId,
          title: title,
          details: details,
          paid_to: paid_to,
          reason: reason,
          amount: amountNum,
          payment_date: payment_date,
          new_balance: newBalance
        },
        recordType: 'expense',
        recordId: expenseId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

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