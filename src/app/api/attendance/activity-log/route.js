// src/app/api/attendance/activity-log/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const startTime = Date.now();
    console.log('🚀 Attendance Activity Log API called at:', new Date().toISOString());
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    
    // Extract filter parameters
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const markedBy = searchParams.get('markedBy') || 'all';
    const station = searchParams.get('station') || 'all';
    const employee = searchParams.get('employee') || 'all';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    
    console.log('📊 Filters:', { search, status, markedBy, station, employee, dateFrom, dateTo });
    
    // Build WHERE conditions
    const whereConditions = [];
    
    if (search) {
      whereConditions.push(`(ep_employee.name LIKE '%${search}%' OR fs.station_name LIKE '%${search}%')`);
    }
    
    if (status !== 'all') {
      whereConditions.push(`a.status = '${status}'`);
    }
    
    if (markedBy !== 'all' && markedBy !== 'All Markers') {
      whereConditions.push(`ep_marker.name = '${markedBy}'`);
    }
    
    if (station !== 'all' && station !== 'All Stations') {
      whereConditions.push(`fs.station_name = '${station}'`);
    }
    
    if (employee !== 'all' && employee !== 'All Employees') {
      whereConditions.push(`ep_employee.name = '${employee}'`);
    }
    
    if (dateFrom) {
      whereConditions.push(`DATE(a.attendance_date) >= '${dateFrom}'`);
    }
    
    if (dateTo) {
      whereConditions.push(`DATE(a.attendance_date) <= '${dateTo}'`);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    console.log('🔍 WHERE clause:', whereClause);
    
    // Simplified main query - get basic data first
    const queryStartTime = Date.now();
    const logs = await executeQuery(`
      SELECT 
        a.id,
        a.employee_id,
        a.station_id,
        a.attendance_date,
        a.check_in_time,
        a.check_out_time,
        a.status,
        a.remarks,
        a.marked_by,
        a.created_at,
        a.updated_at
      FROM attendance a
      LEFT JOIN employee_profile ep_employee ON a.employee_id = ep_employee.id
      LEFT JOIN filling_stations fs ON a.station_id = fs.id
      LEFT JOIN employee_profile ep_marker ON a.marked_by = ep_marker.id
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `);
    
    console.log(`⏱️ Main query took: ${Date.now() - queryStartTime}ms for ${logs.length} records`);
    
    // Get total count
    const countStartTime = Date.now();
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM attendance a
      LEFT JOIN employee_profile ep_employee ON a.employee_id = ep_employee.id
      LEFT JOIN filling_stations fs ON a.station_id = fs.id
      LEFT JOIN employee_profile ep_marker ON a.marked_by = ep_marker.id
      ${whereClause}
    `);
    console.log(`⏱️ Count query took: ${Date.now() - countStartTime}ms`);
    
    // Transform data for activity logs
    const transformStartTime = Date.now();
    const activities = [];
    
    // Batch fetch all names at once instead of per-record queries
    const allEmployeeIds = new Set();
    const allStationIds = new Set();
    const allMarkerIds = new Set();
    
    logs.forEach(log => {
      if (log.employee_id) allEmployeeIds.add(log.employee_id);
      if (log.station_id) allStationIds.add(log.station_id);
      if (log.marked_by) allMarkerIds.add(log.marked_by);
    });
    
    // Get all names in one batch
    const employeeIdsArray = Array.from(allEmployeeIds);
    const stationIdsArray = Array.from(allStationIds);
    const markerIdsArray = Array.from(allMarkerIds);
    
    const nameMap = {};
    
    // Get employee names
    if (employeeIdsArray.length > 0) {
      const employees = await executeQuery(
        `SELECT id, name FROM employee_profile WHERE id IN (${employeeIdsArray.join(',')})`
      );
      employees.forEach(emp => {
        nameMap[`employee_${emp.id}`] = emp.name;
      });
    }
    
    // Get station names
    if (stationIdsArray.length > 0) {
      const stations = await executeQuery(
        `SELECT id, station_name FROM filling_stations WHERE id IN (${stationIdsArray.join(',')})`
      );
      stations.forEach(station => {
        nameMap[`station_${station.id}`] = station.station_name;
      });
    }
    
    // Get marker names
    if (markerIdsArray.length > 0) {
      const markers = await executeQuery(
        `SELECT id, name FROM employee_profile WHERE id IN (${markerIdsArray.join(',')})`
      );
      markers.forEach(marker => {
        nameMap[`marker_${marker.id}`] = marker.name;
      });
    }
    
    // Transform records using the name map
    logs.forEach(log => {
      const employeeName = nameMap[`employee_${log.employee_id}`];
      const stationName = nameMap[`station_${log.station_id}`];
      const markedByName = nameMap[`marker_${log.marked_by}`];
      
      activities.push({
        id: log.id,
        employeeId: log.employee_id,
        stationId: log.station_id,
        attendanceDate: log.attendance_date,
        checkInTime: log.check_in_time,
        checkOutTime: log.check_out_time,
        status: log.status,
        remarks: log.remarks,
        markedBy: log.marked_by,
        createdAt: log.created_at,
        updatedAt: log.updated_at,
        
        // Additional fields for display
        employeeName: employeeName || `Employee ${log.employee_id}`,
        stationName: stationName || `Station ${log.station_id}`,
        markedByName: markedByName || null
      });
    });
    
    console.log(`⏱️ Transform took: ${Date.now() - transformStartTime}ms`);
    console.log(`⏱️ Total API time: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        currentPage: page,
        total: countResult[0].total,
        limit: limit,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching attendance activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity logs: ' + error.message },
      { status: 500 }
    );
  }
}
