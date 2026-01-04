// src/app/api/nb-balance/recharge/route.js
import { executeTransaction } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';
import { executeQuery } from '@/lib/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const { payment_date, title, details, paid_from = '', reason = '', amount } = body;

    // Validation
    if (!payment_date || !title?.trim() || !amount) {
      return NextResponse.json(
        { success: false, message: "Payment date, title, and amount are required" },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid amount entered. Amount must be positive." },
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
        // Initialize cash_balance if it doesn't exist
        await connection.execute(
          'INSERT INTO cash_balance (balance, updated_at) VALUES (0, NOW())'
        );
        const [newBalanceResult] = await connection.query(
          'SELECT id, balance FROM cash_balance ORDER BY id DESC LIMIT 1'
        );
        balanceResult.push(newBalanceResult[0]);
      }

      const currentBalance = parseFloat(balanceResult[0].balance);
      const balanceId = balanceResult[0].id;
      const newBalance = currentBalance + amountNum; // ADD to balance (recharge)

      // Check if expenses table has transaction_type column
      let hasTransactionType = false;
      try {
        const [columnCheck] = await connection.query(
          `SELECT COUNT(*) as count 
           FROM information_schema.COLUMNS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'expenses' 
           AND COLUMN_NAME = 'transaction_type'`
        );
        hasTransactionType = columnCheck && columnCheck.length > 0 && columnCheck[0].count > 0;
      } catch (err) {
        console.log('Could not check for transaction_type column');
      }

      // Insert recharge record into expenses
      let insertQuery, insertParams;
      if (hasTransactionType) {
        insertQuery = `
          INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, transaction_type, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'recharge', NOW())
        `;
        insertParams = [
          payment_date,
          title.trim(),
          details?.trim() || '',
          paid_from.trim(),
          reason?.trim() || '',
          amountNum
        ];
      } else {
        // Use negative amount to differentiate (will be displayed as positive in UI)
        // Or we can use a special title prefix
        insertQuery = `
          INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        insertParams = [
          payment_date,
          `[RECHARGE] ${title.trim()}`,
          details?.trim() || '',
          paid_from.trim(),
          reason?.trim() || '',
          amountNum // Store as positive, UI will handle display
        ];
      }

      const [insertResult] = await connection.execute(insertQuery, insertParams);
      const rechargeId = insertResult?.insertId || insertResult?.insertid || null;

      // Update balance - ADD to balance (recharge increases balance)
      await connection.execute(
        'UPDATE cash_balance SET balance = balance + ?, updated_at = NOW() WHERE id = ?',
        [amountNum, balanceId]
      );

      return { rechargeId, oldBalance: currentBalance, newBalance };
    });

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
        page: 'NB Accounts',
        uniqueCode: result.rechargeId?.toString() || 'N/A',
        section: 'Cash Recharge',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `Cash recharge: ${title} - ₹${amountNum} from ${paid_from || 'N/A'}. Cash balance: ₹${result.oldBalance} → ₹${result.newBalance}`,
        oldValue: { balance: result.oldBalance },
        newValue: {
          recharge_id: result.rechargeId,
          title: title,
          paid_from: paid_from,
          reason: reason,
          amount: amountNum,
          payment_date: payment_date,
          details: details,
          balance: result.newBalance
        },
        recordType: 'cash_recharge',
        recordId: result.rechargeId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json(
      { 
        success: true, 
        message: 'Cash recharge added successfully', 
        rechargeId: result.rechargeId,
        newBalance: result.newBalance
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('❌ Error adding cash recharge:', error);
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
    
    const statusCode = error.message?.includes('not found') || error.message?.includes('Insufficient') 
      ? 400 
      : 500;
    
    return NextResponse.json(errorResponse, { status: statusCode });
  }
}
