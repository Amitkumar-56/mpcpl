import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

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

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      employee_id, 
      month, 
      year,
      basic_salary,
      earned_salary,
      pf_deduction,
      esi_deduction,
      tds_deduction,
      advance_deduction,
      total_deduction,
      net_salary,
      payment_status,
      payment_date,
      payment_method,
      remarks
    } = body;

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

    // Check if salary already exists
    const existing = await executeQuery(
      `SELECT id FROM salary_records WHERE employee_id = ? AND month = ? AND year = ?`,
      [employee_id, month, year]
    );

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Salary already exists for this employee and month' },
        { status: 400 }
      );
    }

    // Get employee details
    const employee = await executeQuery(
      `SELECT name, emp_code, salary FROM employee_profile WHERE id = ?`,
      [employee_id]
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employeeData = employee[0];

    // Insert manual salary record
    const salaryData = {
      employee_id,
      month,
      year,
      total_days: new Date(year, month, 0).getDate(),
      present_days: earned_salary > 0 && basic_salary > 0 ? (earned_salary / basic_salary) * new Date(year, month, 0).getDate() : 0,
      basic_salary: basic_salary || 0,
      earned_salary: earned_salary || 0,
      pf_deduction: pf_deduction || 0,
      esi_deduction: esi_deduction || 0,
      tds_deduction: tds_deduction || 0,
      advance_deduction: advance_deduction || 0,
      total_deduction: total_deduction || 0,
      net_salary: net_salary || 0,
      status: payment_status || 'pending',
      release_date: payment_date || null
    };

    const insertQuery = `
      INSERT INTO salary_records (
        employee_id, month, year, total_days, present_days, basic_salary, earned_salary,
        pf_deduction, esi_deduction, tds_deduction, advance_deduction,
        total_deduction, net_salary, status, release_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      salaryData.employee_id, salaryData.month, salaryData.year, salaryData.total_days, 
      salaryData.present_days, salaryData.basic_salary, salaryData.earned_salary,
      salaryData.pf_deduction, salaryData.esi_deduction, salaryData.tds_deduction, 
      salaryData.advance_deduction, salaryData.total_deduction, salaryData.net_salary,
      salaryData.status, salaryData.release_date
    ]);

    return NextResponse.json({
      success: true,
      message: 'Manual salary added successfully',
      data: {
        ...salaryData,
        id: result.insertId
      }
    });

  } catch (error) {
    console.error('Error adding manual salary:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { 
      id, 
      payment_status,
      payment_date,
      payment_method,
      remarks
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Salary record ID is required' },
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

    // Update payment status
    const updateQuery = `
      UPDATE salary_records SET
        status = ?, release_date = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      payment_status || 'pending',
      payment_date || null,
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Payment status updated successfully'
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
