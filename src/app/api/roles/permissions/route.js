// src/app/api/roles/permissions/route.js
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET - Fetch role permissions
export async function GET(request) {
  try {
    // Check if user is admin
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId || decoded.id;
    const users = await executeQuery(
      'SELECT role FROM employee_profile WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || Number(users[0].role) !== 5) {
      return NextResponse.json(
        { success: false, error: 'Only admin can access role permissions' },
        { status: 403 }
      );
    }

    // Fetch all role permissions
    const permissions = await executeQuery(`
      SELECT 
        id,
        employee_id,
        role,
        module_name,
        can_view,
        can_edit,
        can_delete,
        created_at
      FROM role_permissions
      WHERE employee_id IS NULL OR employee_id = 0
      ORDER BY role, module_name
    `);

    // Group by role
    const rolePermissions = {};
    permissions.forEach(perm => {
      const role = perm.role;
      if (!rolePermissions[role]) {
        rolePermissions[role] = {};
      }
      if (!rolePermissions[role][perm.module_name]) {
        rolePermissions[role][perm.module_name] = {
          can_view: perm.can_view === 1,
          can_edit: perm.can_edit === 1,
          can_delete: perm.can_delete === 1
        };
      }
    });

    return NextResponse.json({
      success: true,
      permissions: rolePermissions
    });

  } catch (error) {
    console.error('Error fetching role permissions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Save role permissions
export async function POST(request) {
  try {
    // Check if user is admin
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const userId = decoded.userId || decoded.id;
    const users = await executeQuery(
      'SELECT role FROM employee_profile WHERE id = ?',
      [userId]
    );

    if (users.length === 0 || Number(users[0].role) !== 5) {
      return NextResponse.json(
        { success: false, error: 'Only admin can save role permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role, permissions: rolePerms } = body;

    if (!role || !rolePerms) {
      return NextResponse.json(
        { success: false, error: 'Role and permissions are required' },
        { status: 400 }
      );
    }

    // Map role name to role number
    const roleMap = {
      'Staff': 1,
      'Incharge': 2,
      'Team Leader': 3,
      'Accountant': 4,
      'Admin': 5,
      'Driver': 6
    };

    const roleNumber = roleMap[role];
    if (!roleNumber) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Delete existing role-based permissions for this role
    await executeQuery(
      'DELETE FROM role_permissions WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)',
      [roleNumber]
    );

    // Insert new permissions - apply selected permissions to each selected module
    const modules = rolePerms.modules || {};
    const perms = rolePerms.permissions || {};
    const can_view = perms['View'] ? 1 : 0;
    const can_edit = perms['Edit'] ? 1 : 0;
    const can_delete = perms['Delete'] ? 1 : 0;

    for (const [moduleName, enabled] of Object.entries(modules)) {
      if (enabled) {
        // Insert permission for this module with the selected permissions
        await executeQuery(
          `INSERT INTO role_permissions 
           (role, module_name, can_view, can_edit, can_delete, employee_id, created_at)
           VALUES (?, ?, ?, ?, ?, 0, NOW())
           ON DUPLICATE KEY UPDATE
           can_view = VALUES(can_view),
           can_edit = VALUES(can_edit),
           can_delete = VALUES(can_delete)`,
          [roleNumber, moduleName, can_view, can_edit, can_delete]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Permissions saved successfully for ${role}`
    });

  } catch (error) {
    console.error('Error saving role permissions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

