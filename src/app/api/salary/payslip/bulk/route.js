// src/app/api/salary/payslip/bulk/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const { month, year, employeeIds } = await request.json();

    if (!month || !year || !employeeIds || employeeIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Month, year, and employee IDs are required' },
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

    // First, try to get existing salary records
    const placeholders = employeeIds.map(() => '?').join(',');
    let salaryRecords = await executeQuery(
      `SELECT sr.*, ep.name, ep.emp_code, ep.phone, ep.email
       FROM salary_records sr
       JOIN employee_profile ep ON sr.employee_id = ep.id
       WHERE sr.employee_id IN (${placeholders}) 
       AND sr.month = ? AND sr.year = ?
       ORDER BY ep.name`,
      [...employeeIds, parseInt(month), parseInt(year)]
    );

    // If no salary records found, generate them from attendance
    if (salaryRecords.length === 0) {
      console.log('No salary records found, generating from attendance...');
      
      // Get employees and their attendance
      const employees = await executeQuery(
        `SELECT ep.* FROM employee_profile ep WHERE ep.id IN (${placeholders}) AND ep.status = 1`,
        employeeIds
      );

      for (const employee of employees) {
        // Calculate attendance
        const attendanceData = await executeQuery(
          `SELECT 
             COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
             COUNT(CASE WHEN status = 'half_day' THEN 1 END) as half_days,
             COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days
           FROM attendance 
           WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
          [employee.id, parseInt(month), parseInt(year)]
        );

        const attendance = attendanceData[0] || { present_days: 0, half_days: 0, absent_days: 0 };
        const workedDays = attendance.present_days + (attendance.half_days * 0.5);
        const dailyWage = employee.salary / 30; // Assuming monthly salary
        
        const grossSalary = workedDays * dailyWage;
        const pfDeduction = grossSalary * 0.12; // 12% PF
        const esiDeduction = grossSalary * 0.0075; // 0.75% ESI
        const totalDeductions = pfDeduction + esiDeduction;
        const netSalary = grossSalary - totalDeductions;

        // Insert salary record
        await executeQuery(
          `INSERT INTO salary_records 
           (employee_id, month, year, basic_salary, hra, da, other_allowances, gross_salary, 
            pf_deduction, esi_deduction, tds_deduction, advance_deduction, total_deductions, 
            net_salary, payment_status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            employee.id, parseInt(month), parseInt(year),
            grossSalary, 0, 0, 0, grossSalary, // Basic and gross salary
            pfDeduction, esiDeduction, 0, 0, totalDeductions, // Deductions
            netSalary, 'pending'
          ]
        );
      }

      // Fetch the newly created salary records
      salaryRecords = await executeQuery(
        `SELECT sr.*, ep.name, ep.emp_code, ep.phone, ep.email
         FROM salary_records sr
         JOIN employee_profile ep ON sr.employee_id = ep.id
         WHERE sr.employee_id IN (${placeholders}) 
         AND sr.month = ? AND sr.year = ?
         ORDER BY ep.name`,
        [...employeeIds, parseInt(month), parseInt(year)]
      );
    }

    if (salaryRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Unable to generate salary records for the selected period and employees' },
        { status: 404 }
      );
    }

    // Generate CSV content for bulk payslips
    const csvHeaders = [
      'Employee Code', 'Employee Name', 'Month', 'Year', 'Basic Salary', 'HRA', 'DA', 
      'Other Allowances', 'Gross Salary', 'PF Deduction', 'ESI Deduction', 'TDS Deduction', 
      'Advance Deduction', 'Total Deductions', 'Net Salary', 'Payment Status', 'Email', 'Phone'
    ];

    let csvContent = csvHeaders.join(',') + '\n';

    salaryRecords.forEach(record => {
      const row = [
        `"${record.emp_code || ''}"`,
        `"${record.name || ''}"`,
        record.month,
        record.year,
        record.basic_salary || 0,
        record.hra || 0,
        record.da || 0,
        record.other_allowances || 0,
        record.gross_salary || 0,
        record.pf_deduction || 0,
        record.esi_deduction || 0,
        record.tds_deduction || 0,
        record.advance_deduction || 0,
        record.total_deductions || 0,
        record.net_salary || 0,
        `"${record.payment_status || 'pending'}"`,
        `"${record.email || ''}"`,
        `"${record.phone || ''}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payslips_${month}_${year}.csv"`
      }
    });

  } catch (error) {
    console.error('Error generating bulk payslips:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
