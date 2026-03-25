import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const download = searchParams.get('download');

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      );
    }

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

    // Get current user's role
    const userInfo = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    const allowedRoles = [5, 4, 3]; // Admin, Accountant, Team Leader

    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Calculate attendance summary
    const attendanceQuery = `
      SELECT 
        ep.id,
        ep.name,
        ep.emp_code,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
        COUNT(CASE WHEN a.status = 'half_day' THEN 1 END) as half_days,
        COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
        COUNT(CASE WHEN a.status = 'leave' THEN 1 END) as leave_days,
        COUNT(*) as total_days
      FROM employee_profile ep
      LEFT JOIN attendance a ON ep.id = a.employee_id 
        AND MONTH(a.attendance_date) = ? AND YEAR(a.attendance_date) = ?
      WHERE ep.status = 1
      GROUP BY ep.id, ep.name, ep.emp_code
      ORDER BY ep.name
    `;

    try {
      console.log('Fetching attendance reports for:', { month, year, download });
      
      const attendanceData = await executeQuery(attendanceQuery, [parseInt(month), parseInt(year)]);
      console.log('Attendance data found:', attendanceData.length);

      if (download === 'true') {
        console.log('Generating CSV download...');
        
        if (attendanceData.length === 0) {
          return new NextResponse('No attendance data found for selected period', {
            status: 404,
            headers: {
              'Content-Type': 'text/plain'
            }
          });
        }

        // Generate CSV for download
        const csvHeaders = [
          'Employee Code', 'Employee Name', 'Present Days', 'Half Days', 
          'Absent Days', 'Leave Days', 'Total Days'
        ];

        let csvContent = csvHeaders.join(',') + '\n';

        attendanceData.forEach(record => {
          const row = [
            `"${record.emp_code || ''}"`,
            `"${record.name || ''}"`,
            record.present_days || 0,
            record.half_days || 0,
            record.absent_days || 0,
            record.leave_days || 0,
            record.total_days || 0
          ];
          csvContent += row.join(',') + '\n';
        });

        console.log('CSV generated successfully');

        return new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="attendance_report_${month}_${year}.csv"`
          }
        });
      }

      return NextResponse.json(attendanceData);

    } catch (error) {
      console.error('Error in attendance reports query:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching attendance reports:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
