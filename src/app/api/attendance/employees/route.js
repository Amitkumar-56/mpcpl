// src/app/api/attendance/employees/route.js
// Get list of employees for attendance marking (filtered by role and station)
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUserId = decoded.userId || decoded.id;

    // Get current user's role and station assignment
    const userInfo = await executeQuery(
      `SELECT role, fs_id FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    const userFsId = userInfo[0].fs_id || '';

    let query = `
      SELECT 
        e.id,
        e.name,
        e.emp_code,
        e.role,
        e.fs_id,
        fs.id as station_id,
        fs.station_name
      FROM employee_profile e
      INNER JOIN filling_stations fs ON FIND_IN_SET(fs.id, e.fs_id) > 0
      WHERE e.status = 1
    `;

    const params = [];

    // Staff (role 1) cannot access
    if (userRole === 1) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Incharge (role 2) - can only see staff from their station
    if (userRole === 2) {
      if (!userFsId) {
        return NextResponse.json(
          { success: false, error: 'No station assigned' },
          { status: 400 }
        );
      }

      const stationIds = userFsId.toString().split(',').map(id => id.trim()).filter(id => id);
      
      if (stationIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid station assigned' },
          { status: 400 }
        );
      }

      query += ` AND e.role = 1`; // Only staff
      query += ` AND fs.id IN (${stationIds.map(() => '?').join(',')})`;
      params.push(...stationIds);
    }

    // Team Leader (role 3) and Accountant (role 4) - can see all stations they're assigned to
    if (userRole === 3 || userRole === 4) {
      if (userFsId) {
        const stationIds = userFsId.toString().split(',').map(id => id.trim()).filter(id => id);
        if (stationIds.length > 0) {
          query += ` AND fs.id IN (${stationIds.map(() => '?').join(',')})`;
          params.push(...stationIds);
        }
      }
    }

    // Station filter (if provided)
    if (stationId) {
      // For incharge, verify access
      if (userRole === 2) {
        const stationIds = userFsId.toString().split(',').map(id => id.trim());
        if (!stationIds.includes(stationId.toString())) {
          return NextResponse.json(
            { success: false, error: 'Access denied to this station' },
            { status: 403 }
          );
        }
      }
      // For Team Leader and Accountant, verify access
      if (userRole === 3 || userRole === 4) {
        if (userFsId) {
          const stationIds = userFsId.toString().split(',').map(id => id.trim());
          if (!stationIds.includes(stationId.toString())) {
            return NextResponse.json(
              { success: false, error: 'Access denied to this station' },
              { status: 403 }
            );
          }
        }
      }
      query += ` AND fs.id = ?`;
      params.push(stationId);
    } else {
      // If no station filter, for incharge, still filter by their stations
      if (userRole === 2) {
        const stationIds = userFsId.toString().split(',').map(id => id.trim()).filter(id => id);
        if (stationIds.length > 0) {
          query += ` AND fs.id IN (${stationIds.map(() => '?').join(',')})`;
          params.push(...stationIds);
        }
      }
    }

    query += ` ORDER BY fs.station_name ASC, e.name ASC`;

    const employees = await executeQuery(query, params);

    // Remove duplicates - if employee is in multiple stations, show only once per station filter
    const uniqueEmployees = [];
    const seenEmployees = new Set();
    
    employees.forEach(emp => {
      // Create unique key: employee_id + station_id (if station filter is applied)
      const key = stationId 
        ? `${emp.id}-${emp.station_id}` 
        : `${emp.id}`;
      
      if (!seenEmployees.has(key)) {
        seenEmployees.add(key);
        uniqueEmployees.push(emp);
      }
    });

    // Group by station for easier display
    const groupedByStation = {};
    uniqueEmployees.forEach(emp => {
      if (!groupedByStation[emp.station_id]) {
        groupedByStation[emp.station_id] = {
          station_id: emp.station_id,
          station_name: emp.station_name,
          employees: []
        };
      }
      groupedByStation[emp.station_id].employees.push({
        id: emp.id,
        name: emp.name,
        emp_code: emp.emp_code,
        role: emp.role
      });
    });

    return NextResponse.json({
      success: true,
      data: Object.values(groupedByStation),
      employees: uniqueEmployees
    });

  } catch (error) {
    console.error('Error fetching employees for attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

