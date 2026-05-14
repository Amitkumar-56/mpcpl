import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { trip_id, new_destination, remarks } = body;

    if (!trip_id || !new_destination) {
      return NextResponse.json({ error: 'Trip ID and New Destination are required' }, { status: 400 });
    }

    // 1. Get current trip info
    const tripData = await executeQuery('SELECT source, destination, route_history FROM rental_trips WHERE id = ?', [trip_id]);
    if (tripData.length === 0) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const currentDestination = tripData[0].destination;
    const currentHistory = tripData[0].route_history || "";
    
    // 2. Build new history (append old destination if it exists)
    let newHistory = currentHistory;
    if (currentDestination) {
      newHistory = currentHistory ? `${currentHistory} → ${currentDestination}` : currentDestination;
    }

    // 3. Update the trip
    await executeQuery(`
      UPDATE rental_trips 
      SET destination = ?, 
          route_history = ?, 
          remarks = CONCAT(COALESCE(remarks, ''), '\n[Diverted]: To ', ?, ' - ', ?)
      WHERE id = ?
    `, [new_destination, newHistory, new_destination, remarks || 'No remarks', trip_id]);

    // 4. Log to Route History Table
    await executeQuery(`
      INSERT INTO rental_trip_route_history (trip_id, old_destination, new_destination, remarks)
      VALUES (?, ?, ?, ?)
    `, [trip_id, currentDestination, new_destination, remarks || 'Trip Diverted']);

    return NextResponse.json({ success: true, message: 'Trip diverted successfully' });
  } catch (error) {
    console.error("Divert API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
