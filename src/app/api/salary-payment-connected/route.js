import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employee_id = searchParams.get('employee_id');

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

    // Build query to connect salary_payment with attendance and salary data
    let query = `
      SELECT 
        sp.*,
        ep.name as employee_name,
        ep.emp_code,
        ep.phone,
        ep.email,
        ep.account_details,
        -- Get attendance data
        (
          SELECT JSON_OBJECT(
            'total_days', COUNT(DISTINCT DATE(attendance_date)),
            'present_days', SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END),
            'absent_days', SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END),
            'half_days', SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END),
            'leave_days', SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END),
            'attendance_records', JSON_ARRAYAGG(
              JSON_OBJECT(
                'date', DATE(attendance_date),
                'status', status,
                'check_in_time', check_in_time,
                'check_out_time', check_out_time,
                'remarks', remarks
              )
            )
          )
          FROM attendance 
          WHERE employee_id = sp.employee_id 
            AND MONTH(attendance_date) = sp.month 
            AND YEAR(attendance_date) = sp.year
        ) as attendance_data,
        -- Get salary breakdown from salary_records if exists
        (
          SELECT JSON_OBJECT(
            'basic_salary', sr.basic_salary,
            'hra', sr.hra,
            'da', sr.da,
            'ta', sr.ta,
            'ma', sr.ma,
            'other_allowance', sr.other_allowance,
            'gross_salary', sr.gross_salary,
            'pf_deduction', sr.pf_deduction,
            'esi_deduction', sr.esi_deduction,
            'tds_deduction', sr.tds_deduction,
            'advance_deduction', sr.advance_deduction,
            'total_deduction', sr.total_deduction,
            'net_salary', sr.net_salary,
            'status', sr.status
          )
          FROM salary_records sr
          WHERE sr.employee_id = sp.employee_id 
            AND sr.month = sp.month 
            AND sr.year = sp.year
          LIMIT 1
        ) as salary_breakdown,
        -- Get manual salary if exists
        (
          SELECT JSON_OBJECT(
            'basic_salary', ms.basic_salary,
            'hra', ms.hra,
            'da', ms.da,
            'ta', ms.ta,
            'ma', ms.ma,
            'other_allowance', ms.other_allowance,
            'gross_salary', ms.gross_salary,
            'pf_deduction', ms.pf_deduction,
            'esi_deduction', ms.esi_deduction,
            'tds_deduction', ms.tds_deduction,
            'advance_deduction', ms.advance_deduction,
            'total_deduction', ms.total_deduction,
            'net_salary', ms.net_salary,
            'status', ms.status,
            'payment_date', ms.payment_date,
            'payment_method', ms.payment_method
          )
          FROM manual_salary ms
          WHERE ms.employee_id = sp.employee_id 
            AND ms.month = sp.month 
            AND ms.year = sp.year
          LIMIT 1
        ) as manual_salary_data
      FROM salary_payment sp
      JOIN employee_profile ep ON sp.employee_id = ep.id
      WHERE 1=1
    `;

    const params = [];

    // Staff can only see their own data
    if (userRole === 1) {
      query += ' AND sp.employee_id = ?';
      params.push(currentUserId);
    } else if (employee_id) {
      query += ' AND sp.employee_id = ?';
      params.push(employee_id);
    }

    if (month) {
      query += ' AND sp.month = ?';
      params.push(month);
    }

    if (year) {
      query += ' AND sp.year = ?';
      params.push(year);
    }

    query += ' ORDER BY ep.name ASC';

    console.log('Executing connected salary payment query:', query);
    console.log('With params:', params);

    const salaryPayments = await executeQuery(query, params);
    
    console.log('Found salary payments:', salaryPayments.length);

    // Parse JSON data and structure the response
    const structuredData = salaryPayments.map(payment => {
      const attendanceData = payment.attendance_data ? 
        (typeof payment.attendance_data === 'string' ? 
          JSON.parse(payment.attendance_data) : payment.attendance_data) : {};
      
      const salaryBreakdown = payment.salary_breakdown ? 
        (typeof payment.salary_breakdown === 'string' ? 
          JSON.parse(payment.salary_breakdown) : payment.salary_breakdown) : null;
      
      const manualSalaryData = payment.manual_salary_data ? 
        (typeof payment.manual_salary_data === 'string' ? 
          JSON.parse(payment.manual_salary_data) : payment.manual_salary_data) : null;

      return {
        ...payment,
        attendance: attendanceData,
        salary_breakdown: salaryBreakdown,
        manual_salary: manualSalaryData,
        // Determine which salary data to use
        active_salary_data: manualSalaryData || salaryBreakdown,
        source: manualSalaryData ? 'manual_salary' : (salaryBreakdown ? 'salary_records' : 'payment_only')
      };
    });

    return NextResponse.json({
      success: true,
      data: structuredData,
      count: structuredData.length,
      message: `Found ${structuredData.length} salary payment records with attendance and salary data`
    });
    
  } catch (error) {
    console.error('Error fetching connected salary payment data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
