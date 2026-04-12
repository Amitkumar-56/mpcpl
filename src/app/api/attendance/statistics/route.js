import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('role');

    let whereClause = "WHERE 1=1";
    const params = [];

    // Role-based access control
    if (userRole === '5' || userRole === '4' || userRole === '3') {
      // Admin, Accountant, Team Leader - can see all stations
      if (stationId) {
        whereClause += " AND a.station_id = ?";
        params.push(stationId);
      }
    } else if (userRole === '2') {
      // Incharge - only their stations (simplified for now)
      if (stationId) {
        whereClause += " AND a.station_id = ?";
        params.push(stationId);
      }
      // For now, incharge can see all stations if no specific station selected
    }

    // Get all employees with attendance for the selected month
    const monthParam = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    
    const statsQuery = `
      SELECT 
        e.id as employee_id,
        e.name as employee_name,
        e.emp_code,
        e.role,
        CASE e.role
          WHEN 1 THEN 'Staff'
          WHEN 2 THEN 'Incharge'
          WHEN 3 THEN 'Team Leader'
          WHEN 4 THEN 'Accountant'
          WHEN 5 THEN 'Admin'
          ELSE 'Unknown'
        END as role_name,
        ? as month,
        COALESCE(COUNT(a.id), 0) as total_attendance,
        COALESCE(SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END), 0) as present_count,
        COALESCE(SUM(CASE WHEN a.status = 'Absent' THEN 1 ELSE 0 END), 0) as absent_count,
        COALESCE(SUM(CASE WHEN a.status = 'Half Day' THEN 1 ELSE 0 END), 0) as half_day_count,
        COALESCE(SUM(CASE WHEN a.status = 'Leave' THEN 1 ELSE 0 END), 0) as leave_count
      FROM employee_profile e
      LEFT JOIN attendance a ON e.id = a.employee_id AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
      GROUP BY e.id, e.name, e.emp_code, e.role
      ORDER BY role_name, e.name
    `;

    console.log('Month Param:', monthParam);
    console.log('Query:', statsQuery);
    const stats = await executeQuery(statsQuery, [monthParam, monthParam]);
    console.log('Stats Result:', stats);

    // Get current month and year
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM format

    // Get summary for current month
    const summaryQuery = `
      SELECT 
        e.role,
        CASE e.role
          WHEN 1 THEN 'Staff'
          WHEN 2 THEN 'Incharge'
          WHEN 3 THEN 'Team Leader'
          WHEN 4 THEN 'Accountant'
          WHEN 5 THEN 'Admin'
          ELSE 'Unknown'
        END as role_name,
        COUNT(*) as total_attendance,
        COUNT(DISTINCT a.employee_id) as total_employees
      FROM attendance a
      INNER JOIN employee_profile e ON a.employee_id = e.id
      WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
      ${stationId ? "AND a.station_id = ?" : ""}
      GROUP BY e.role
      ORDER BY e.role
    `;

    const summaryParams = [currentMonth];
    if (stationId) {
      summaryParams.push(stationId);
    }
    
    const summary = await executeQuery(summaryQuery, summaryParams);

    return new Response(JSON.stringify({
      success: true,
      statistics: stats,
      currentMonthSummary: summary,
      currentMonth: currentMonth
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching attendance statistics:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch attendance statistics'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
