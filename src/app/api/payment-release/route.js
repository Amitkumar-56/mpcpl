import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

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

    // Only Admin, Accountant, Team Leader can release payments
    if (![5, 4, 3].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get pending salary records from salary_records table
    let query = `
      SELECT 
        sr.*,
        ep.name as employee_name,
        ep.emp_code,
        ep.phone,
        ep.email,
        ep.account_details
      FROM salary_records sr
      JOIN employee_profile ep ON sr.employee_id = ep.id
      WHERE sr.status = 'pending'
    `;

    const params = [];

    if (month) {
      query += ' AND sr.month = ?';
      params.push(month);
    }

    if (year) {
      query += ' AND sr.year = ?';
      params.push(year);
    }

    query += ' ORDER BY ep.name ASC';

    const salaryRecords = await executeQuery(query, params);
    
    // Get advances for these employees
    const employeeIds = salaryRecords.map(s => s.employee_id);
    let advances = [];
    
    if (employeeIds.length > 0) {
      const advancesQuery = `
        SELECT * FROM advances 
        WHERE employee_id IN (${employeeIds.join(',')}) 
        AND status = 'approved'
        ORDER BY employee_id
      `;
      advances = await executeQuery(advancesQuery);
    }

    // Group advances by employee
    const advancesByEmployee = {};
    advances.forEach(advance => {
      if (!advancesByEmployee[advance.employee_id]) {
        advancesByEmployee[advance.employee_id] = [];
      }
      advancesByEmployee[advance.employee_id].push(advance);
    });

    // Combine salary records data with advances
    const combinedData = salaryRecords.map(payment => ({
      ...payment,
      advances: advancesByEmployee[payment.employee_id] || [],
      totalAdvanceAmount: (advancesByEmployee[payment.employee_id] || [])
        .reduce((sum, advance) => sum + parseFloat(advance.amount || 0), 0),
      finalNetSalary: parseFloat(payment.net_salary || 0) - 
        (advancesByEmployee[payment.employee_id] || [])
          .reduce((sum, advance) => sum + parseFloat(advance.amount || 0), 0)
    }));

    const stats = {
      totalEmployees: combinedData.length,
      totalNetSalary: combinedData.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0),
      totalAdvances: combinedData.reduce((sum, s) => sum + s.totalAdvanceAmount, 0),
      finalTotal: combinedData.reduce((sum, s) => sum + s.finalNetSalary, 0)
    };

    return NextResponse.json({
      success: true,
      data: combinedData,
      stats,
      count: combinedData.length
    });
    
  } catch (error) {
    console.error('Error fetching payment release data:', error);
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
      month, 
      year,
      payment_date,
      payment_method,
      remarks,
      selected_employees
    } = body;

    if (!month || !year || !payment_date) {
      return NextResponse.json(
        { success: false, error: 'Month, year, and payment date are required' },
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

    // Only Admin, Accountant, Team Leader can release payments
    if (![5, 4, 3].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get selected salaries or all pending salaries
    let query = `
      SELECT sr.*, ep.name as employee_name
      FROM salary_records sr
      JOIN employee_profile ep ON sr.employee_id = ep.id
      WHERE sr.status = 'pending' AND sr.month = ? AND sr.year = ?
    `;

    const params = [month, year];

    if (selected_employees && selected_employees.length > 0) {
      query += ` AND sr.employee_id IN (${selected_employees.join(',')})`;
    }

    const salariesToRelease = await executeQuery(query, params);

    if (salariesToRelease.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending salaries found for release' },
        { status: 404 }
      );
    }

    // Update all selected salaries
    const updateQuery = `
      UPDATE salary_records SET
        status = 'released',
        release_date = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    const releasePromises = salariesToRelease.map(salary => 
      executeQuery(updateQuery, [payment_date, salary.id])
    );

    await Promise.all(releasePromises);

    // Mark advances as repaid
    const employeeIds = salariesToRelease.map(s => s.employee_id);
    if (employeeIds.length > 0) {
      const updateAdvancesQuery = `
        UPDATE advances SET
          status = 'repaid',
          repayment_date = ?,
          updated_at = NOW()
        WHERE employee_id IN (${employeeIds.join(',')}) AND status = 'approved'
      `;
      await executeQuery(updateAdvancesQuery, [payment_date]);
    }

    // Create payment release record
    const releaseRecord = {
      month,
      year,
      payment_date,
      payment_method: payment_method || 'bank',
      remarks: remarks || '',
      total_employees: salariesToRelease.length,
      total_amount: salariesToRelease.reduce((sum, s) => sum + parseFloat(s.net_salary || 0), 0),
      created_by: currentUserId
    };

    // Log the release
    console.log('Payment release completed:', releaseRecord);

    return NextResponse.json({
      success: true,
      message: `Successfully released payments for ${salariesToRelease.length} employees`,
      data: {
        releaseRecord,
        releasedEmployees: salariesToRelease.map(s => ({
          id: s.id,
          employee_name: s.employee_name,
          net_salary: s.net_salary
        }))
      }
    });

  } catch (error) {
    console.error('Error releasing payments:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
