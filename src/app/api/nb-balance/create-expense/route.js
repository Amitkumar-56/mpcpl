import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { payment_date, title, details, paid_to, reason, amount } = body;

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

    await executeQuery('START TRANSACTION');

    // ✅ Get current balance
    const balanceResult = await executeQuery(
      'SELECT id, balance FROM cash_balance ORDER BY id DESC LIMIT 1'
    );

    if (balanceResult.length === 0) {
      await executeQuery('ROLLBACK');
      return NextResponse.json(
        { success: false, message: 'Cash balance not found' },
        { status: 404 }
      );
    }

    const currentBalance = parseFloat(balanceResult[0].balance);
    const balanceId = balanceResult[0].id;

    if (currentBalance < amountNum) {
      await executeQuery('ROLLBACK');
      return NextResponse.json(
        { success: false, message: `Insufficient funds. Available: ₹${currentBalance}` },
        { status: 400 }
      );
    }

    // ✅ Insert expense
    const insertExpense = `
      INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, created_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW())
    `;
    const result = await executeQuery(insertExpense, [
      payment_date,
      title.trim(),
      details?.trim() || '',
      paid_to.trim(),
      reason?.trim() || '',
      amountNum,
    ]);

    // ✅ Update balance
    await executeQuery(
      'UPDATE cash_balance SET balance = balance - ?, updated_at = NOW() WHERE id = ?',
      [amountNum, balanceId]
    );

    await executeQuery('COMMIT');

    return NextResponse.json(
      { success: true, message: 'Expense added successfully', expenseId: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding expense:', error);
    await executeQuery('ROLLBACK');
    return NextResponse.json(
      { success: false, message: 'Database or server error occurred', error: error.message },
      { status: 500 }
    );
  }
}
