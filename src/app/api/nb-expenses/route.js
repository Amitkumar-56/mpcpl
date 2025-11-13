import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || '5'; // Default role
    const employee_id = searchParams.get('employee_id') || '1'; // Default employee
    const module_name = 'nb_expenses';
    
    // Check permissions
    const permissionQuery = `
      SELECT can_view, can_edit, can_delete 
      FROM role_permissions 
      WHERE module_name = ? AND role = ? AND employee_id = ?
    `;
    
    const permissions = await executeQuery(permissionQuery, [module_name, role, employee_id]);
    
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
    
    return NextResponse.json({
      expenses,
      permissions: permissions[0]
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
    
    const result = await executeQuery(query, [
      payment_date, title, details, paid_to, reason, amount, employee_id
    ]);
    
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
    
    await executeQuery("DELETE FROM expenses WHERE id = ?", [id]);
    
    return NextResponse.json({ message: "Deleted successfully" });
    
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}