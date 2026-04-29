import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No token found' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id;

    // Check user status from database
    const result = await executeQuery(
      'SELECT id, name, email, status, role FROM employee_profile WHERE id = ?',
      [userId]
    );

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = result[0];
    const isActive = Number(user.status) === 1;

    console.log(`🔍 User status check: ${user.name} (ID: ${userId}) - Status: ${user.status} (${isActive ? 'Active' : 'Deactivated'})`);

    // If user is deactivated, return special response for automatic logout
    if (!isActive) {
      return NextResponse.json({
        success: false,
        isDeactivated: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        },
        message: `USER_DEACTIVATED_${user.id}`,
        redirectUrl: '/deactivated'
      }, { status: 403 });
    }

    // ✅ Fetch Merged Permissions (Employee-specific + Role-based)

    const employeePermissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions
       WHERE employee_id = ?`,
      [user.id]
    );

    const roleBasedPermissions = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create
       FROM role_permissions
       WHERE role = ? AND (employee_id IS NULL OR employee_id = 0)`,
      [user.role]
    );

    const permissionMap = new Map();
    roleBasedPermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_create: perm.can_create === 1
      });
    });
    employeePermissions.forEach((perm) => {
      permissionMap.set(perm.module_name, {
        can_view: perm.can_view === 1,
        can_edit: perm.can_edit === 1,
        can_create: perm.can_create === 1
      });
    });

    const userPermissions = {};
    permissionMap.forEach((perms, module_name) => {
      userPermissions[module_name] = perms;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: isActive,
        permissions: userPermissions
      },
      isDeactivated: false
    });

  } catch (error) {
    console.error('Check status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
