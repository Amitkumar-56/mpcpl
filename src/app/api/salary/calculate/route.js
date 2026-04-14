import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    const userId = searchParams.get('user_id');
    const userRole = searchParams.get('role');
    const month = searchParams.get('month'); // Format: YYYY-MM

    // Simplified approach - get all employees and filter by month in attendance query

    // Get employee salary rates
    const salaryQuery = `
      SELECT 
        e.id as employee_id,
        e.name,
        e.emp_code,
        e.role,
        COALESCE(e.salary, 500) as salary_per_day,
        CASE e.role
          WHEN 1 THEN 'Staff'
          WHEN 2 THEN 'Incharge'
          WHEN 3 THEN 'Team Leader'
          WHEN 4 THEN 'Accountant'
          WHEN 5 THEN 'Admin'
          WHEN 6 THEN 'Driver'
          ELSE 'Unknown'
        END as role_name
      FROM employee_profile e
      WHERE e.status = 'active'
      ORDER BY role_name, e.name
    `;

    const employees = await executeQuery(salaryQuery);

    // Get all attendance data for all employees in the specified month in a single query
    const attendanceQuery = `
      SELECT 
        a.employee_id,
        a.attendance_date,
        a.status,
        a.check_in_time,
        a.check_out_time
      FROM attendance a
      WHERE DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
      ORDER BY a.employee_id, a.attendance_date
    `;

    const allAttendance = await executeQuery(attendanceQuery, [month || new Date().toISOString().slice(0, 7)]);

    // Group attendance by employee for efficient processing
    const attendanceByEmployee = {};
    allAttendance.forEach(record => {
      if (!attendanceByEmployee[record.employee_id]) {
        attendanceByEmployee[record.employee_id] = [];
      }
      attendanceByEmployee[record.employee_id].push(record);
    });

    // Calculate salary for each employee based on attendance
    const salaryCalculations = [];

    for (const employee of employees) {
      const employeeAttendance = attendanceByEmployee[employee.employee_id] || [];
      
      let totalSalary = 0;
      let presentDays = 0;
      let absentDays = 0;
      let halfDays = 0;
      let leaveDays = 0;
      const dailyBreakdown = [];

      // Calculate salary based on attendance
      for (const record of employeeAttendance) {
        let daySalary = 0;
        let status = record.status;

        switch (status) {
          case 'Present':
            daySalary = employee.salary_per_day;
            presentDays++;
            break;
          case 'Half Day':
            daySalary = employee.salary_per_day / 2;
            halfDays++;
            break;
          case 'Leave':
            daySalary = employee.salary_per_day; // Full salary for leave
            leaveDays++;
            break;
          case 'Absent':
            daySalary = 0;
            absentDays++;
            break;
          default:
            daySalary = 0;
        }

        totalSalary += daySalary;

        dailyBreakdown.push({
          date: record.attendance_date,
          status: status,
          check_in: record.check_in_time,
          check_out: record.check_out_time,
          daily_salary: daySalary
        });
      }

      salaryCalculations.push({
        employee_id: employee.employee_id,
        name: employee.name,
        emp_code: employee.emp_code,
        role: employee.role,
        role_name: employee.role_name,
        station_name: employee.station_name,
        salary_per_day: employee.salary_per_day,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        leave_days: leaveDays,
        total_working_days: presentDays + halfDays + leaveDays + absentDays,
        total_salary: totalSalary,
        daily_breakdown: dailyBreakdown
      });
    }

    // Calculate summary by role
    const roleSummary = {};
    salaryCalculations.forEach(calc => {
      if (!roleSummary[calc.role_name]) {
        roleSummary[calc.role_name] = {
          role_name: calc.role_name,
          total_employees: 0,
          total_salary: 0,
          total_present_days: 0,
          total_absent_days: 0,
          total_half_days: 0,
          total_leave_days: 0,
          employees: []
        };
      }
      
      roleSummary[calc.role_name].total_employees++;
      roleSummary[calc.role_name].total_salary += calc.total_salary;
      roleSummary[calc.role_name].total_present_days += calc.present_days;
      roleSummary[calc.role_name].total_absent_days += calc.absent_days;
      roleSummary[calc.role_name].total_half_days += calc.half_days;
      roleSummary[calc.role_name].total_leave_days += calc.leave_days;
      roleSummary[calc.role_name].employees.push(calc);
    });

    const summaryArray = Object.values(roleSummary);

    return new Response(JSON.stringify({
      success: true,
      month: month || new Date().toISOString().slice(0, 7),
      individual_calculations: salaryCalculations,
      role_summary: summaryArray,
      grand_total: {
        total_employees: salaryCalculations.length,
        total_salary: salaryCalculations.reduce((sum, calc) => sum + calc.total_salary, 0),
        total_present_days: salaryCalculations.reduce((sum, calc) => sum + calc.present_days, 0),
        total_absent_days: salaryCalculations.reduce((sum, calc) => sum + calc.absent_days, 0),
        total_half_days: salaryCalculations.reduce((sum, calc) => sum + calc.half_days, 0),
        total_leave_days: salaryCalculations.reduce((sum, calc) => sum + calc.leave_days, 0)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error calculating salary:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to calculate salary: ' + error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
