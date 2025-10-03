import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const { id, manager, phone, email, gst_name, gst_number, map_link } = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Station ID is required' },
        { status: 400 }
      );
    }

    // First check if the station exists
    const checkStation = await executeQuery(
      'SELECT * FROM filling_stations WHERE id = ?',
      [id]
    );

    if (checkStation.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No record found for the provided ID' },
        { status: 404 }
      );
    }

    // Update the station
    const result = await executeQuery(
      `UPDATE filling_stations 
       SET manager = ?, phone = ?, email = ?, gst_name = ?, gst_number = ?, map_link = ?
       WHERE id = ?`,
      [manager, phone, email, gst_name, gst_number, map_link, id]
    );

    return NextResponse.json({
      success: true,
      message: 'Filling station updated successfully!'
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Station ID is required' },
        { status: 400 }
      );
    }

    const station = await executeQuery(
      'SELECT * FROM filling_stations WHERE id = ?',
      [id]
    );

    if (station.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No record found for the provided ID' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      station: station[0]
    });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}