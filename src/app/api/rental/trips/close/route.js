import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { trip_id, received_amount, destination, remarks } = await request.json();

    if (!trip_id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    // Get current trip data
    const trips = await executeQuery('SELECT total_expense FROM rental_trips WHERE id = ?', [trip_id]);
    if (trips.length === 0) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const amount = parseFloat(received_amount) || 0;
    const expense = parseFloat(trips[0].total_expense) || 0;
    const profitLoss = amount - expense;

    // Update trip status to Closed
    await executeQuery(`
      UPDATE rental_trips 
      SET 
        status = 'Closed', 
        received_amount = ?, 
        profit_loss = ?, 
        destination = ?, 
        remarks = ?,
        end_date = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [amount, profitLoss, destination, remarks || null, trip_id]);

    return NextResponse.json({ success: true, profit_loss: profitLoss });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
