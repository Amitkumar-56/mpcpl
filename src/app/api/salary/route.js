import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';
import { cookies } from 'next/headers';

// GET - Fetch salary records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

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

    let query = `
      SELECT 
        sr.*,
        ep.name as employee_name,
        ep.emp_code,
        ep.salary as employee_salary,
        ep.phone,
        ep.email
      FROM salary_records sr
      JOIN employee_profile ep ON sr.employee_id = ep.id
      WHERE 1=1
    `;

    const params = [];

    // Staff can only see their own salary
    if (userRole === 1) {
      query += ' AND sr.employee_id = ?';
      params.push(currentUserId);
    }

    if (employee_id) {
      query += ' AND sr.employee_id = ?';
      params.push(employee_id);
    }

    if (month) {
      query += ' AND sr.month = ?';
      params.push(month);
    }

    if (year) {
      query += ' AND sr.year = ?';
      params.push(year);
    }

    if (status) {
      query += ' AND sr.status = ?';
      params.push(status);
    }

    query += ' ORDER BY sr.year DESC, sr.month DESC, ep.name ASC';

    let salaryRecords;
    try {
      salaryRecords = await executeQuery(query, params);
    } catch (error) {
      // If table doesn't exist, return empty result
      if (error.message.includes("Table") && error.message.includes("doesn't exist")) {
        return NextResponse.json({
          success: true,
          data: [],
          count: 0,
          message: 'Salary table not initialized. Please run the initialization first.'
        });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: salaryRecords,
      count: salaryRecords.length
    });

  } catch (error) {
    console.error('Error fetching salary records:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Calculate and generate salary
export async function POST(request) {
  try {
    const body = await request.json();
    const { employee_id, month, year, force_generate = false } = body;

    // Validation
    if (!employee_id || !month || !year) {
      return NextResponse.json(
        { success: false, error: 'Employee ID, month, and year are required' },
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

    // Only Admin, Accountant, and Team Leader can generate salary
    if (userRole < 3) {
      return NextResponse.json(
        { success: false, error: 'Access denied. Only Admin, Accountant, and Team Leader can generate salary.' },
        { status: 403 }
      );
    }

    // Check if salary already exists
    let existing;
    try {
      existing = await executeQuery(
        `SELECT id FROM salary_records WHERE employee_id = ? AND month = ? AND year = ?`,
        [employee_id, month, year]
      );
    } catch (error) {
      if (error.message.includes("Table") && error.message.includes("doesn't exist")) {
        return NextResponse.json(
          { success: false, error: 'Salary table not initialized. Please run /init-salary first.' },
          { status: 400 }
        );
      }
      throw error;
    }

    if (existing && existing.length > 0 && !force_generate) {
      return NextResponse.json(
        { success: false, error: 'Salary already exists for this employee and month. Use force_generate to override.' },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await executeQuery(
      `SELECT id, name, emp_code, salary FROM employee_profile WHERE id = ?`,
      [employee_id]
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employeeData = employee[0];
    const employeeSalary = parseFloat(employeeData.salary) || 0;

    // Calculate total working days in the month
    const totalDays = new Date(year, month, 0).getDate();

    // Get attendance records for the month
    const attendance = await executeQuery(
      `SELECT status FROM attendance 
       WHERE employee_id = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?`,
      [employee_id, month, year]
    );

    // Calculate present days (Full day = 1, Half day = 0.5)
    let presentDays = 0;
    attendance.forEach(record => {
      if (record.status === 'Present') {
        presentDays += 1;
      } else if (record.status === 'Half Day') {
        presentDays += 0.5;
      }
    });

    // Professional salary calculation with Component Formula (MNC Style)
    // employee_profile.salary = CTC (Cost to Company)
    const ctcAmount = employeeSalary; // Use actual salary as CTC
    
    // Component Formula Breakdown
    const basicSalary = ctcAmount * 0.50; // 50% of CTC
    const hraAmount = basicSalary * 0.30; // 30% of Basic
    const foodAllowance = 2000; // Fixed Food Allowance
    const fixedIncentive = 2000; // Fixed Performance Incentive
    
    // Calculate Gross Salary (A) - Sum of Components
    const grossSalary = basicSalary + hraAmount + foodAllowance + fixedIncentive;
    
    // Calculate earned salary based on worked days
    const perDaySalary = grossSalary / totalDays;
    const earnedSalary = perDaySalary * presentDays;
    
    // Professional deductions
    const pfDeduction = basicSalary * 0.12; // 12% of Basic
    const esiDeduction = grossSalary * 0.0075; // 0.75% of Gross
    const employerPF = basicSalary * 0.12; // 12% of Basic (Company contribution)
    
    // Net Take-Home Calculation
    const totalDeduction = pfDeduction + esiDeduction;
    const netSalary = grossSalary - totalDeduction;

    const salaryData = {
      employee_id,
      month,
      year,
      total_days: totalDays,
      present_days: presentDays,
      basic_salary: basicSalary, // Component Formula Basic (50% of CTC)
      earned_salary: earnedSalary,
      pf_deduction: pfDeduction,
      esi_deduction: esiDeduction,
      tds_deduction: 0,
      advance_deduction: 0,
      total_deduction: totalDeduction,
      net_salary: netSalary,
      status: 'pending',
      // Component Formula Details
      ctc_amount: ctcAmount, // Total CTC from employee profile
      hra_amount: hraAmount, // 30% of Basic
      food_allowance: foodAllowance, // Fixed ₹2,000
      fixed_incentive: fixedIncentive, // Fixed ₹2,000
      gross_salary: grossSalary, // Sum of all components
      employer_pf: employerPF, // 12% of Basic (Company contribution)
      per_day_salary: perDaySalary // Daily rate for earned calculation
    };

    let result;
    if (existing && existing.length > 0 && force_generate) {
      // Update existing record
      const updateQuery = `
        UPDATE salary_records SET
        total_days = ?, present_days = ?, basic_salary = ?, earned_salary = ?,
        pf_deduction = ?, esi_deduction = ?, tds_deduction = ?, advance_deduction = ?,
        total_deduction = ?, net_salary = ?, status = ?
        WHERE id = ?
      `;
      result = await executeQuery(updateQuery, [
        totalDays, presentDays, basicSalary, earnedSalary,
        pfDeduction, esiDeduction, 0, 0,
        totalDeduction, netSalary, 'pending', existing[0].id
      ]);
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO salary_records (
          employee_id, month, year, total_days, present_days, basic_salary, earned_salary,
          pf_deduction, esi_deduction, tds_deduction, advance_deduction,
          total_deduction, net_salary, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      result = await executeQuery(insertQuery, [
        employee_id, month, year, totalDays, presentDays, basicSalary, earnedSalary,
        pfDeduction, esiDeduction, 0, 0,
        totalDeduction, netSalary, 'pending'
      ]);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Salary Management',
        uniqueCode: `SALARY-${salaryData.id}`,
        section: 'Generate Salary',
        userId: currentUserId,
        userName: `Employee ID: ${currentUserId}`,
        action: existing && existing.length > 0 ? 'edit' : 'add',
        remarks: `Salary ${existing && existing.length > 0 ? 'updated' : 'generated'} for ${employeeData.name} for ${month}/${year}`,
        oldValue: null,
        newValue: salaryData,
        recordType: 'salary',
        recordId: salaryData.id
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Salary ${existing && existing.length > 0 ? 'updated' : 'generated'} successfully`,
      data: salaryData
    });

  } catch (error) {
    console.error('Error generating salary:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update salary record (for deductions, etc.)
export async function PUT(request) {
  try {
    const body = await request.json();
    console.log('PUT request body:', body);
    
    const { 
      id, 
      tds_deduction, 
      advance_deduction, 
      status 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary record ID is required' },
        { status: 400 }
      );
    }

    // Get current user and verify permissions
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

    // Get current salary record
    const currentSalary = await executeQuery(
      `SELECT * FROM salary_records WHERE id = ?`,
      [id]
    );

    if (!currentSalary || currentSalary.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Salary record not found' },
        { status: 404 }
      );
    }

    const salaryData = currentSalary[0];

    // Update calculations
    const updatedTds = parseFloat(tds_deduction) || salaryData.tds_deduction || 0;
    const updatedAdvance = parseFloat(advance_deduction) || salaryData.advance_deduction || 0;
    const updatedTotalDeduction = salaryData.pf_deduction + salaryData.esi_deduction + updatedTds + updatedAdvance;
    const updatedNetSalary = salaryData.earned_salary - updatedTotalDeduction;

    const updateQuery = `
      UPDATE salary_records SET
        tds_deduction = ?, advance_deduction = ?, total_deduction = ?, net_salary = ?, 
        status = ?, release_date = ?, updated_at = NOW()
      WHERE id = ?
    `;

    console.log('Update query values:', [
      updatedTds, updatedAdvance,
      updatedTotalDeduction, updatedNetSalary,
      status || salaryData.status,
      status === 'released' ? new Date().toISOString().split('T')[0] : salaryData.release_date,
      id
    ]);

    await executeQuery(updateQuery, [
      updatedTds, updatedAdvance,
      updatedTotalDeduction, updatedNetSalary,
      status || salaryData.status,
      status === 'released' ? new Date().toISOString().split('T')[0] : salaryData.release_date,
      id
    ]);

    // Get updated record
    const updatedRecord = await executeQuery(
      `SELECT * FROM salary_records WHERE id = ?`,
      [id]
    );

    // Create audit log
    try {
      await createAuditLog({
        page: 'Salary Management',
        uniqueCode: `SALARY-${id}`,
        section: 'Update Salary',
        userId: currentUserId,
        userName: `Employee ID: ${currentUserId}`,
        action: 'edit',
        remarks: `Salary record ${id} updated with new deductions/incentives`,
        oldValue: salaryData,
        newValue: updatedRecord[0],
        recordType: 'salary',
        recordId: id
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Salary record updated successfully',
      data: updatedRecord[0]
    });

  } catch (error) {
    console.error('Error updating salary record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
