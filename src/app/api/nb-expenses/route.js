import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken, getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    // Try both module name formats
    let module_name = 'nb_expenses';
    const altModuleName = 'NB Expenses';
    
    // Get current logged-in user - with retry mechanism
    let userId = null;
    let userRole = null;
    
    // First attempt: Try getCurrentUser
    try {
      const currentUser = await getCurrentUser();
      if (currentUser && currentUser.userId) {
        userId = currentUser.userId;
        userRole = currentUser.role;
        console.log('✅ [NB Expenses] User authenticated via getCurrentUser:', { userId, userRole });
      }
    } catch (getUserError) {
      // Silent error - don't log warnings for normal auth failures
    }
    
    // Second attempt: Try token-based authentication if getCurrentUser failed
    if (!userId) {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        
        if (token) {
          try {
            const decoded = verifyToken(token);
            if (decoded) {
              userId = decoded.userId || decoded.id;
              console.log('✅ [NB Expenses] User authenticated via token:', userId);
              
              // Get role from database
              if (userId) {
                try {
                  const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
                  const users = await executeQuery(userQuery, [userId]);
                  if (users.length > 0) {
                    userRole = users[0].role;
                    console.log('✅ [NB Expenses] User role fetched:', userRole);
                  }
                } catch (roleError) {
                  // Silent error - don't log warnings for normal failures
                }
              }
            }
            // Don't log warnings for invalid tokens - it's a normal auth check
          } catch (verifyError) {
            // Silent error - don't log warnings for normal auth failures
          }
        }
        // Don't log warnings if no token - it's a normal auth check
      } catch (tokenError) {
        // Only log if it's an unexpected error
        if (tokenError.message && !tokenError.message.includes('cookies')) {
          console.error('❌ [NB Expenses] Token fallback failed:', tokenError.message);
        }
      }
    }

    // Final check - if still no userId, return unauthorized
    if (!userId) {
      // Don't log - normal for unauthenticated requests (browser refresh, expired session, etc.)
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
    
    // If still no permissions, try alternative module name
    if (permissions.length === 0) {
      permissionQuery = `
        SELECT can_view, can_edit, can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND employee_id = ?
      `;
      permissions = await executeQuery(permissionQuery, [altModuleName, userId]);
    }
    
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT can_view, can_edit, can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [altModuleName, userRole]);
    }
    
    // Try to get can_create if column exists
    let canCreate = false;
    try {
      const fullPermissionQuery = `
        SELECT can_view, can_edit, can_create, can_delete 
        FROM role_permissions 
        WHERE (module_name = ? OR module_name = ?) AND employee_id = ?
      `;
      const fullPermissions = await executeQuery(fullPermissionQuery, [module_name, altModuleName, userId]);
      if (fullPermissions.length > 0 && fullPermissions[0].hasOwnProperty('can_create')) {
        canCreate = fullPermissions[0].can_create === 1;
      }
    } catch (e) {
      // can_create column doesn't exist, use false
      canCreate = false;
    }
    
    // Default allow view if no permissions found (for backward compatibility)
    let permissionData = {
      can_view: 1,
      can_edit: 0,
      can_delete: 0
    };
    
    if (permissions.length > 0) {
      permissionData = permissions[0];
    }
    
    if (permissions.length > 0 && permissionData.can_view !== 1) {
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
    
    return NextResponse.json({
      expenses: expenses || [],
      permissions: {
        can_view: permissionData.can_view === 1,
        can_edit: permissionData.can_edit === 1 || false,
        can_create: canCreate,
        can_delete: permissionData.can_delete === 1 || false
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
    
    // Try both module name formats
    let module_name = 'nb_expenses';
    const altModuleName = 'NB Expenses';
    
    // Check permissions - try employee-specific first
    let permissionQuery = `
      SELECT can_edit, can_create 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);
    
    // If no employee-specific permissions, try alternative module name
    if (permissions.length === 0) {
      permissions = await executeQuery(permissionQuery, [altModuleName, userId]);
    }
    
    // If no employee-specific permissions, try role-based
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT can_edit, can_create 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [module_name, userRole]);
      
      // Try alternative module name
      if (permissions.length === 0) {
        permissions = await executeQuery(permissionQuery, [altModuleName, userRole]);
      }
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
    
    // Try both module name formats
    let module_name = 'nb_expenses';
    const altModuleName = 'NB Expenses';
    
    // Check permissions - try employee-specific first
    let permissionQuery = `
      SELECT can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND employee_id = ?
    `;
    
    let permissions = await executeQuery(permissionQuery, [module_name, userId]);
    
    // If no employee-specific permissions, try alternative module name
    if (permissions.length === 0) {
      permissions = await executeQuery(permissionQuery, [altModuleName, userId]);
    }
    
    // If no employee-specific permissions, try role-based
    if (permissions.length === 0 && userRole) {
      permissionQuery = `
        SELECT can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND (employee_id IS NULL OR employee_id = 0)
      `;
      permissions = await executeQuery(permissionQuery, [module_name, userRole]);
      
      // Try alternative module name
      if (permissions.length === 0) {
        permissions = await executeQuery(permissionQuery, [altModuleName, userRole]);
      }
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