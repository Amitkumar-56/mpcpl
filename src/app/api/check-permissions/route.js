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

    // 2. Admin (role 5) always has full access
    if (Number(userRole) === 5) {
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
    // 1. First: employee_id AND role AND module_name (exact match)
    // 2. Second: employee_id AND module_name (ignore role)
    // 3. Third: role AND module_name (role-based for all)
    // 4. Fourth: module_name only (global permission)

    // Check 1: employee_id + role + module_name (सबसे specific)
    query = `
      SELECT ${action} as permission_value, employee_id, role, module_name
      FROM role_permissions
      WHERE employee_id = ? 
        AND role = ? 
        AND module_name = ?
      LIMIT 1
    `;
    
    console.log(`📝 Query 1: Checking employee_id=${employee_id} AND role=${userRole} AND module=${module_name}`);
    result = await executeQuery(query, [employee_id, userRole, module_name]);
    
    if (result.length > 0) {
      checkType = 'employee_and_role_specific';
      console.log(`✅ Found specific permission: Employee+Role+Module match`);
    }

    // Check 2: employee_id + module_name (employee-specific, role ignore)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission_value, employee_id, role, module_name
        FROM role_permissions
        WHERE employee_id = ? 
          AND module_name = ?
          AND (role IS NULL OR role = 0 OR role = ?)
        LIMIT 1
      `;
      
      console.log(`📝 Query 2: Checking employee_id=${employee_id} AND module=${module_name} (role ignored)`);
      result = await executeQuery(query, [employee_id, module_name, userRole]);
      
      if (result.length > 0) {
        checkType = 'employee_specific';
        console.log(`✅ Found employee-specific permission`);
      }
    }

    // Check 3: role + module_name (role-based for all)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission_value, role, module_name
        FROM role_permissions
        WHERE role = ? 
          AND module_name = ? 
          AND (employee_id IS NULL OR employee_id = 0 OR employee_id = '')
        LIMIT 1
      `;
      
      console.log(`📝 Query 3: Checking role=${userRole} AND module=${module_name} (role-based)`);
      result = await executeQuery(query, [userRole, module_name]);
      
      if (result.length > 0) {
        checkType = 'role_based';
        console.log(`✅ Found role-based permission`);
      }
    }

    // Check 4: module_name only (global permission)
    if (result.length === 0) {
      query = `
        SELECT ${action} as permission_value, module_name
        FROM role_permissions
        WHERE module_name = ? 
          AND (employee_id IS NULL OR employee_id = 0 OR employee_id = '')
          AND (role IS NULL OR role = 0 OR role = '')
        LIMIT 1
      `;
      
      console.log(`📝 Query 4: Checking module=${module_name} only (global)`);
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