
//src/app/api/permissions/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get('module');

    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const userId = decoded.userId || decoded.id;

    if (!moduleName) return NextResponse.json({ error: 'module is required' }, { status: 400 });

    // Try to fetch permissions scoped to employee first
    let perms = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create, can_delete FROM role_permissions WHERE employee_id = ? AND module_name = ?`,
      [userId, moduleName]
    );

    if (!perms || perms.length === 0) {
      // Fallback to role based permissions
      // First get user's role
      const users = await executeQuery('SELECT role FROM employee_profile WHERE id = ?', [userId]);
      const role = users && users.length ? users[0].role : null;
      if (role !== null) {
        perms = await executeQuery(
          `SELECT module_name, can_view, can_edit, can_create, can_delete FROM role_permissions WHERE role = ? AND (employee_id IS NULL OR employee_id = 0) AND module_name = ?`,
          [role, moduleName]
        );
      }
    }

    if (!perms || perms.length === 0) {
      // No explicit permissions found -> default to false
      return NextResponse.json({ can_view: false, can_edit: false, can_create: false });
    }

    const p = perms[0];
    return NextResponse.json({ 
      can_view: p.can_view === 1 || p.can_view === true, 
      can_edit: p.can_edit === 1 || p.can_edit === true, 
      can_create: (p.can_create === 1 || p.can_create === true) ? true : false, // ✅ Only true if explicitly 1 or true
      can_delete: p.can_delete === 1 || p.can_delete === true || false
    });
  } catch (err) {
    console.error('Permissions API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
