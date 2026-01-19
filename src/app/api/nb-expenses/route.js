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

// GET - Fetch expenses
export async function GET(request) {
  console.log('🚀 API: nb-expenses GET called');
  
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
    
    // Build base query
    let query = `
      SELECT 
        id,
        payment_date,
        title,
        details,
        paid_to,
        reason,
        amount
      FROM expenses 
      WHERE 1=1
    `;
    
    let params = [];
    
    // Search filter
    const search = searchParams.get('search');
    if (search && search.trim() !== '') {
      query += " AND (title LIKE ? OR details LIKE ? OR paid_to LIKE ? OR reason LIKE ?) ";
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    // Date filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    
    if (dateFrom && dateFrom.trim() !== '') {
      query += " AND payment_date >= ? ";
      params.push(dateFrom.trim());
    }
    
    if (dateTo && dateTo.trim() !== '') {
      query += " AND payment_date <= ? ";
      params.push(dateTo.trim());
    }
    
    // Amount filters
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');
    
    if (minAmount && minAmount.trim() !== '') {
      query += " AND amount >= ? ";
      params.push(parseFloat(minAmount));
    }
    
    if (maxAmount && maxAmount.trim() !== '') {
      query += " AND amount <= ? ";
      params.push(parseFloat(maxAmount));
    }
    
    // Add ordering
    query += " ORDER BY payment_date DESC, id DESC ";
    
    // **FIX: MySQL prepared statements issue with LIMIT/OFFSET**
    // Add pagination directly in query string (not as parameters)
    query += ` LIMIT ${limit} OFFSET ${offset}`;
    
    console.log('🔍 Final Query:', query);
    console.log('🔍 Query Params:', params);
    
    // Execute query
    const expenses = await executeQuery(query, params);
    console.log(`✅ Retrieved ${expenses?.length || 0} expenses`);
    
    // Get total count (without pagination)
    let countQuery = "SELECT COUNT(*) as total FROM expenses WHERE 1=1";
    let countParams = [];
    
    // Apply same filters to count query
    if (search && search.trim() !== '') {
      countQuery += " AND (title LIKE ? OR details LIKE ? OR paid_to LIKE ? OR reason LIKE ?) ";
      const searchTerm = `%${search.trim()}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (dateFrom && dateFrom.trim() !== '') {
      countQuery += " AND payment_date >= ? ";
      countParams.push(dateFrom.trim());
    }
    
    if (dateTo && dateTo.trim() !== '') {
      countQuery += " AND payment_date <= ? ";
      countParams.push(dateTo.trim());
    }
    
    if (minAmount && minAmount.trim() !== '') {
      countQuery += " AND amount >= ? ";
      countParams.push(parseFloat(minAmount));
    }
    
    if (maxAmount && maxAmount.trim() !== '') {
      countQuery += " AND amount <= ? ";
      countParams.push(parseFloat(maxAmount));
    }
    
    const countResult = await executeQuery(countQuery, countParams);
    const totalCount = countResult[0]?.total || 0;
    
    console.log(`📊 Total expenses count: ${totalCount}`);
    
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
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message 
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
    
    // Insert query
    const query = `
      INSERT INTO expenses 
        (payment_date, title, details, paid_to, reason, amount, created_at)
      VALUES 
        (?, ?, ?, ?, ?, ?, NOW())
    `;
    
    const params = [
      payment_date, 
      title || '', 
      details || '', 
      paid_to || '', 
      reason || '', 
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
      remarks: `Expense added: ${title} - ₹${amountNum} to ${paid_to}`,
      oldValue: null,
      newValue: { 
        id: result.insertId,
        title, 
        amount: amountNum, 
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
    
    // Get old data
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
    
    // Update query
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
      remarks: `Expense updated: ${newExpense.title} - ₹${newExpense.amount}`,
      oldValue: oldExpense,
      newValue: newExpense,
      recordType: 'nb_expense',
      recordId: parseInt(id)
    });
    
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