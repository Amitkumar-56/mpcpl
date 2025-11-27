import { executeTransaction } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { payment_date, title, details, paid_to, reason, amount } = body;

    // Validation
    if (!payment_date || !title?.trim() || !paid_to?.trim() || !amount) {
      return NextResponse.json(
        { success: false, message: "Payment date, title, paid to, and amount are required" },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid amount entered" },
        { status: 400 }
      );
    }

    // Use executeTransaction helper to handle transactions properly
    const result = await executeTransaction(async (connection) => {
      // Get current balance using query() for SELECT
      const [balanceResult] = await connection.query(
        'SELECT id, balance FROM cash_balance ORDER BY id DESC LIMIT 1'
      );

      if (balanceResult.length === 0) {
        throw new Error('Cash balance not found');
      }

      const currentBalance = parseFloat(balanceResult[0].balance);
      const balanceId = balanceResult[0].id;

      if (currentBalance < amountNum) {
        throw new Error(`Insufficient funds. Available: ₹${currentBalance.toFixed(2)}`);
      }

      // Insert expense - prepared statement use करो
      // Note: expenses table doesn't have created_at column based on schema
      const insertExpense = `
        INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const [insertResult] = await connection.execute(insertExpense, [
        payment_date,
        title.trim(),
        details?.trim() || '',
        paid_to.trim(),
        reason?.trim() || '',
        amountNum,
      ]);

      const expenseId = insertResult?.insertId || insertResult?.insertid || null;

      // Update balance - prepared statement use करो
      await connection.execute(
        'UPDATE cash_balance SET balance = balance - ?, updated_at = NOW() WHERE id = ?',
        [amountNum, balanceId]
      );

      return { expenseId };
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Expense added successfully', 
        expenseId: result.expenseId 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error adding expense:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      errno: error.errno
    });
    
    // Return detailed error for debugging
    const errorResponse = {
      success: false,
      message: error.message || 'Database error occurred',
      error: error.message || 'Unknown error'
    };
    
    // Include SQL error details if available
    if (error.sqlMessage) {
      errorResponse.sqlError = error.sqlMessage;
      errorResponse.sqlState = error.sqlState;
      errorResponse.sqlCode = error.code;
    }
    
    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
      errorResponse.fullError = {
        message: error.message,
        code: error.code,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage,
        errno: error.errno
      };
    }
    
    // Return appropriate status code based on error type
    const statusCode = error.message?.includes('not found') || error.message?.includes('Insufficient') 
      ? 400 
      : 500;
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}