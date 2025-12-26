import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken, getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const module_name = 'nb_expenses';
    
    // Get current logged-in user
    let userId = null;
    let userRole = null;
    
    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.userId) {
        userId = currentUser.userId;
        userRole = currentUser.role;
      } else {
        // Fallback: Try to get from query params or token
        userId = searchParams.get('employee_id');
        userRole = searchParams.get('role') || '5';
        
        if (!userId) {
          const cookieStore = await cookies();
          const token = cookieStore.get('token')?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              userId = decoded.userId || decoded.id;
              // Get role from database
              const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
              const users = await executeQuery(userQuery, [userId]);
              if (users.length > 0) {
                userRole = users[0].role;
              }
            }
          }
        }
      }
    } catch (authError) {
      console.error('Error getting current user:', authError);
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please login again." },
        { status: 401 }
      );
    }
    
    // Check permissions - try with can_create first, fallback if column doesn't exist
    let permissionQuery = `
      SELECT can_view, can_edit, can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);
    
    // If no employee-specific permissions, try role-based
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT can_view, can_edit, can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [module_name, userRole]);
    }
    
    // Try to get can_create if column exists
    let canCreate = false;
    try {
      const fullPermissionQuery = `
        SELECT can_view, can_edit, can_create, can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND employee_id = ?
      `;
      const fullPermissions = await executeQuery(fullPermissionQuery, [module_name, userId]);
      if (fullPermissions.length > 0 && fullPermissions[0].hasOwnProperty('can_create')) {
        canCreate = fullPermissions[0].can_create === 1;
      }
    } catch (e) {
      // can_create column doesn't exist, use false
      canCreate = false;
    }
    
    if (permissions.length === 0 || permissions[0].can_view !== 1) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Fetch expenses
    let expensesQuery = "SELECT * FROM expenses";
    let queryParams = [];
    
    // If not admin (role 5), only show user's own expenses
    if (userRole !== '5' && userRole !== 5) {
      expensesQuery += " WHERE employee_id = ?";
      queryParams.push(userId);
    }
    
    expensesQuery += " ORDER BY id DESC";
    
    const expenses = await executeQuery(expensesQuery, queryParams);
    
    const permData = permissions[0];
    return NextResponse.json({
      expenses: expenses || [],
      permissions: {
        can_view: permData.can_view === 1,
        can_edit: permData.can_edit === 1 || false,
        can_create: canCreate,
        can_delete: permData.can_delete === 1 || false
      }
    });
    
  } catch (error) {
    console.error("Error in nb-expenses GET:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { error: "Server error: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { payment_date, title, details, paid_to, reason, amount, employee_id: bodyEmployeeId, role: bodyRole } = body;
    
    // Get current logged-in user
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.userId) {
      return NextResponse.json({ error: "Unauthorized. Please login again." }, { status: 401 });
    }
    
    const userId = currentUser.userId;
    const userRole = currentUser.role;
    
    // Use employee_id from body if provided, otherwise use logged-in user
    const finalEmployeeId = bodyEmployeeId || userId;
    
    const module_name = 'nb_expenses';
    
    // Check permissions - try employee-specific first
    let permissionQuery = `
      SELECT can_edit, can_create 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);
    
    // If no employee-specific permissions, try role-based
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT can_edit, can_create 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [module_name, userRole]);
    }
    
    // Check if user has can_edit or can_create permission
    const hasPermission = permissions.length > 0 && (
      permissions[0].can_edit === 1 || 
      (permissions[0].can_create === 1) ||
      (permissions[0].hasOwnProperty('can_create') && permissions[0].can_create === 1)
    );
    
    if (!hasPermission) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    const query = `
      INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, employee_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Get user name for audit log
    let userName = currentUser.userName || 'System';
    try {
      if (!userName || userName === 'System') {
        const users = await executeQuery(
          `SELECT id, name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0) {
          userName = users[0].name;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    const result = await executeQuery(query, [
      payment_date, title, details, paid_to, reason, amount, finalEmployeeId
    ]);
    
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
      newValue: { title, amount, paid_to, reason, payment_date },
      recordType: 'nb_expense',
      recordId: result.insertId
    });
    
    return NextResponse.json({
      message: "Expense created",
      id: result.insertId
    });
    
  } catch (error) {
    console.error("Error in nb-expenses POST:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ 
      error: "Failed to create expense: " + (error.message || "Unknown error") 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }
    
    // Get current logged-in user
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.userId) {
      return NextResponse.json({ error: "Unauthorized. Please login again." }, { status: 401 });
    }
    
    const userId = currentUser.userId;
    const userRole = currentUser.role;
    
    const module_name = 'nb_expenses';
    
    // Check permissions - try employee-specific first
    let permissionQuery = `
      SELECT can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);
    
    // If no employee-specific permissions, try role-based
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [module_name, userRole]);
    }
    
    if (permissions.length === 0 || permissions[0].can_delete !== 1) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    // If not admin, check ownership
    if (userRole !== '5' && userRole !== 5) {
      const checkOwnershipQuery = "SELECT employee_id FROM expenses WHERE id = ?";
      const expense = await executeQuery(checkOwnershipQuery, [id]);
      
      if (expense.length === 0 || expense[0].employee_id != userId) {
        return NextResponse.json({ error: "Access denied. You can only delete your own expenses." }, { status: 403 });
      }
    }
    
    // Get expense data before deletion for audit log
    const expenseData = await executeQuery("SELECT * FROM expenses WHERE id = ?", [id]);
    
    // Get user name for audit log
    let userName = currentUser.userName || 'System';
    try {
      if (!userName || userName === 'System') {
        const users = await executeQuery(
          `SELECT id, name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0) {
          userName = users[0].name;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    await executeQuery("DELETE FROM expenses WHERE id = ?", [id]);
    
    // Create audit log
    if (expenseData.length > 0) {
      const expense = expenseData[0];
      await createAuditLog({
        page: 'NB Expenses',
        uniqueCode: `EXPENSE-${id}`,
        section: 'Delete Expense',
        userId: userId,
        userName: userName,
        action: 'delete',
        remarks: `Expense deleted: ${expense.title} - ₹${expense.amount}`,
        oldValue: expense,
        newValue: null,
        recordType: 'nb_expense',
        recordId: parseInt(id)
      });
    }
    
    return NextResponse.json({ message: "Deleted successfully" });
    
  } catch (error) {
    console.error("Error in nb-expenses DELETE:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json({ 
      error: "Failed to delete expense: " + (error.message || "Unknown error") 
    }, { status: 500 });
  }
}