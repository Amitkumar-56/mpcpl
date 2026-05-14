import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const trip_id = searchParams.get('trip_id');

    if (!trip_id) {
      return NextResponse.json({ error: 'Trip ID is required' }, { status: 400 });
    }

    const history = await executeQuery(`
      SELECT * FROM rental_trip_route_history 
      WHERE trip_id = ? 
      ORDER BY created_at DESC
    `, [trip_id]);

    return NextResponse.json(history);
  } catch (error) {
    console.error("Route History API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
