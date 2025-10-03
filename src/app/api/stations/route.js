// src/app/api/stations/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const rows = await executeQuery(
      'SELECT id, station_name, manager, phone, map_link FROM filling_stations ORDER BY id DESC'
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error('DB Fetch Error:', err);
    return NextResponse.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
