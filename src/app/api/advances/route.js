//src/app/api/advances/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('GET request received for advances');
    
    const { searchParams } = new URL(request.url);
    const employee_id = searchParams.get('employee_id');
    const status = searchParams.get('status');

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log('No token found in GET request');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Invalid token in GET request');
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
      console.log('User not found in GET request');
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    console.log('User role in GET:', userRole);

    let query = `
      SELECT 
        a.*,
        ep.name as employee_name,
        ep.emp_code,
        ep.phone,
        ep.email
      FROM advances a
      JOIN employee_profile ep ON a.employee_id = ep.id
      WHERE 1=1
    `;

    const params = [];

    // Staff can only see their own advances
    if (userRole === 1) {
      query += ' AND a.employee_id = ?';
      params.push(currentUserId);
    }

    if (employee_id) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.created_at DESC';

    console.log('Executing GET query:', query);
    console.log('GET params:', params);

    const advances = await executeQuery(query, params);
    console.log('GET result - advances found:', advances.length);
    
    return NextResponse.json({
      success: true,
      data: advances,
      count: advances.length
    });
    
  } catch (error) {
    console.error('Error in GET advances:', error);
    console.error('GET error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    console.log('POST request received for advances');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { 
      employee_id, 
      amount, 
      reason, 
      payment_method,
      payment_date,
      remarks
    } = body;

    if (!employee_id || !amount) {
      console.log('Validation failed: missing employee_id or amount');
      return NextResponse.json(
        { success: false, error: 'Employee ID and amount are required' },
        { status: 400 }
      );
    }

    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log('No token found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('Invalid token');
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUserId = decoded.userId || decoded.id;
    console.log('Current user ID:', currentUserId);

    // Create advances table if it doesn't exist
    try {
      await executeQuery('SELECT 1 FROM advances LIMIT 1');
      console.log('Advances table exists');
    } catch (tableError) {
      console.log('Advances table does not exist, creating it...');
      
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS advances (
          id INT AUTO_INCREMENT PRIMARY KEY,
          employee_id INT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          reason TEXT,
          payment_method VARCHAR(50) DEFAULT 'cash',
          payment_date DATE,
          remarks TEXT,
          status ENUM('pending', 'approved', 'rejected', 'repaid') DEFAULT 'pending',
          repayment_amount DECIMAL(10,2),
          repayment_date DATE,
          created_by INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `;
      
      await executeQuery(createTableQuery);
      console.log('Advances table created successfully');
    }

    // Check if employee exists
    try {
      const employee = await executeQuery(
        `SELECT name, emp_code FROM employee_profile WHERE id = ?`,
        [employee_id]
      );

      if (!employee || employee.length === 0) {
        console.log('Employee not found:', employee_id);
        return NextResponse.json(
          { success: false, error: 'Employee not found' },
          { status: 404 }
        );
      }

      console.log('Employee found:', employee[0]);
    } catch (empError) {
      console.log('Employee check failed:', empError.message);
      return NextResponse.json(
        { success: false, error: 'Error checking employee: ' + empError.message },
        { status: 500 }
      );
    }

    // Insert advance record
    const advanceData = {
      employee_id,
      amount: parseFloat(amount),
      reason: reason || '',
      payment_method: payment_method || 'cash',
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      remarks: remarks || '',
      status: 'pending',
      created_by: currentUserId
    };

    console.log('Inserting advance data:', advanceData);

    const insertQuery = `
      INSERT INTO advances (
        employee_id, amount, reason, payment_method, payment_date,
        remarks, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      advanceData.employee_id, advanceData.amount, advanceData.reason,
      advanceData.payment_method, advanceData.payment_date, advanceData.remarks,
      advanceData.status, advanceData.created_by
    ]);

    console.log('Insert result:', result);

    return NextResponse.json({
      success: true,
      message: 'Advance added successfully',
      data: {
        ...advanceData,
        id: result.insertId
      }
    });

  } catch (error) {
    console.error('Error adding advance:', error);
    console.error('Error stack:', error.stack);
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
      status,
      repayment_amount,
      repayment_date,
      remarks
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Advance ID is required' },
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

    // Update advance status
    const updateQuery = `
      UPDATE advances SET
        status = ?, repayment_amount = ?, repayment_date = ?, 
        remarks = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      status || 'pending',
      repayment_amount || null,
      repayment_date || null,
      remarks || '',
      id
    ]);

    return NextResponse.json({
      success: true,
      message: 'Advance status updated successfully'
    });

  } catch (error) {
    console.error('Error updating advance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
