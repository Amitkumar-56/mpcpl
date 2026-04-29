import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { trip_id, type, amount, description } = await request.json();

    if (!trip_id || !type || !amount) {
      return NextResponse.json({ error: 'Trip ID, Type and Amount are required' }, { status: 400 });
    }

    // Insert expense
    await executeQuery(
      'INSERT INTO rental_trip_expenses (trip_id, type, amount, description) VALUES (?, ?, ?, ?)',
      [trip_id, type, amount, description]
    );

    // Update total_expense in rental_trips
    await executeQuery(
      'UPDATE rental_trips SET total_expense = (SELECT SUM(amount) FROM rental_trip_expenses WHERE trip_id = ?) WHERE id = ?',
      [trip_id, trip_id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trip_id = searchParams.get('trip_id');

    if (!trip_id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const expenses = await executeQuery(
      'SELECT * FROM rental_trip_expenses WHERE trip_id = ? ORDER BY created_at DESC',
      [trip_id]
    );

    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
