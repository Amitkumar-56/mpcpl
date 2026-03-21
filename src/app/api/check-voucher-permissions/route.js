// src/app/api/check-voucher-permissions/route.js
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
    console.log(`🔍 Checking voucher permissions: Employee=${employee_id}, Module=${module_name}, Action=${action}`);

    // 1. First check if employee exists and get role
    const userQuery = `SELECT id, role, status, name FROM employee_profile WHERE id = ?`;
    const userResult = await executeQuery(userQuery, [employee_id]);
    
    if (userResult.length === 0) {
      console.log(`❌ Employee ${employee_id} not found`);
      return NextResponse.json({ 
        allowed: false, 
        error: "Employee not found",
        employee_id,
        module_name,
        action
      });
    }
    
    const userData = userResult[0];
    const userRole = userData.role;
    const userStatus = userData.status;
    const userName = userData.name;
    
    console.log(`✅ Employee found: ${userName} (ID=${employeeId}, Role=${userRole}, Status=${userStatus})`);

    // 2. Check if employee is active
    if (!userStatus) {
      return NextResponse.json({ 
        allowed: false, 
        error: "Employee account is inactive",
        employee_id,
        module_name,
        action,
        userName,
        userRole
      });
    }

    // 3. Role-based auto-grant (similar to voucher-wallet-driver-emp)
    let permissions = {
      module_name: module_name,
      can_view: 0,
      can_edit: 0,
      can_create: 0
    };

    // Auto-grant full permissions for admin roles (5,4,3,7)
    if (userRole == 5 || userRole == 4 || userRole == 3 || userRole == 7) {
      permissions = {
        module_name: module_name,
        can_view: 1,
        can_edit: 1,
        can_create: 1
      };
      console.log(`Auto-granted full permissions for admin role ${userRole}`);
      
      const allowed = permissions[action] === 1;
      console.log(`📊 Final Permission Check:
        Employee: ${userName} (ID: ${employeeId})
        Role: ${userRole}
        Module: ${module_name}
        Action: ${action}
        Permission Value: ${permissions[action]}
        Converted to Boolean: ${allowed}
        Check Type: auto_grant
        Result: ${allowed ? '✅ ALLOWED' : '❌ DENIED'}`);

      return NextResponse.json({ 
        allowed,
        userRole,
        userName,
        checkType: 'auto_grant',
        permission_value: permissions[action],
        employee_id,
        module_name,
        action,
        message: allowed ? "Permission granted (auto-grant)" : "Permission denied (auto-grant)"
      });
    } else {
      // Check role_permissions for other roles
      const permissionsQuery = `
        SELECT module_name, can_view, can_edit, can_create 
        FROM role_permissions 
        WHERE module_name = ? AND role = ?
      `;
      const permissionsResult = await executeQuery(permissionsQuery, [module_name, userRole]);
      
      if (permissionsResult.length > 0) {
        permissions = permissionsResult[0];
      }
      
      const allowed = permissions[action] === 1;
      console.log(`📊 Final Permission Check:
        Employee: ${userName} (ID: ${employeeId})
        Role: ${userRole}
        Module: ${module_name}
        Action: ${action}
        Permission Value: ${permissions[action]}
        Converted to Boolean: ${allowed}
        Check Type: role_based
        Result: ${allowed ? '✅ ALLOWED' : '❌ DENIED'}`);

      return NextResponse.json({ 
        allowed,
        userRole,
        userName,
        checkType: 'role_based',
        permission_value: permissions[action],
        employee_id,
        module_name,
        action,
        message: allowed ? "Permission granted (role-based)" : "Permission denied (role-based)"
      });
    }

  } catch (err) {
    console.error('🚨 Permission check error:', err);
    return NextResponse.json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}
