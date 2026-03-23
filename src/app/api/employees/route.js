// src/app/api/employees/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request) {
  try {
    console.log('🔍 Employees API called');
    
    // Get current user
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      console.log('❌ No token found');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const currentUserId = decoded.userId || decoded.id;
    console.log('👤 Current user ID:', currentUserId);

    // Get current user's role
    const userInfo = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [currentUserId]
    );

    if (!userInfo || userInfo.length === 0) {
      console.log('❌ User not found');
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = parseInt(userInfo[0].role) || 0;
    console.log('🔑 User role:', userRole);

    let query = `
      SELECT id, emp_code, name, phone, email, role, salary, status
      FROM employee_profile 
      WHERE status = 1 
      ORDER BY name
    `;

    const params = [];

    // Staff can only see themselves
    if (userRole === 1) {
      query = `
        SELECT id, emp_code, name, phone, email, role, salary, status
        FROM employee_profile 
        WHERE id = ? AND status = 1
      `;
      params.push(currentUserId);
    }

    console.log('📝 Executing query:', query);
    console.log('📋 Query params:', params);

    const employees = await executeQuery(query, params);
    console.log('👥 Employees found:', employees.length);

    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length
    });

  } catch (error) {
    console.error('❌ Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
