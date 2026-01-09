import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';
import { createEntityLog } from '@/lib/entityLogs';

export async function PUT(request) {
  try {
    const { id, manager, phone, email, gst_name, gst_number, map_link, status } = await request.json();
    
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
    let userName = null;
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
    const stationStatus = status !== undefined ? parseInt(status) : 1; // Default to enabled
    const result = await executeQuery(
      `UPDATE filling_stations 
       SET manager = ?, phone = ?, email = ?, gst_name = ?, gst_number = ?, map_link = ?, status = ?
       WHERE id = ?`,
      [manager, phone, email, gst_name, gst_number, processedMapLink, stationStatus, id]
    );

    // ✅ NEW: When station is disabled, disable all staff/incharge IDs for this station
    // When station is enabled, enable all staff/incharge IDs for this station
    // Note: fs_id is stored as comma-separated string like "1,2,3"
    if (stationStatus === 0) {
      // Disable all employees assigned to this station
      // Use FIND_IN_SET to check if station ID is in the comma-separated fs_id string
      await executeQuery(
        `UPDATE employee_profile 
         SET status = 0 
         WHERE (FIND_IN_SET(?, fs_id) > 0 OR fs_id = ?) AND status = 1`,
        [id, id]
      );
      console.log(`✅ Disabled all staff/incharge IDs for station ${id}`);
    } else if (stationStatus === 1) {
      // Enable all employees assigned to this station
      await executeQuery(
        `UPDATE employee_profile 
         SET status = 1 
         WHERE (FIND_IN_SET(?, fs_id) > 0 OR fs_id = ?) AND status = 0`,
        [id, id]
      );
      console.log(`✅ Enabled all staff/incharge IDs for station ${id}`);
    }

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
        map_link: oldStation.map_link,
        status: oldStation.status
      },
      newValue: {
        manager: manager,
        phone: phone,
        email: email,
        gst_name: gst_name,
        gst_number: gst_number,
        map_link: processedMapLink,
        status: stationStatus
      },
      recordType: 'station',
      recordId: parseInt(id)
    });

    // ✅ Create entity-specific log (similar to filling_logs) for update
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      await createEntityLog({
        entityType: 'station',
        entityId: id,
        createdBy: null, // Will use existing if log exists
        updatedBy: userId,
        updatedDate: currentDateTime
      });
    } catch (logError) {
      console.error('⚠️ Error creating station log:', logError);
    }

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