// src/app/api/payment-release/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    // Only Admin (5), Accountant (4), Team Leader (3) can release payments
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
        ep.name AS employee_name,
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
      params.push(parseInt(month));
    }

    if (year) {
      query += ' AND sr.year = ?';
      params.push(parseInt(year));
    }

    query += ' ORDER BY ep.name ASC';

    const salaryRecords = await executeQuery(query, params);

    if (salaryRecords.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        stats: {
          totalEmployees: 0,
          totalNetSalary: 0,
          totalAdvances: 0,
          finalTotal: 0
        },
        count: 0
      });
    }

    // Get advances for these employees using placeholders (fix SQL injection)
    const employeeIds = salaryRecords.map(s => s.employee_id);
    const placeholders = employeeIds.map(() => '?').join(',');

    // FIX: Also filter advances by month/year so only relevant advances are deducted
    let advancesQuery = `
      SELECT * FROM advances 
      WHERE employee_id IN (${placeholders}) 
      AND status = 'approved'
    `;
    const advancesParams = [...employeeIds];

    if (month) {
      advancesQuery += ' AND MONTH(created_at) = ?';
      advancesParams.push(parseInt(month));
    }
    if (year) {
      advancesQuery += ' AND YEAR(created_at) = ?';
      advancesParams.push(parseInt(year));
    }

    advancesQuery += ' ORDER BY employee_id';

    const advances = await executeQuery(advancesQuery, advancesParams);

    // Group advances by employee
    const advancesByEmployee = {};
    advances.forEach(advance => {
      if (!advancesByEmployee[advance.employee_id]) {
        advancesByEmployee[advance.employee_id] = [];
      }
      advancesByEmployee[advance.employee_id].push(advance);
    });

    // Combine salary records data with advances
    const combinedData = salaryRecords.map(payment => {
      const empAdvances = advancesByEmployee[payment.employee_id] || [];
      const totalAdvanceAmount = empAdvances.reduce(
        (sum, advance) => sum + parseFloat(advance.amount || 0),
        0
      );
      const netSalary = parseFloat(payment.net_salary || 0);
      return {
        ...payment,
        advances: empAdvances,
        totalAdvanceAmount,
        finalNetSalary: netSalary - totalAdvanceAmount
      };
    });

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

    // Only Admin (5), Accountant (4), Team Leader (3) can release payments
    if (![5, 4, 3].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build query with proper parameterized placeholders
    let query = `
      SELECT sr.*, ep.name AS employee_name
      FROM salary_records sr
      JOIN employee_profile ep ON sr.employee_id = ep.id
      WHERE sr.status = 'pending' AND sr.month = ? AND sr.year = ?
    `;
    const params = [parseInt(month), parseInt(year)];

    // FIX: Use parameterized placeholders for selected_employees
    if (selected_employees && selected_employees.length > 0) {
      const empPlaceholders = selected_employees.map(() => '?').join(',');
      query += ` AND sr.employee_id IN (${empPlaceholders})`;
      params.push(...selected_employees);
    }

    const salariesToRelease = await executeQuery(query, params);

    if (salariesToRelease.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending salaries found for release' },
        { status: 404 }
      );
    }

    // Update salary records one-by-one with parameterized queries
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

    // FIX: Mark advances as repaid using parameterized placeholders
    const employeeIds = salariesToRelease.map(s => s.employee_id);
    if (employeeIds.length > 0) {
      const empPlaceholders = employeeIds.map(() => '?').join(',');
      const updateAdvancesQuery = `
        UPDATE advances SET
          status = 'repaid',
          repayment_date = ?,
          updated_at = NOW()
        WHERE employee_id IN (${empPlaceholders}) AND status = 'approved'
      `;
      await executeQuery(updateAdvancesQuery, [payment_date, ...employeeIds]);
    }

    // Create payment release summary record (optional: persist to DB if table exists)
    const releaseRecord = {
      month,
      year,
      payment_date,
      payment_method: payment_method || 'bank',
      remarks: remarks || '',
      total_employees: salariesToRelease.length,
      total_amount: salariesToRelease.reduce(
        (sum, s) => sum + parseFloat(s.net_salary || 0),
        0
      ),
      created_by: currentUserId
    };

    console.log('Payment release completed:', releaseRecord);

    return NextResponse.json({
      success: true,
      message: `Successfully released payments for ${salariesToRelease.length} employee${salariesToRelease.length > 1 ? 's' : ''}`,
      data: {
        releaseRecord,
        releasedEmployees: salariesToRelease.map(s => ({
          id: s.id,
          employee_id: s.employee_id,
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