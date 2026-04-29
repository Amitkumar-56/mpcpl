import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { trip_id, amount, remarks } = await request.json();

    if (!trip_id || !amount) {
      return NextResponse.json({ error: 'Trip ID and Amount are required' }, { status: 400 });
    }

    // 1. Ensure payments table exists
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

    // 2. Insert into payments log
    await executeQuery(
      'INSERT INTO rental_trip_payments (trip_id, amount, remarks) VALUES (?, ?, ?)',
      [trip_id, amount, remarks]
    );

    // 3. Update total received_amount in rental_trips
    await executeQuery(
      'UPDATE rental_trips SET received_amount = (SELECT SUM(amount) FROM rental_trip_payments WHERE trip_id = ?) WHERE id = ?',
      [trip_id, trip_id]
    );
    
    // 4. Recalculate profit_loss if trip is closed
    const trip = await executeQuery('SELECT status, received_amount, total_expense FROM rental_trips WHERE id = ?', [trip_id]);
    if (trip.length > 0 && trip[0].status === 'Closed') {
      const profitLoss = parseFloat(trip[0].received_amount) - parseFloat(trip[0].total_expense);
      await executeQuery('UPDATE rental_trips SET profit_loss = ? WHERE id = ?', [profitLoss, trip_id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
