import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const employee_id = parseInt(searchParams.get("employee_id"));
  const module_name = searchParams.get("module_name");
  const action = searchParams.get("action");

  if (!employee_id || !module_name || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    const allowedActions = ["can_view", "can_edit", "can_delete"];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });
    }

    // Get user's role
    const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
    const userResult = await executeQuery(userQuery, [employee_id]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ allowed: false, error: "User not found" });
    }
    
    const userRole = userResult[0].role;

    // Check permissions in priority order
    let query = '';
    let result = [];
    
    // 1. Check employee-specific permissions (highest priority)
    query = `
      SELECT ${action} as permission
      FROM role_permissions
      WHERE employee_id = ? AND module_name = ?
      LIMIT 1
    `;
    result = await executeQuery(query, [employee_id, module_name]);

    // 2. Check role-based permissions for this specific module
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission
        FROM role_permissions
        WHERE role = ? AND module_name = ? AND (employee_id IS NULL OR employee_id = 0)
        LIMIT 1
      `;
      result = await executeQuery(query, [userRole, module_name]);
    }

    // 3. Check general role permissions (without module)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission
        FROM role_permissions
        WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)
        LIMIT 1
      `;
      result = await executeQuery(query, [userRole]);
    }

    const allowed = result.length > 0 && result[0].permission === 1;
    
    return NextResponse.json({ 
      allowed,
      userRole,
      checkType: result.length > 0 ? 'found' : 'not_found'
    });
  } catch (err) {
    console.error('Permission check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}