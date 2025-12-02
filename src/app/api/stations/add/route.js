import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      station_name,
      address,
      manager,
      phone,
      email,
      gst_name,
      gst_number,
      map_link,
      fl_id = 0,
      fa_id = 0
    } = body;

    // Validate required fields
    if (!station_name || !address || !manager || !phone || !email || !gst_name || !gst_number) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: station_name, address, manager, phone, email, gst_name, gst_number are required' },
        { status: 400 }
      );
    }

    // Check if station name already exists
    const existingStation = await executeQuery(
      'SELECT id FROM filling_stations WHERE station_name = ?',
      [station_name]
    );

    if (existingStation.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Station name already exists' },
        { status: 400 }
      );
    }

    // ✅ FIX: Truncate map_link to 255 characters (database column limit)
    let processedMapLink = null;
    if (map_link && map_link.trim()) {
      // Truncate to 255 characters if longer
      processedMapLink = map_link.trim().substring(0, 255);
      if (map_link.length > 255) {
        console.warn(`⚠️ Map link truncated from ${map_link.length} to 255 characters`);
      }
    }

    // Insert new station
    const insertQuery = `
      INSERT INTO filling_stations 
      (fl_id, fa_id, station_name, address, gst_name, gst_number, map_link, email, phone, manager, created, status, stock, stock1, stock_urea)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 1, 0.00, 0.00, 0.00)
    `;

    const result = await executeQuery(insertQuery, [
      fl_id,
      fa_id,
      station_name,
      address,
      gst_name,
      gst_number,
      processedMapLink,
      email,
      phone,
      manager
    ]);

    return NextResponse.json({
      success: true,
      message: 'Station added successfully!',
      stationId: result.insertId
    });
  } catch (error) {
    console.error('Database error:', error);
    
    // ✅ Better error messages for common issues
    let errorMessage = error.message || 'Failed to add station';
    
    if (error.message && error.message.includes('Data too long')) {
      errorMessage = 'One or more fields exceed the maximum length. Please shorten the map link (max 255 characters).';
    } else if (error.message && error.message.includes('map_link')) {
      errorMessage = 'Map link is too long. Please use a shorter link (max 255 characters).';
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

