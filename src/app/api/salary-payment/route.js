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
    const payment_status = searchParams.get('payment_status');

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.userId || decoded.id;

    let query = `
      SELECT 
        sp.*,
        ep.name as employee_name,
        ep.emp_code,
        ep.phone,
        ep.email,
        ep.salary as employee_salary,
        creator.name as created_by_name,
        approver.name as approved_by_name
      FROM salary_payment sp
      JOIN employee_profile ep ON sp.employee_id = ep.id
      LEFT JOIN employee_profile creator ON sp.created_by = creator.id
      LEFT JOIN employee_profile approver ON sp.approved_by = approver.id
      WHERE 1=1
    `;

    const params = [];

    // Staff can only see their own salary payments
    const userInfo = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );
    const userRole = parseInt(userInfo[0]?.role) || 0;

    if (userRole === 1) {
      query += ' AND sp.employee_id = ?';
      params.push(currentUserId);
    }

    if (employee_id) {
      query += ' AND sp.employee_id = ?';
      params.push(employee_id);
    }

    if (month) {
      query += ' AND sp.salary_month = ?';
      params.push(parseInt(month));
    }

    if (year) {
      query += ' AND sp.salary_year = ?';
      params.push(parseInt(year));
    }

    if (payment_status) {
      query += ' AND sp.payment_status = ?';
      params.push(payment_status);
    }

    query += ' ORDER BY sp.created_at DESC';

    const payments = await executeQuery(query, params);
    
    return NextResponse.json({
      success: true,
      data: payments,
      count: payments.length
    });
    
  } catch (error) {
    console.error('Error fetching salary payments:', error);
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
      salary_month,
      salary_year,
      basic_salary,
      hra,
      da,
      ta,
      ma,
      other_allowance,
      pf_deduction,
      esi_deduction,
      tds_deduction,
      advance_deduction,
      other_deduction,
      working_days,
      present_days,
      absent_days,
      half_days,
      leave_days,
      overtime_hours,
      overtime_amount,
      incentive_bonus,
      payment_date,
      payment_method,
      transaction_id,
      bank_name,
      account_number,
      ifsc_code,
      cheque_number,
      upi_id,
      remarks
    } = body;

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.userId || decoded.id;

    // Validate required fields
    if (!employee_id || !salary_month || !salary_year || !basic_salary || !payment_date) {
      return NextResponse.json(
        { success: false, error: 'Employee ID, month, year, basic salary and payment date are required' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await executeQuery(
      `SELECT name, emp_code FROM employee_profile WHERE id = ?`,
      [employee_id]
    );

    if (!employee || employee.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate totals
    const grossSalary = parseFloat(basic_salary || 0) + parseFloat(hra || 0) + parseFloat(da || 0) + parseFloat(ta || 0) + parseFloat(ma || 0) + parseFloat(other_allowance || 0) + parseFloat(overtime_amount || 0) + parseFloat(incentive_bonus || 0);
    const totalDeduction = parseFloat(pf_deduction || 0) + parseFloat(esi_deduction || 0) + parseFloat(tds_deduction || 0) + parseFloat(advance_deduction || 0) + parseFloat(other_deduction || 0);
    const netSalary = grossSalary - totalDeduction;

    // Insert salary payment
    const insertQuery = `
      INSERT INTO salary_payment (
        employee_id, salary_month, salary_year, basic_salary, hra, da, ta, ma,
        other_allowance, gross_salary, pf_deduction, esi_deduction, tds_deduction,
        advance_deduction, other_deduction, total_deduction, net_salary,
        working_days, present_days, absent_days, half_days, leave_days,
        overtime_hours, overtime_amount, incentive_bonus, payment_date, payment_method,
        transaction_id, bank_name, account_number, ifsc_code, cheque_number,
        upi_id, payment_status, remarks, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      employee_id,
      parseInt(salary_month),
      parseInt(salary_year),
      parseFloat(basic_salary),
      parseFloat(hra || 0),
      parseFloat(da || 0),
      parseFloat(ta || 0),
      parseFloat(ma || 0),
      parseFloat(other_allowance || 0),
      grossSalary,
      parseFloat(pf_deduction || 0),
      parseFloat(esi_deduction || 0),
      parseFloat(tds_deduction || 0),
      parseFloat(advance_deduction || 0),
      parseFloat(other_deduction || 0),
      totalDeduction,
      netSalary,
      parseInt(working_days || 26),
      parseInt(present_days || 0),
      parseInt(absent_days || 0),
      parseInt(half_days || 0),
      parseInt(leave_days || 0),
      parseFloat(overtime_hours || 0),
      parseFloat(overtime_amount || 0),
      parseFloat(incentive_bonus || 0),
      payment_date,
      payment_method || 'bank',
      transaction_id || null,
      bank_name || null,
      account_number || null,
      ifsc_code || null,
      cheque_number || null,
      upi_id || null,
      'pending',
      remarks || '',
      currentUserId
    ]);

    return NextResponse.json({
      success: true,
      message: 'Salary payment processed successfully',
      data: {
        id: result.insertId,
        employee_id,
        salary_month: parseInt(salary_month),
        salary_year: parseInt(salary_year),
        gross_salary: grossSalary,
        total_deduction: totalDeduction,
        net_salary: netSalary,
        payment_status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error processing salary payment:', error);
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
      approved_by,
      processed_date,
      remarks
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.userId || decoded.id;

    // Update salary payment
    const updateQuery = `
      UPDATE salary_payment 
      SET payment_status = ?, 
          approved_by = ?, 
          processed_date = ?,
          approved_at = CURRENT_TIMESTAMP,
          remarks = ?
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      payment_status,
      approved_by || currentUserId,
      processed_date || null,
      remarks || '',
      parseInt(id)
    ]);

    return NextResponse.json({
      success: true,
      message: 'Salary payment updated successfully'
    });

  } catch (error) {
    console.error('Error updating salary payment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
