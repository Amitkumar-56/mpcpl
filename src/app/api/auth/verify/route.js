// src/app/api/auth/verify/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;
    
    // Fallback: read Authorization header if cookie is missing
    if (!token && request && typeof request.headers?.get === 'function') {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
      }
    }

    // Don't log missing token - it's a normal auth check (e.g., from SessionContext)
    if (!token) {
      return NextResponse.json({ 
        authenticated: false,
        error: 'Not authenticated' 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      // Don't log invalid token - it's a normal auth check (expired/invalid tokens are common)
      return NextResponse.json({ 
        authenticated: false,
        error: 'Invalid token' 
      });
    }

    // First check if user exists (without status filter to detect disabled accounts)
    const userCheck = await executeQuery(
      `SELECT id, status FROM employee_profile WHERE id = ?`,
      [decoded.userId]
    );

    if (userCheck.length === 0) {
      console.log('❌ User not found in database');
      return NextResponse.json({ 
        authenticated: false,
        error: 'User not found' 
      });
    }

    // Check if user is disabled
    if (userCheck[0].status === 0 || userCheck[0].status === null || userCheck[0].status === undefined) {
      // Don't log disabled account - normal auth check
      return NextResponse.json({ 
        authenticated: false,
        error: 'Your account has been deactivated by admin. Please contact administrator.' 
      });
    }

    // Fetch complete user data from database (only active users)
    const users = await executeQuery(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client
       FROM employee_profile 
       WHERE id = ? AND status = 1`,
      [decoded.userId]
    );

    if (users.length === 0) {
      // Don't log inactive account - normal auth check
      return NextResponse.json({ 
        authenticated: false,
        error: 'Account is inactive' 
      });
    }

    const user = users[0];
    // Only log successful authentication in debug mode (optional)
    // console.log('✅ User authenticated:', user.name, user.role);

    // ✅ FIX: Fetch BOTH employee-specific AND role-based permissions, then merge
    // Employee-specific permissions take priority
    const employeePermissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions 
       WHERE employee_id = ?`,
      [user.id]
    );
    
    // Also fetch role-based permissions (for modules not covered by employee-specific)
    const roleBasedPermissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions 
       WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)`,
      [user.role]
    );
    
    // ✅ Merge permissions: employee-specific override role-based for same module
    const permissionMap = new Map();
    const toBool = (v) => {
      if (v === true) return true;
      if (v === 1) return true;
      if (typeof v === 'string') {
        const s = v.trim().toLowerCase();
        return s === '1' || s === 'true' || s === 'yes' || s === 'enable';
      }
      return false;
    };
    
    // First, add all role-based permissions
    roleBasedPermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: toBool(perm.can_view),
        can_edit: toBool(perm.can_edit),
        can_create: toBool(perm.can_create)
      });
    });
    
    // Then, override with employee-specific permissions (they take priority)
    employeePermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: toBool(perm.can_view),
        can_edit: toBool(perm.can_edit),
        can_create: toBool(perm.can_create)
      });
    });
    
    // Convert map to array for logging
    const finalPermissions = Array.from(permissionMap.entries()).map(([module_name, perms]) => ({
      module_name,
      can_view: perms.can_view ? 1 : 0,
      can_edit: perms.can_edit ? 1 : 0,
      can_create: perms.can_create ? 1 : 0
    }));

    // ✅ Convert merged permissions to object format
    const userPermissions = {};
    permissionMap.forEach((perms, module_name) => {
      userPermissions[module_name] = perms;
    });
    
    // Reduced logging - only log if needed for debugging
    // console.log('🔑 Permissions loaded:', Object.keys(userPermissions).length, 'modules');

    // ✅ FIX: Return complete employee_profile data
    return NextResponse.json({ 
      authenticated: true,
      id: user.id,
      emp_code: user.emp_code,
      name: user.name,
      email: user.email,
      role: user.role,
      fs_id: user.fs_id,
      fl_id: user.fl_id,
      station: user.station,
      client: user.client,
      permissions: userPermissions,
      // ✅ Include role name for display
      role_name: user.role === 5 ? 'Admin' : 
                  user.role === 4 ? 'Accountant' :
                  user.role === 3 ? 'Team Leader' :
                  user.role === 2 ? 'Incharge' :
                  user.role === 1 ? 'Staff' : 'Employee'
    });

  } catch (error) {
    console.error('❌ Verify API error:', error);
    return NextResponse.json({ 
      authenticated: false,
      error: 'Authentication error: ' + error.message 
    });
  }
}
