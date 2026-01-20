import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";

// Helper function to check permissions
async function checkUserPermissions(employee_id, module_name) {
  try {
    const query = `
      SELECT can_view, can_edit, can_create
      FROM role_permissions 
      WHERE employee_id = ? AND module_name = ?
      UNION
      SELECT can_view, can_edit, can_create
      FROM role_permissions 
      WHERE role = (SELECT role FROM employee_profile WHERE id = ?) 
        AND module_name = ? 
        AND (employee_id IS NULL OR employee_id = 0 OR employee_id = '')
      LIMIT 1
    `;
    
    const result = await executeQuery(query, [employee_id, module_name, employee_id, module_name]);
    
    if (result.length > 0) {
      return {
        can_view: result[0].can_view === 1,
        can_edit: result[0].can_edit === 1,
        can_create: result[0].can_create === 1
      };
    }
    
    return {
      can_view: false,
      can_edit: false,
      can_create: false
    };
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      can_view: false,
      can_edit: false,
      can_create: false
    };
  }
}

// Get current user from token
async function getCurrentUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log('❌ No token found in cookies');
      return null;
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Token verification failed');
      return null;
    }
    
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.log('❌ No userId in decoded token');
      return null;
    }
    
    const userQuery = `
      SELECT id, name, role, status 
      FROM employee_profile 
      WHERE id = ? AND status = 1
    `;
    
    const users = await executeQuery(userQuery, [userId]);
    
    if (users.length === 0) {
      console.log(`❌ User ${userId} not found or inactive`);
      return null;
    }
    
    const user = users[0];
    return {
      userId: user.id,
      userName: user.name,
      userRole: user.role
    };
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

