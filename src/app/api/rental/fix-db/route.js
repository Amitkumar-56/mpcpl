import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Add voucher_no column if missing
    try {
      await executeQuery('ALTER TABLE rental_trips ADD COLUMN voucher_no VARCHAR(100) AFTER state');
    } catch (e) {
      console.log('voucher_no column might already exist');
    }
    
    return NextResponse.json({ success: true, message: 'Database updated' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
