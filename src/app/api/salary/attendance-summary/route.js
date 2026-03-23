import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Get current user from token
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
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

    // If employee_id is not provided, use current user's ID for staff
    let targetEmployeeId = employee_id;
    if (!targetEmployeeId && userRole === 1) {
      targetEmployeeId = currentUserId;
    }

    if (!targetEmployeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: 'Month and year are required' },
        { status: 400 }
      );
    }

    // Staff can only see their own data
    if (userRole === 1 && parseInt(targetEmployeeId) !== currentUserId) {
      return NextResponse.json(
        { success: false, error: 'Access denied - You can only view your own attendance' },
        { status: 403 }
      );
    }

    // Get employee details
    const employee = await executeQuery(
      `SELECT id, name, emp_code, phone, email, salary 
       FROM employee_profile WHERE id = ?`,
      [targetEmployeeId]
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employeeData = employee[0];

    // Get all days in the month
    const totalDays = new Date(year, month, 0).getDate();

    // Get attendance records for each day of the month
    const attendance = await executeQuery(
      `SELECT 
         DAY(attendance_date) as day,
         status,
         check_in_time,
         check_out_time,
         remarks
       FROM attendance 
       WHERE employee_id = ? 
         AND MONTH(attendance_date) = ? 
         AND YEAR(attendance_date) = ?
       ORDER BY attendance_date`,
      [targetEmployeeId, month, year]
    );

    // Calculate attendance summary
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    let workingDays = 0;

    const attendanceMap = {};
    attendance.forEach(record => {
      attendanceMap[record.day] = record;
      
      switch(record.status) {
        case 'Present':
          presentDays++;
          workingDays++;
          break;
        case 'Absent':
          absentDays++;
          break;
        case 'Half Day':
          halfDays++;
          presentDays += 0.5;
          workingDays++;
          break;
        case 'Leave':
          leaveDays++;
          break;
      }
    });

    // Calculate weekends (Sundays) as non-working days
    let weekends = 0;
    for (let day = 1; day <= totalDays; day++) {
      const dayOfWeek = new Date(year, month - 1, day).getDay();
      if (dayOfWeek === 0) weekends++; // Sunday
    }

    const totalWorkingDays = totalDays - weekends;

    // Calculate salary
    const annualSalary = parseFloat(employeeData.salary) || 0;
    const monthlySalary = annualSalary / 12;
    
    // Professional salary calculation with Component Formula (MNC Style)
    // employee_profile.salary = CTC (Cost to Company) - Annual
    const ctcAmount = annualSalary;
    
    // Component Formula Breakdown (Monthly calculations)
    const basicSalary = monthlySalary * 0.50; // 50% of Monthly CTC
    const hraAmount = basicSalary * 0.30; // 30% of Basic
    const foodAllowance = 2000; // Fixed Food Allowance
    const fixedIncentive = 2000; // Fixed Performance Incentive
    
    // Calculate Gross Salary (A) - Sum of Components
    const grossSalary = basicSalary + hraAmount + foodAllowance + fixedIncentive;

    // Calculate earned salary based on worked days
    const perDaySalary = grossSalary / totalWorkingDays;
    const earnedSalary = perDaySalary * presentDays;
    
    // Professional deductions
    const pfDeduction = basicSalary * 0.12; // 12% of Basic
    const esiDeduction = earnedSalary * 0.0075; // 0.75% of Earned

    return NextResponse.json({
      success: true,
      data: {
        employee: employeeData,
        month: parseInt(month),
        year: parseInt(year),
        totalDays,
        totalWorkingDays,
        weekends,
        attendance: attendanceMap,
        summary: {
          presentDays,
          absentDays,
          halfDays,
          leaveDays,
          workingDays,
          effectivePresentDays: presentDays
        },
        salary: {
          annualSalary: annualSalary,
          monthlySalary: monthlySalary,
          basicSalary: basicSalary, // Component Formula Basic (50% of Monthly CTC)
          hraAmount: hraAmount, // 30% of Basic
          foodAllowance: foodAllowance, // Fixed ₹2,000
          fixedIncentive: fixedIncentive, // Fixed ₹2,000
          grossSalary: grossSalary, // Sum of all components
          perDaySalary: perDaySalary, // Daily rate for earned calculation
          earnedSalary: earnedSalary,
          deductions: {
            pf: pfDeduction,
            esi: esiDeduction
          }
        }
      }
    });

  } catch (error) {
    console.error('Error fetching attendance summary:', error);
    
    // Handle specific database errors
    if (error.message.includes('Table') && error.message.includes("doesn't exist")) {
      return NextResponse.json(
        { success: false, error: 'Attendance table not found. Please ensure the database is properly set up.' },
        { status: 500 }
      );
    }
    
    // Handle connection errors
    if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed. Please try again later.' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}