// GET - Fetch expenses (combined from expenses and recharge_wallets)
export async function GET(request) {
  console.log('🚀 API: nb-expenses GET called');
  
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    
    // Cash balance endpoint
    if (endpoint === 'cash-balance') {
      console.log('📊 nb-balance endpoint called');
      
      const page = parseInt(searchParams.get('page')) || 1;
      const limit = parseInt(searchParams.get('limit')) || 10;
      const offset = (page - 1) * limit;

      console.log('📊 nb-balance GET called with:', { page, limit, offset });

      // Get total cash balance
      const cashBalance = await executeQuery(
        'SELECT COALESCE(balance, 0) as balance FROM cash_balance LIMIT 1'
      );

      // Modified: Use parameters properly
      const cashHistoryQuery = `
        SELECT r.id, c.name, r.amount, r.payment_date, 
               r.comments, r.payment_type 
        FROM recharge_wallets r 
        JOIN customers c ON r.com_id = c.id 
        WHERE r.payment_type = 'Cash' 
        ORDER BY r.id DESC 
        LIMIT ? OFFSET ?
      `;
      
      const cashHistory = await executeQuery(cashHistoryQuery, [limit, offset]);

      // Get total count for pagination
      const totalCountResult = await executeQuery(`
        SELECT COUNT(*) as count 
        FROM recharge_wallets r 
        WHERE r.payment_type = 'Cash'
      `);
      
      const totalCount = totalCountResult[0]?.count || 0;

      console.log('✅ Cash data fetched successfully:', {
        cashBalance: cashBalance[0]?.balance || 0,
        cashHistoryCount: cashHistory?.length || 0,
        totalCount
      });

      return NextResponse.json({
        success: true,
        data: {
          totalCash: cashBalance[0]?.balance || 0,
          cashHistory: cashHistory || [],
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalRecords: totalCount
          }
        }
      });
    }
    
    // Regular expenses endpoint
    const currentUser = await getCurrentUserFromToken();
    
    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false,
          error: "Unauthorized. Please login again." 
        },
        { status: 401 }
      );
    }
    
    const { userId, userRole, userName } = currentUser;
    
    // Check permissions
    const permissions1 = await checkUserPermissions(userId, 'nb_expenses');
    const permissions2 = await checkUserPermissions(userId, 'NB Expenses');
    
    const permissions = {
      can_view: permissions1.can_view || permissions2.can_view || userRole === 5,
      can_edit: permissions1.can_edit || permissions2.can_edit || userRole === 5,
      can_create: permissions1.can_create || permissions2.can_create || userRole === 5
    };
    
    if (!permissions.can_view) {
      return NextResponse.json(
        { 
          success: false,
          error: "Access denied. You don't have view permission for NB Expenses." 
        },
        { status: 403 }
      );
    }
    
    // Parse pagination parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    
    console.log(`📄 Pagination: page=${page}, limit=${limit}, offset=${offset}`);
    
    // Get search parameters
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    const expenseType = searchParams.get('expenseType') || 'all';
    
    // Build WHERE conditions and parameters for EACH TABLE
    let expenseWhere = [];
    let expenseParams = [];
    let cashWhere = [];
    let cashParams = [];
    
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      expenseWhere.push(`(e.title LIKE ? OR e.reason LIKE ? OR e.paid_to LIKE ?)`);
      cashWhere.push(`(c.name LIKE ? OR r.comments LIKE ?)`);
      expenseParams.push(searchTerm, searchTerm, searchTerm);
      cashParams.push(searchTerm, searchTerm);
    }
    
    if (dateFrom && dateFrom.trim() !== '') {
      expenseWhere.push(`DATE(e.payment_date) >= ?`);
      cashWhere.push(`DATE(r.payment_date) >= ?`);
      expenseParams.push(dateFrom.trim());
      cashParams.push(dateFrom.trim());
    }
    
    if (dateTo && dateTo.trim() !== '') {
      expenseWhere.push(`DATE(e.payment_date) <= ?`);
      cashWhere.push(`DATE(r.payment_date) <= ?`);
      expenseParams.push(dateTo.trim());
      cashParams.push(dateTo.trim());
    }
    
    if (minAmount && minAmount.trim() !== '') {
      const minAmountNum = parseFloat(minAmount);
      expenseWhere.push(`e.amount >= ?`);
      cashWhere.push(`r.amount >= ?`);
      expenseParams.push(minAmountNum);
      cashParams.push(minAmountNum);
    }
    
    if (maxAmount && maxAmount.trim() !== '') {
      const maxAmountNum = parseFloat(maxAmount);
      expenseWhere.push(`e.amount <= ?`);
      cashWhere.push(`r.amount <= ?`);
      expenseParams.push(maxAmountNum);
      cashParams.push(maxAmountNum);
    }
    
    // Build expense query
    let expenseQuery = `
      SELECT 
        e.id,
        e.payment_date,
        e.title as customer_name,
        '' as details,
        e.paid_to,
        e.reason as remark,
        e.amount,
        'expense' as source_table,
        'Outward' as type,
        'Cash' as payment_type,
        e.created_at
      FROM expenses e
    `;
    
    if (expenseWhere.length > 0) {
      expenseQuery += ` WHERE ${expenseWhere.join(' AND ')}`;
    }
    
    // Build cash query
    let cashQuery = `
      SELECT 
        r.id,
        r.payment_date,
        COALESCE(c.name, 'Customer') as customer_name,
        r.comments as details,
        '' as paid_to,
        r.comments as remark,
        r.amount,
        'recharge_wallet' as source_table,
        'Inward' as type,
        r.payment_type,
        r.created_at
      FROM recharge_wallets r
      LEFT JOIN customers c ON r.com_id = c.id
      WHERE r.payment_type = 'Cash'
    `;
    
    if (cashWhere.length > 0) {
      cashQuery += ` AND ${cashWhere.join(' AND ')}`;
    }
    
    // Apply expense type filter
    if (expenseType !== 'all') {
      if (expenseType === 'inward') {
        // Only cash inward
        expenseQuery += expenseWhere.length > 0 ? ` AND 1=0` : ` WHERE 1=0`;
      } else if (expenseType === 'outward') {
        // Only outward expenses
        cashQuery += ` AND 1=0`;
      }
    }
    
    // Build final UNION ALL query with LIMIT/OFFSET
    const finalQuery = `
      SELECT * FROM (
        ${expenseQuery}
        UNION ALL
        ${cashQuery}
      ) AS combined_data
      ORDER BY payment_date DESC, id DESC
      LIMIT ? OFFSET ?
    `;
    
    // Combine all parameters
    const allParams = [...expenseParams, ...cashParams, limit, offset];
    
    console.log('🔍 Final Query:', finalQuery);
    console.log('🔍 All Params:', allParams);
    
    // Execute query
    const expenses = await executeQuery(finalQuery, allParams);
    console.log(`✅ Retrieved ${expenses?.length || 0} combined records`);
    
    // Get total counts for pagination
    let totalExpenseCount = 0;
    let totalCashCount = 0;
    
    // Count expenses
    let expenseCountQuery = `SELECT COUNT(*) as count FROM expenses e`;
    if (expenseWhere.length > 0) {
      expenseCountQuery += ` WHERE ${expenseWhere.join(' AND ')}`;
    }
    
    if (expenseType !== 'inward') {
      const expenseCountResult = await executeQuery(expenseCountQuery, expenseParams);
      totalExpenseCount = expenseCountResult[0]?.count || 0;
    }
    
    // Count cash records
    let cashCountQuery = `
      SELECT COUNT(*) as count 
      FROM recharge_wallets r
      LEFT JOIN customers c ON r.com_id = c.id
      WHERE r.payment_type = 'Cash'
    `;
    
    if (cashWhere.length > 0) {
      cashCountQuery += ` AND ${cashWhere.join(' AND ')}`;
    }
    
    if (expenseType !== 'outward') {
      const cashCountResult = await executeQuery(cashCountQuery, cashParams);
      totalCashCount = cashCountResult[0]?.count || 0;
    }
    
    const totalCount = totalExpenseCount + totalCashCount;
    
    console.log(`📊 Total counts - Expenses: ${totalExpenseCount}, Cash: ${totalCashCount}, Total: ${totalCount}`);
    
    // Get cash balance total
    const cashBalanceResult = await executeQuery(
      'SELECT COALESCE(balance, 0) as totalCash FROM cash_balance LIMIT 1'
    );
    const totalCash = cashBalanceResult[0]?.totalCash || 0;
    
    // Calculate inward/outward totals
    const inwardTotal = expenses
      .filter(e => e.type === 'Inward')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    const outwardTotal = expenses
      .filter(e => e.type === 'Outward')
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    
    return NextResponse.json({
      success: true,
      expenses: expenses || [],
      permissions: permissions,
      summary: {
        totalCash,
        inwardTotal,
        outwardTotal,
        netBalance: inwardTotal - outwardTotal
      },
      pagination: {
        page: page,
        limit: limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      user: {
        id: userId,
        name: userName,
        role: userRole
      }
    });
    
  } catch (error) {
    console.error("❌ Error in nb-expenses GET:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// POST - Create new expense (only for outward expenses)
export async function POST(request) {
  try {
    // Get current user
    const currentUser = await getCurrentUserFromToken();
    
    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false,
          error: "Unauthorized. Please login again." 
        },
        { status: 401 }
      );
    }
    
    const { userId, userRole, userName } = currentUser;
    
    // Check create permission
    const permissions1 = await checkUserPermissions(userId, 'nb_expenses');
    const permissions2 = await checkUserPermissions(userId, 'NB Expenses');
    
    const canCreate = permissions1.can_create || permissions2.can_create || userRole === 5;
    
    if (!canCreate) {
      return NextResponse.json(
        { 
          success: false,
          error: "Permission denied. You don't have create permission for NB Expenses." 
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      payment_date, 
      customer_name, 
      details, 
      paid_to, 
      remark, 
      amount
    } = body;
    
    // Validate required fields
    if (!payment_date || !customer_name || !amount) {
      return NextResponse.json(
        { 
          success: false,
          error: "Payment date, customer name and amount are required fields." 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return NextResponse.json(
        { 
          success: false,
          error: "Amount must be a valid number." 
        },
        { status: 400 }
      );
    }
    
    // Insert query (all new expenses are Outward)
    const query = `
      INSERT INTO expenses 
        (payment_date, title, details, paid_to, reason, amount, created_at)
      VALUES 
        (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const params = [
      payment_date, 
      customer_name, 
      details || '', 
      paid_to || '', 
      remark || '', 
      amountNum
    ];
    
    const result = await executeQuery(query, params);
    
    // Create audit log
    await createAuditLog({
      page: 'NB Expenses',
      uniqueCode: `EXPENSE-${result.insertId}`,
      section: 'Add Expense',
      userId: userId,
      userName: userName,
      action: 'add',
      remarks: `Outward expense added: ${customer_name} - ₹${amountNum}`,
      oldValue: null,
      newValue: { 
        id: result.insertId,
        customer_name, 
        amount: amountNum, 
        paid_to, 
        remark, 
        payment_date,
        type: 'Outward'
      },
      recordType: 'nb_expense',
      recordId: result.insertId
    });
    
    return NextResponse.json({
      success: true,
      message: "Outward expense created successfully",
      id: result.insertId
    });
    
  } catch (error) {
    console.error("❌ Error in nb-expenses POST:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to create expense: " + error.message 
      },
      { status: 500 }
    );
  }
}

// PUT - Update expense (can update both expenses and recharge_wallets)
export async function PUT(request) {
  try {
    // Get current user
    const currentUser = await getCurrentUserFromToken();
    
    if (!currentUser) {
      return NextResponse.json(
        { 
          success: false,
          error: "Unauthorized. Please login again." 
        },
        { status: 401 }
      );
    }
    
    const { userId, userRole, userName } = currentUser;
    
    // Check edit permission
    const permissions1 = await checkUserPermissions(userId, 'nb_expenses');
    const permissions2 = await checkUserPermissions(userId, 'NB Expenses');
    
    const canEdit = permissions1.can_edit || permissions2.can_edit || userRole === 5;
    
    if (!canEdit) {
      return NextResponse.json(
        { 
          success: false,
          error: "Permission denied. You don't have edit permission for NB Expenses." 
        },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { 
      id, 
      payment_date, 
      customer_name, 
      details, 
      paid_to, 
      remark, 
      amount,
      source_table 
    } = body;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: "Record ID is required" 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    let amountNum = null;
    if (amount !== undefined) {
      amountNum = parseFloat(amount);
      if (isNaN(amountNum)) {
        return NextResponse.json(
          { 
            success: false,
            error: "Amount must be a valid number." 
          },
          { status: 400 }
        );
      }
    }
    
    // Check if it's from expenses table or recharge_wallets
    const tableName = source_table || 'expense';
    
    if (tableName === 'expense') {
      // Update expenses table (Outward)
      const oldExpenseQuery = "SELECT * FROM expenses WHERE id = ?";
      const oldExpenseData = await executeQuery(oldExpenseQuery, [id]);
      
      if (oldExpenseData.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: "Expense not found" 
          },
          { status: 404 }
        );
      }
      
      const oldExpense = oldExpenseData[0];
      
      // Update query for expenses
      const updateQuery = `
        UPDATE expenses 
        SET 
          payment_date = ?,
          title = ?,
          details = ?,
          paid_to = ?,
          reason = ?,
          amount = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      await executeQuery(updateQuery, [
        payment_date || oldExpense.payment_date,
        customer_name || oldExpense.title,
        details || oldExpense.details,
        paid_to || oldExpense.paid_to,
        remark || oldExpense.reason,
        amountNum !== null ? amountNum : oldExpense.amount,
        id
      ]);
      
      // Get updated data
      const newExpenseQuery = "SELECT * FROM expenses WHERE id = ?";
      const newExpenseData = await executeQuery(newExpenseQuery, [id]);
      const newExpense = newExpenseData[0];
      
      // Create audit log
      await createAuditLog({
        page: 'NB Expenses',
        uniqueCode: `EXPENSE-${id}`,
        section: 'Edit Expense',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Outward expense updated: ${newExpense.title} - ₹${newExpense.amount}`,
        oldValue: oldExpense,
        newValue: newExpense,
        recordType: 'nb_expense',
        recordId: parseInt(id)
      });
      
      return NextResponse.json({
        success: true,
        message: "Outward expense updated successfully",
        expense: {
          id: newExpense.id,
          customer_name: newExpense.title,
          amount: newExpense.amount,
          payment_date: newExpense.payment_date,
          remark: newExpense.reason,
          type: 'Outward',
          source_table: 'expense'
        }
      });
      
    } else if (tableName === 'recharge_wallet') {
      // Update recharge_wallets table (Inward cash transactions)
      const oldCashQuery = "SELECT * FROM recharge_wallets WHERE id = ?";
      const oldCashData = await executeQuery(oldCashQuery, [id]);
      
      if (oldCashData.length === 0) {
        return NextResponse.json(
          { 
            success: false,
            error: "Cash record not found" 
          },
          { status: 404 }
        );
      }
      
      const oldCash = oldCashData[0];
      
      // Get payment_type from body or use old value
      const payment_type = body.payment_type || oldCash.payment_type;
      
      // Update query for recharge_wallets
      const updateQuery = `
        UPDATE recharge_wallets 
        SET 
          payment_date = ?,
          comments = ?,
          amount = ?,
          payment_type = ?,
          updated_at = NOW()
        WHERE id = ?
      `;
      
      await executeQuery(updateQuery, [
        payment_date || oldCash.payment_date,
        remark || oldCash.comments,
        amountNum !== null ? amountNum : oldCash.amount,
        payment_type,
        id
      ]);
      
      // Get updated data
      const newCashQuery = `
        SELECT r.*, c.name as customer_name 
        FROM recharge_wallets r
        LEFT JOIN customers c ON r.com_id = c.id
        WHERE r.id = ?
      `;
      const newCashData = await executeQuery(newCashQuery, [id]);
      const newCash = newCashData[0];
      
      // Update cash balance
      if (oldCash.amount !== newCash.amount) {
        const diff = newCash.amount - oldCash.amount;
        await executeQuery(`
          UPDATE cash_balance 
          SET balance = COALESCE(balance, 0) + ? 
          WHERE id = 1
        `, [diff]);
      }
      
      // Create audit log
      await createAuditLog({
        page: 'Cash Balance',
        uniqueCode: `CASH-${id}`,
        section: 'Edit Cash',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Cash record updated: ₹${newCash.amount}`,
        oldValue: oldCash,
        newValue: newCash,
        recordType: 'cash_balance',
        recordId: parseInt(id)
      });
      
      return NextResponse.json({
        success: true,
        message: "Inward cash record updated successfully",
        expense: {
          id: newCash.id,
          customer_name: newCash.customer_name || 'Customer',
          amount: newCash.amount,
          payment_date: newCash.payment_date,
          payment_type: newCash.payment_type,
          remark: newCash.comments,
          type: 'Inward',
          source_table: 'recharge_wallet'
        }
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: "Invalid source table" 
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error("❌ Error in nb-expenses PUT:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to update record: " + error.message 
      },
      { status: 500 }
    );
  }
}