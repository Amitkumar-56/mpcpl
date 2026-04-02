//src/
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { user_id, user_role, module_name } = body;

    if (!user_id || !module_name) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    console.log(`🔍 POST Permission Check: User=${user_id}, Role=${user_role}, Module=${module_name}`);

    // Get user info
    const userQuery = `SELECT id, role, status, name FROM employee_profile WHERE id = ?`;
    const userResult = await executeQuery(userQuery, [user_id]);
    
    if (userResult.length === 0) {
      return NextResponse.json({ 
        permissions: { can_view: false, can_edit: false, can_create: false },
        error: "Employee not found"
      });
    }

    const userData = userResult[0];
    const userRole = userData.role;

    // Admin always has full access
    if (userRole === '5' || Number(userRole) === 5) {
      return NextResponse.json({ 
        permissions: { can_view: true, can_edit: true, can_create: true },
        userRole,
        checkType: 'admin_full_access'
      });
    }

    // Check role-based permissions
    const query = `
      SELECT can_view, can_edit, can_create
      FROM role_permissions
      WHERE role = ? 
        AND module_name = ? 
        AND (employee_id IS NULL OR employee_id = 0)
      LIMIT 1
    `;

    const result = await executeQuery(query, [user_role, module_name]);
    
    if (result.length > 0) {
      const permissions = {
        can_view: result[0].can_view === 1,
        can_edit: result[0].can_edit === 1,
        can_create: result[0].can_create === 1
      };
      
      return NextResponse.json({ 
        permissions,
        userRole,
        checkType: 'role_based'
      });
    }

    // Check employee-specific permissions
    const empQuery = `
      SELECT can_view, can_edit, can_create
      FROM role_permissions
      WHERE employee_id = ? 
        AND module_name = ?
      LIMIT 1
    `;

    const empResult = await executeQuery(empQuery, [user_id, module_name]);
    
    if (empResult.length > 0) {
      const permissions = {
        can_view: empResult[0].can_view === 1,
        can_edit: empResult[0].can_edit === 1,
        can_create: empResult[0].can_create === 1
      };
      
      return NextResponse.json({ 
        permissions,
        userRole,
        checkType: 'employee_specific'
      });
    }

    // No permissions found
    return NextResponse.json({ 
      permissions: { can_view: false, can_edit: false, can_create: false },
      userRole,
      checkType: 'no_permissions'
    });

  } catch (error) {
    console.error('🚨 POST Permission check error:', error);
    return NextResponse.json({ 
      permissions: { can_view: false, can_edit: false, can_create: false },
      error: error.message
    }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const employee_id = parseInt(searchParams.get("employee_id"));
  const module_name = searchParams.get("module_name");
  const action = searchParams.get("action");

  if (!employee_id || !module_name || !action) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // Define allowed actions
    const allowedActions = ["can_view", "can_edit", "can_create"];
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ 
        error: "Invalid action parameter. Allowed: can_view, can_edit, can_create" 
      }, { status: 400 });
    }
    
    // Helper function to convert database value to boolean
    const toBool = (v) => {
      if (v === undefined || v === null) return false;
      if (v === true || v === 1) return true;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'yes' || s === 'enable' || s === 'on';
      }
      return false;
    };

    console.log(`🔍 Checking permissions: Employee=${employee_id}, Module=${module_name}, Action=${action}`);

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
    
    console.log(`✅ Employee found: ${userName} (ID=${employee_id}, Role=${userRole}, Status=${userStatus})`);

    // Only Admin (role 5) always has full access - no automatic permissions for other roles
    if (userRole === '5' || Number(userRole) === 5) {
      console.log(`✅ Admin (role 5) has full access - automatically allowed`);
      return NextResponse.json({ 
        allowed: true,
        userRole,
        userName,
        checkType: 'admin_full_access',
        employee_id,
        module_name,
        action,
        message: "Admin has full access"
      });
    }

    // Check if employee is active
    if (!toBool(userStatus)) {
      console.log(`❌ Employee ${employee_id} is inactive`);
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

    // 3. Check permissions in role_permissions table
    let query = '';
    let result = [];
    let checkType = 'not_found';
    
    // **STRATEGY: Check in this order:**
    // 1. First: employee_id AND module_name (employee-specific, most important)
    // 2. Second: role AND module_name (role-based for all)
    // 3. Third: module_name only (global permission)

    // Check 1: employee_id + module_name (employee-specific, most important)
    query = `
      SELECT ${action} as permission_value, employee_id, role, module_name
      FROM role_permissions
      WHERE employee_id = ? 
        AND module_name = ?
      LIMIT 1
    `;
    
    console.log(`📝 Query 1: Checking employee_id=${employee_id} AND module=${module_name} (employee-specific)`);
    result = await executeQuery(query, [employee_id, module_name]);
    
    if (result.length > 0) {
      checkType = 'employee_specific';
      console.log(`✅ Found employee-specific permission`);
    }

    // Check 2: role + module_name (role-based for all)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission_value, role, module_name
        FROM role_permissions
        WHERE role = ? 
          AND module_name = ? 
          AND (employee_id IS NULL OR employee_id = 0 OR employee_id = '')
        LIMIT 1
      `;
      
      console.log(`📝 Query 2: Checking role=${userRole} AND module=${module_name} (role-based)`);
      result = await executeQuery(query, [userRole, module_name]);
      
      if (result.length > 0) {
        checkType = 'role_based';
        console.log(`✅ Found role-based permission`);
      }
    }

    // Check 3: module_name only (global permission)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission_value, module_name
        FROM role_permissions
        WHERE module_name = ? 
          AND (employee_id IS NULL OR employee_id = 0 OR employee_id = '')
          AND (role IS NULL OR role = 0 OR role = '')
        LIMIT 1
      `;
      
      console.log(`📝 Query 3: Checking module=${module_name} only (global)`);
      result = await executeQuery(query, [module_name]);
      
      if (result.length > 0) {
        checkType = 'global';
        console.log(`✅ Found global permission`);
      }
    }

    // If no permissions found at all
    if (result.length === 0) {
      console.log(`❌ No permissions found for Employee=${employee_id}, Module=${module_name}`);
      return NextResponse.json({ 
        allowed: false,
        userRole,
        userName,
        checkType,
        employee_id,
        module_name,
        action,
        message: "No permission record found"
      });
    }

    // Check if permission is granted
    const permissionValue = result[0].permission_value;
    const allowed = toBool(permissionValue);
    
    console.log(`📊 Final Permission Check:
      Employee: ${userName} (ID: ${employee_id})
      Role: ${userRole}
      Module: ${module_name}
      Action: ${action}
      Permission Value: ${permissionValue}
      Converted to Boolean: ${allowed}
      Check Type: ${checkType}
      Result: ${allowed ? '✅ ALLOWED' : '❌ DENIED'}`);

    return NextResponse.json({ 
      allowed,
      userRole,
      userName,
      checkType,
      permission_value: permissionValue,
      employee_id,
      module_name,
      action,
      message: allowed ? "Permission granted" : "Permission denied"
    });

  } catch (err) {
    console.error('🚨 Permission check error:', err);
    return NextResponse.json({ 
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 });
  }
}