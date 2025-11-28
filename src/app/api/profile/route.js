import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid token' 
      }, { status: 401 });
    }

    // Fetch user profile from employee_profile
    const users = await executeQuery(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client,
              address, city, region, country, postbox, phone, phonealt, 
              picture, salary, account_details, created_at
       FROM employee_profile 
       WHERE id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    const user = users[0];
    // Don't send password
    delete user.password;

    return NextResponse.json({ 
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Profile API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
