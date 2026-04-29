import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS rental_trip_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id INT NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        remarks TEXT,
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (trip_id) REFERENCES rental_trips(id) ON DELETE CASCADE
      );
    `);
    return NextResponse.json({ success: true, message: 'Payment table initialized' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
