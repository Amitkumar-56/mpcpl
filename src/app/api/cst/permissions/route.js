import { verifyToken } from '@/lib/cstauth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get('module');

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const customerId = decoded.userId || decoded.id;
    if (!customerId) return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });

    if (moduleName) {
      const rows = await executeQuery(
        `SELECT can_view, can_edit, can_create FROM customer_permissions WHERE customer_id = ? AND module_name = ? LIMIT 1`,
        [customerId, moduleName]
      );

      if (!rows || rows.length === 0) {
        return NextResponse.json({ can_view: false, can_edit: false, can_create: false });
      }

      const p = rows[0];
      return NextResponse.json({ can_view: p.can_view === 1, can_edit: p.can_edit === 1, can_create: p.can_create === 1 });
    }

    // No module specified — return all customer permissions
    const allRows = await executeQuery(
      `SELECT module_name, can_view, can_edit, can_create FROM customer_permissions WHERE customer_id = ?`,
      [customerId]
    );

    const permissions = {};
    (allRows || []).forEach((r) => {
      permissions[r.module_name] = {
        can_view: Boolean(r.can_view),
        can_edit: Boolean(r.can_edit),
        can_create: Boolean(r.can_create),
      };
    });

    return NextResponse.json({ success: true, customerId, permissions, total: (allRows || []).length });
  } catch (err) {
    console.error('CST permissions API error:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
