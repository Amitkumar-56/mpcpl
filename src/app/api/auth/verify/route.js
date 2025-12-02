// src/app/api/auth/verify/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    console.log('🔐 Verify API called, token exists:', !!token);
    
    if (!token) {
      console.log('❌ No token found in cookies');
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

    // Fetch complete user data from database
    const users = await executeQuery(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client
       FROM employee_profile 
       WHERE id = ? AND status = 1`,
      [decoded.userId]  // Use decoded.userId instead of decoded.id
    );

    console.log('📊 Users found:', users.length);

    if (users.length === 0) {
      console.log('❌ User not found in database');
      return NextResponse.json({ 
        authenticated: false,
        error: 'User not found' 
      });
    }

    const user = users[0];
    console.log('✅ User authenticated:', user.name, user.role);

    // ✅ FIX: Fetch permissions based on employee_id first, then role (fallback)
    const permissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_delete
       FROM role_permissions 
       WHERE employee_id = ?`,
      [user.id]
    );
    
    // If no permissions found for employee_id, try role-based (fallback)
    let roleBasedPermissions = [];
    if (permissions.length === 0) {
      roleBasedPermissions = await executeQuery(
        `SELECT module_name, can_view, can_edit, can_delete
         FROM role_permissions 
         WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)`,
        [user.role]
      );
    }
    
    const finalPermissions = permissions.length > 0 ? permissions : roleBasedPermissions;

    console.log('🔑 Permissions found:', finalPermissions.length);
    console.log('🔑 Permission source:', permissions.length > 0 ? 'employee_id' : 'role');

    const userPermissions = {};
    finalPermissions.forEach((p) => {
      userPermissions[p.module_name] = {
        can_view: p.can_view === 1,
        can_edit: p.can_edit === 1,
        can_delete: p.can_delete === 1,
      };
    });

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