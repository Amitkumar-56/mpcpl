// src/app/api/attendance/activity-log/users/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all unique markers
    const markersResult = await executeQuery(`
      SELECT DISTINCT ep.name
      FROM attendance a
      LEFT JOIN employee_profile ep ON a.marked_by = ep.id
      WHERE a.marked_by IS NOT NULL AND ep.name IS NOT NULL
      ORDER BY name
    `);

    // Get all unique stations
    const stationsResult = await executeQuery(`
      SELECT DISTINCT fs.station_name as name
      FROM attendance a
      LEFT JOIN filling_stations fs ON a.station_id = fs.id
      WHERE fs.station_name IS NOT NULL
      ORDER BY name
    `);

    // Get all unique employees
    const employeesResult = await executeQuery(`
      SELECT DISTINCT ep.name
      FROM attendance a
      LEFT JOIN employee_profile ep ON a.employee_id = ep.id
      WHERE ep.name IS NOT NULL
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      data: {
        markers: markersResult.map(m => m.name).filter(Boolean),
        stations: stationsResult.map(s => s.name).filter(Boolean),
        employees: employeesResult.map(e => e.name).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error fetching users for attendance activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users: ' + error.message },
      { status: 500 }
    );
  }
}
