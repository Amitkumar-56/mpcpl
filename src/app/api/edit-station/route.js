import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

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

    const oldStation = checkStation[0];

    // Get user info for audit log
    let userId = null;
    let userName = 'System';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
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

    // Update the station
    const result = await executeQuery(
      `UPDATE filling_stations 
       SET manager = ?, phone = ?, email = ?, gst_name = ?, gst_number = ?, map_link = ?
       WHERE id = ?`,
      [manager, phone, email, gst_name, gst_number, processedMapLink, id]
    );

    // Create audit log
    await createAuditLog({
      page: 'Loading Stations',
      uniqueCode: `STATION-${id}`,
      section: 'Edit Station',
      userId: userId,
      userName: userName,
      action: 'edit',
      remarks: `Station ${oldStation.station_name || `ID ${id}`} updated`,
      oldValue: {
        manager: oldStation.manager,
        phone: oldStation.phone,
        email: oldStation.email,
        gst_name: oldStation.gst_name,
        gst_number: oldStation.gst_number,
        map_link: oldStation.map_link
      },
      newValue: {
        manager: manager,
        phone: phone,
        email: email,
        gst_name: gst_name,
        gst_number: gst_number,
        map_link: processedMapLink
      },
      recordType: 'station',
      recordId: parseInt(id)
    });

    return NextResponse.json({
      success: true,
      message: 'Filling station updated successfully!'
    });
  } catch (error) {
    console.error('Database error:', error);
    
    // ✅ Better error messages for common issues
    let errorMessage = error.message || 'Failed to update station';
    
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