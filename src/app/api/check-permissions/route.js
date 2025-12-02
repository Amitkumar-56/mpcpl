
// src/app/api/check-permissions/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const employee_id = parseInt(searchParams.get("employee_id"));
  const module_name = searchParams.get("module_name");
  const action = searchParams.get("action"); // can_view, can_edit, can_delete

  // ✅ Validate input
  if (!employee_id || !module_name || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // ⚠️ Make sure action is a valid column to prevent SQL injection
    const allowedActions = ["can_view", "can_edit", "can_delete"];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action parameter" }, { status: 400 });
    }

    // ✅ FIX: First get user's role from employee_profile
    const userQuery = `SELECT role FROM employee_profile WHERE id = ?`;
    const userResult = await executeQuery(userQuery, [employee_id]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ allowed: false, error: "User not found" });
    }
    
    const userRole = userResult[0].role;

    // ✅ FIX: Check permissions with employee_id AND role (as per database structure)
    // First check for employee-specific permissions
    let query = `
      SELECT ${action} as permission, role
      FROM role_permissions
      WHERE employee_id = ? AND module_name = ?
      LIMIT 1
    `;
    let result = await executeQuery(query, [employee_id, module_name]);

    // If no employee-specific permission found, check role-based permissions
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission, role
        FROM role_permissions
        WHERE role = ? AND module_name = ? AND (employee_id IS NULL OR employee_id = 0)
        LIMIT 1
      `;
      result = await executeQuery(query, [userRole, module_name]);
    }

    // ✅ FIX: Also check if employee_id matches AND role matches (for cases where both are set)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission
        FROM role_permissions
        WHERE employee_id = ? AND role = ? AND module_name = ?
        LIMIT 1
      `;
      result = await executeQuery(query, [employee_id, userRole, module_name]);
    }

    const allowed = result.length > 0 && result[0].permission === 1;
    
    console.log(`🔐 Permission check - Employee ID: ${employee_id}, Role: ${userRole}, Module: ${module_name}, Action: ${action}, Allowed: ${allowed}`);
    
    return NextResponse.json({ allowed });
  } catch (err) {
    console.error('❌ Permission check error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
