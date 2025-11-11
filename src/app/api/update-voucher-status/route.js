// src/app/api/update-voucher-status/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');
    const status = searchParams.get('status');

    // Mock current user (replace with actual session)
    const current_user = { id: 1, name: 'Admin' };

    let sql, params;

    if (status == 1) {
      // Approve
      sql = 'UPDATE vouchers SET status = 1, approved_by = ?, approved_date = NOW() WHERE voucher_id = ?';
      params = [current_user.name, voucher_id];
    } else {
      // Reject
      sql = 'UPDATE vouchers SET status = 2, rejected_by = ?, rejected_date = NOW() WHERE voucher_id = ?';
      params = [current_user.name, voucher_id];
    }

    await executeQuery(sql, params);

    return NextResponse.json({ 
      success: true, 
      message: `Voucher ${status == 1 ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}