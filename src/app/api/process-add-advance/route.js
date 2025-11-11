// src/app/api/process-add-advance/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const voucher_id = formData.get('voucher_id');
    const advance_amount = formData.get('advance_amount');

    // Update voucher advance amount
    const sql = 'UPDATE vouchers SET advance = advance + ? WHERE voucher_id = ?';
    await executeQuery(sql, [advance_amount, voucher_id]);

    return NextResponse.json({ success: true, message: 'Advance added successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}