import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');
    if (!voucher_id) return NextResponse.json({ success: false, error: 'voucher_id required' }, { status: 400 });

    const sql = `
      SELECT vh.id, vh.row_id as voucher_id, vh.user_id, vh.amount, vh.type, vh.created_at,
             ep.name as user_name
      FROM voucher_history vh
      LEFT JOIN employee_profile ep ON vh.user_id = ep.id
      WHERE vh.row_id = ?
      ORDER BY vh.created_at DESC
    `;

    const rows = await executeQuery(sql, [voucher_id]);
    return NextResponse.json({ success: true, rows });
  } catch (error) {
    console.error('voucher-log error', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
