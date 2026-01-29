import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery, executeTransaction } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Helper function to safely convert to number
const safeNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return isNaN(num) ? value : num;
};

// GET - All expenses with dynamic filtering and pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract all possible query parameters
    const search = searchParams.get('search') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const minAmount = searchParams.get('minAmount') || '';
    const maxAmount = searchParams.get('maxAmount') || '';
    const paidTo = searchParams.get('paidTo') || '';
    const reason = searchParams.get('reason') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const sortBy = searchParams.get('sortBy') || 'payment_date';
    const sortOrder = searchParams.get('sortOrder') || 'DESC';

    const offset = (page - 1) * limit;

    // Build dynamic WHERE clause
    let whereConditions = [];
    let queryParams = [];

    if (search) {
      whereConditions.push('(title LIKE ? OR details LIKE ? OR paid_to LIKE ?)');
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (dateFrom) {
      whereConditions.push('payment_date >= ?');
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      whereConditions.push('payment_date <= ?');
      queryParams.push(dateTo);
    }

    if (minAmount) {
      whereConditions.push('amount >= ?');
      queryParams.push(safeNumber(minAmount));
    }

    if (maxAmount) {
      whereConditions.push('amount <= ?');
      queryParams.push(safeNumber(maxAmount));
    }

    if (paidTo) {
      whereConditions.push('paid_to LIKE ?');
      queryParams.push(`%${paidTo}%`);
    }

    if (reason) {
      whereConditions.push('reason LIKE ?');
      queryParams.push(`%${reason}%`);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM expenses ${whereClause}`;
    console.log('Count Query:', countQuery);
    console.log('Count Params:', queryParams);
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    // Get paginated data - FIX: All parameters must be strings for MySQL prepared statements
    const dataQuery = `
      SELECT * FROM expenses 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;
    
    // Copy query params for data query
    const dataParams = [...queryParams];
    
    // Convert LIMIT and OFFSET to strings - THIS IS IMPORTANT!
    dataParams.push(String(limit), String(offset));
    
    console.log('Data Query:', dataQuery);
    console.log('Data Params:', dataParams);
    console.log('Data Params Types:', dataParams.map(p => `${p} (${typeof p})`));
    
    const expenses = await executeQuery(dataQuery, dataParams);

    // Get total cash balance - initialize if empty
    let cashBalanceResult = await executeQuery(`SELECT balance FROM cash_balance LIMIT 1`);
    if (cashBalanceResult.length === 0) {
      // Initialize cash_balance if empty
      await executeQuery('INSERT INTO cash_balance (balance, updated_at) VALUES (0, NOW())');
      cashBalanceResult = await executeQuery(`SELECT balance FROM cash_balance LIMIT 1`);
    }
    const totalCash = cashBalanceResult[0]?.balance || 0;

    return NextResponse.json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: page,
          limit,
          totalRecords: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        totalCash,
        filters: {
          search,
          dateFrom,
          dateTo,
          minAmount,
          maxAmount,
          paidTo,
          reason
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cash data:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch cash data',
        message: error.message,
        details: {
          code: error.code,
          errno: error.errno,
          sqlState: error.sqlState
        }
      },
      { status: 500 }
    );
  }
}

// POST - Create new expense with transaction
export async function POST(request) {
  try {
    const body = await request.json();
    
    const { 
      payment_date, 
      title, 
      details = '', 
      paid_to = '', 
      reason = '', 
      amount 
    } = body;

    // Validation
    if (!payment_date || !title || !amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          required: ['payment_date', 'title', 'amount']
        },
        { status: 400 }
      );
    }

    // Validate amount is a positive number
    if (isNaN(amount) || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Use transaction for expense creation and balance update
    const result = await executeTransaction(async (connection) => {
      // Note: expenses table doesn't have created_at column based on schema
      const insertQuery = `
        INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const [insertResult] = await connection.execute(insertQuery, [
        payment_date, 
        title, 
        details, 
        paid_to, 
        reason, 
        parseFloat(amount)
      ]);

      // Get old balance before update
      const [oldBalanceResult] = await connection.execute(
        `SELECT balance FROM cash_balance LIMIT 1`
      );
      const oldBalance = oldBalanceResult[0]?.balance || 0;

      // Update cash balance (deduct expense)
      const updateBalanceQuery = `
        UPDATE cash_balance 
        SET balance = balance - ?, updated_at = NOW()
      `;
      await connection.execute(updateBalanceQuery, [parseFloat(amount)]);

      // Get updated balance
      const [balanceResult] = await connection.execute(
        `SELECT balance FROM cash_balance LIMIT 1`
      );
      const newBalance = balanceResult[0]?.balance || 0;

      return {
        insertId: insertResult.insertId,
        oldBalance,
        newBalance
      };
    });

    // Get user info for audit log
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
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Create audit log
    await createAuditLog({
      page: 'Cash Management',
      uniqueCode: `EXPENSE-${result.insertId}`,
      section: 'Add Expense',
      userId: userId,
      userName: userName,
      action: 'add',
      remarks: `Expense added: ${title} - ₹${amount} to ${paid_to || 'N/A'}. Cash balance: ₹${result.oldBalance} → ₹${result.newBalance}`,
      oldValue: { balance: result.oldBalance },
      newValue: { 
        balance: result.newBalance, 
        expense: { 
          title, 
          amount: parseFloat(amount), 
          paid_to, 
          reason, 
          payment_date 
        } 
      },
      fieldName: 'cash_balance',
      recordType: 'cash_expense',
      recordId: result.insertId
    });

    return NextResponse.json({
      success: true,
      message: 'Expense created successfully',
      data: { 
        id: result.insertId,
        payment_date,
        title,
        amount: parseFloat(amount),
        new_balance: result.newBalance
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating expense:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create expense',
        message: error.message 
      },
      { status: 500 }
    );
  }
}