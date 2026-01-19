// src/app/api/nb-expenses/route.js
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
    
    // Default permissions if not found
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
    
    // Get user details from database
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
    console.log(`✅ User authenticated: ${user.name} (ID: ${user.id}, Role: ${user.role})`);
    
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

// GET - Fetch expenses
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
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
    
    // Check permissions for both module name formats
    const permissions1 = await checkUserPermissions(userId, 'nb_expenses');
    const permissions2 = await checkUserPermissions(userId, 'NB Expenses');
    
    // Merge permissions (if any module has permission, allow)
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
    
    // Build query
    let expensesQuery = `
      SELECT e.*
      FROM expenses e
      WHERE 1=1
    `;
    
    let queryParams = [];
    
    // Add search filter if provided
    const search = searchParams.get('search');
    if (search) {
      expensesQuery += " AND (e.title LIKE ? OR e.details LIKE ? OR e.paid_to LIKE ? OR e.reason LIKE ?) ";
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Add date filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    if (dateFrom) {
      expensesQuery += " AND e.payment_date >= ? ";
      queryParams.push(dateFrom);
    }
    
    if (dateTo) {
      expensesQuery += " AND e.payment_date <= ? ";
      queryParams.push(dateTo);
    }
    
    // Add amount filters
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    
    if (minAmount) {
      expensesQuery += " AND e.amount >= ? ";
      queryParams.push(parseFloat(minAmount));
    }
    
    if (maxAmount) {
      expensesQuery += " AND e.amount <= ? ";
      queryParams.push(parseFloat(maxAmount));
    }
    
    // Add ordering and pagination
    expensesQuery += " ORDER BY e.payment_date DESC, e.id DESC ";
    
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const offset = (page - 1) * limit;
    
    // FIX: Ensure LIMIT and OFFSET are numbers
    const limitNum = Number(limit);
    const offsetNum = Number(offset);
    
    // Clone parameters for count query BEFORE adding pagination
    const countParams = [...queryParams];
    
    // Add pagination to main query
    expensesQuery += " LIMIT ? OFFSET ? ";
    queryParams.push(limitNum, offsetNum);
    
    console.log('🔍 Executing expenses query:', expensesQuery);
    console.log('🔍 Query params:', queryParams);
    
    const expenses = await executeQuery(expensesQuery, queryParams);
    
    // Get total count for pagination (without pagination)
    let countQuery = "SELECT COUNT(*) as total FROM expenses e WHERE 1=1";
    
    // Add the same filters to count query
    if (search) {
      countQuery += " AND (e.title LIKE ? OR e.details LIKE ? OR e.paid_to LIKE ? OR e.reason LIKE ?) ";
    }
    
    if (dateFrom) {
      countQuery += " AND e.payment_date >= ? ";
    }
    
    if (dateTo) {
      countQuery += " AND e.payment_date <= ? ";
    }
    
    if (minAmount) {
      countQuery += " AND e.amount >= ? ";
    }
    
    if (maxAmount) {
      countQuery += " AND e.amount <= ? ";
    }
    
    const countResult = await executeQuery(countQuery, countParams);
    const totalCount = countResult[0]?.total || 0;
    
    return NextResponse.json({
      success: true,
      expenses: expenses || [],
      permissions: permissions,
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
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      sql: error.sql
    });
    
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? error.message 
      : "Internal server error";
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage 
      },
      { status: 500 }
    );
  }
}

// POST - Create new expense
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
    const { payment_date, title, details, paid_to, reason, amount } = body;
    
    // Validate required fields
    if (!payment_date || !title || !amount) {
      return NextResponse.json(
        { 
          success: false,
          error: "Payment date, title and amount are required fields." 
        },
        { status: 400 }
      );
    }
    
    // FIX: Check if employee_id column exists before including it
    let columnCheck = null;
    let hasEmployeeIdColumn = false;
    try {
      columnCheck = await executeQuery(`
        SELECT COUNT(*) as col_count 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'expenses' 
        AND COLUMN_NAME = 'employee_id'
      `);
      hasEmployeeIdColumn = columnCheck && columnCheck.length > 0 && columnCheck[0].col_count > 0;
    } catch (err) {
      console.log('Could not check for employee_id column');
      hasEmployeeIdColumn = false;
    }
    
    let query, params;
    if (hasEmployeeIdColumn) {
      query = `
        INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, employee_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      params = [
        payment_date, 
        title || '', 
        details || '', 
        paid_to || '', 
        reason || '', 
        parseFloat(amount), 
        userId
      ];
    } else {
      query = `
        INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      params = [
        payment_date, 
        title || '', 
        details || '', 
        paid_to || '', 
        reason || '', 
        parseFloat(amount)
      ];
    }
    
    const result = await executeQuery(query, params);
    
    // Create audit log
    await createAuditLog({
      page: 'NB Expenses',
      uniqueCode: `EXPENSE-${result.insertId}`,
      section: 'Add Expense',
      userId: userId,
      userName: userName,
      action: 'add',
      remarks: `Expense added: ${title} - ₹${amount} to ${paid_to}`,
      oldValue: null,
      newValue: { 
        id: result.insertId,
        title, 
        amount, 
        paid_to, 
        reason, 
        payment_date
      },
      recordType: 'nb_expense',
      recordId: result.insertId
    });
    
    return NextResponse.json({
      success: true,
      message: "Expense created successfully",
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

// PUT - Update expense
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
    const { id, payment_date, title, details, paid_to, reason, amount } = body;
    
    if (!id) {
      return NextResponse.json(
        { 
          success: false,
          error: "Expense ID is required" 
        },
        { status: 400 }
      );
    }
    
    // Get old expense data
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
    
    // Update the expense
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
      title || oldExpense.title,
      details || oldExpense.details,
      paid_to || oldExpense.paid_to,
      reason || oldExpense.reason,
      amount ? parseFloat(amount) : oldExpense.amount,
      id
    ]);
    
    // Get updated expense data
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
      remarks: `Expense updated: ${newExpense.title} - ₹${newExpense.amount}`,
      oldValue: oldExpense,
      newValue: newExpense,
      recordType: 'nb_expense',
      recordId: parseInt(id)
    });
    
    console.log(`✅ Expense ${id} updated by ${userName} (ID: ${userId})`);
    
    return NextResponse.json({
      success: true,
      message: "Expense updated successfully",
      expense: newExpense
    });
    
  } catch (error) {
    console.error("❌ Error in nb-expenses PUT:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Failed to update expense: " + error.message 
      },
      { status: 500 }
    );
  }
}