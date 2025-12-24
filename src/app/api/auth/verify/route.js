// src/app/api/auth/verify/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;
    
    console.log('🔐 Verify API called, token exists:', !!token);
    
    // Fallback: read Authorization header if cookie is missing
    if (!token && request && typeof request.headers?.get === 'function') {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
        console.log('🔐 Verify API used Authorization header token:', !!token);
      }
    }

    if (!token) {
      console.log('❌ No token found in cookies or Authorization header');
      return NextResponse.json({ 
        authenticated: false,
        error: 'Not authenticated' 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Token verification failed');
      return NextResponse.json({ 
        authenticated: false,
        error: 'Invalid token' 
      });
    }

    console.log('✅ Token verified, user ID:', decoded.userId);

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
      console.log('❌ User account is disabled');
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

    console.log('📊 Users found:', users.length);

    if (users.length === 0) {
      console.log('❌ User not found or inactive');
      return NextResponse.json({ 
        authenticated: false,
        error: 'Account is inactive' 
      });
    }

    const user = users[0];
    console.log('✅ User authenticated:', user.name, user.role);

    // ✅ FIX: Fetch BOTH employee-specific AND role-based permissions, then merge
    // Employee-specific permissions take priority
    const employeePermissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM role_permissions 
       WHERE employee_id = ?`,
      [user.id]
    );
    
    // Also fetch role-based permissions (for modules not covered by employee-specific)
    const roleBasedPermissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM role_permissions 
       WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)`,
      [user.role]
    );
    
    // ✅ Merge permissions: employee-specific override role-based for same module
    const permissionMap = new Map();
    
    // First, add all role-based permissions
    roleBasedPermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_delete: perm.can_delete === 1
      });
    });
    
    // Then, override with employee-specific permissions (they take priority)
    employeePermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_delete: perm.can_delete === 1
      });
    });
    
    // Convert map to array for logging
    const finalPermissions = Array.from(permissionMap.entries()).map(([module_name, perms]) => ({
      module_name,
      can_view: perms.can_view ? 1 : 0,
      can_edit: perms.can_edit ? 1 : 0,
      can_delete: perms.can_delete ? 1 : 0
    }));

    console.log('🔑 Permissions found:', finalPermissions.length);
    console.log('🔑 Employee-specific permissions:', employeePermissions.length);
    console.log('🔑 Role-based permissions:', roleBasedPermissions.length);
    console.log('🔑 Permission source:', employeePermissions.length > 0 ? 'employee_id + role' : 'role only');
    console.log('🔑 Raw permissions:', finalPermissions.map(p => ({
      module: p.module_name,
      can_view: p.can_view,
      can_edit: p.can_edit,
      can_delete: p.can_delete
    })));

    // ✅ Convert merged permissions to object format
    const userPermissions = {};
    permissionMap.forEach((perms, module_name) => {
      userPermissions[module_name] = perms;
    });
    
    console.log('🔑 Processed permissions object:', Object.keys(userPermissions));
    console.log('🔑 Full permissions:', userPermissions);

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
