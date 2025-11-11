// src/app/api/process-add-cash/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const voucher_id = formData.get('voucher_id');
    const voucher_no = formData.get('voucher_no');
    const item_details = formData.get('item_details');
    const amount = formData.get('amount');

    // Insert into voucher_items table
    const sql = `
      INSERT INTO vouchers_items (voucher_id, item_details, amount, created_at) 
      VALUES (?, ?, ?, NOW())
    `;
    
    await executeQuery(sql, [voucher_id, item_details, amount]);

    return NextResponse.json({ success: true, message: 'Cash added successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}