import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '5'; // Default role
    const employee_id = searchParams.get('employee_id') || '1'; // Default employee
    const module_name = 'nb_expenses';
    
    // Check permissions - try can_create first, fallback to can_delete
    let permissionQuery = `
      SELECT can_view, can_edit, can_create, can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND role = ? AND employee_id = ?
    `;
    
    let permissions = await executeQuery(permissionQuery, [module_name, role, employee_id]);
    
    // If can_create column doesn't exist, try without it
    if (permissions.length === 0) {
      permissionQuery = `
        SELECT can_view, can_edit, can_delete 
        FROM role_permissions 
        WHERE module_name = ? AND role = ? AND employee_id = ?
      `;
      permissions = await executeQuery(permissionQuery, [module_name, role, employee_id]);
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
    
    if (role !== '5' && employee_id) {
      expensesQuery += " WHERE employee_id = ?";
      queryParams.push(employee_id);
    }
    
    expensesQuery += " ORDER BY id DESC";
    
    const expenses = await executeQuery(expensesQuery, queryParams);
    
    const permData = permissions[0];
    return NextResponse.json({
      expenses,
      permissions: {
        can_view: permData.can_view === 1,
        can_edit: permData.can_edit === 1,
        can_create: permData.can_create === 1 || false,
        can_delete: permData.can_delete === 1 || false
      }
    });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { payment_date, title, details, paid_to, reason, amount, employee_id, role } = body;
    
    const module_name = 'nb_expenses';
    const permissionQuery = `
      SELECT can_edit 
      FROM role_permissions 
      WHERE module_name = ? AND role = ? AND employee_id = ?
    `;
    
    const permissions = await executeQuery(permissionQuery, [module_name, role, employee_id]);
    
    if (permissions.length === 0 || permissions[0].can_edit !== 1) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    const query = `
      INSERT INTO expenses (payment_date, title, details, paid_to, reason, amount, employee_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Get user info for audit log
    let userId = null;
    let userName = 'System';
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

    const result = await executeQuery(query, [
      payment_date, title, details, paid_to, reason, amount, employee_id
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
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const role = searchParams.get('role') || '5';
    const employee_id = searchParams.get('employee_id') || '1';
    const module_name = 'nb_expenses';
    
    const permissionQuery = `
      SELECT can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND role = ? AND employee_id = ?
    `;
    
    const permissions = await executeQuery(permissionQuery, [module_name, role, employee_id]);
    
    if (permissions.length === 0 || permissions[0].can_delete !== 1) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }
    
    if (role !== '5') {
      const checkOwnershipQuery = "SELECT employee_id FROM expenses WHERE id = ?";
      const expense = await executeQuery(checkOwnershipQuery, [id]);
      
      if (expense.length === 0 || expense[0].employee_id != employee_id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
    
    // Get expense data before deletion for audit log
    const expenseData = await executeQuery("SELECT * FROM expenses WHERE id = ?", [id]);
    
    // Get user info for audit log
    let userId = null;
    let userName = 'System';
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
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}