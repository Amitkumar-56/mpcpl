import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    console.log('🔍 Profile API called, token exists:', !!token);
    
    if (!token) {
      console.log('❌ No token found in cookies');
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Token verification failed');
      return NextResponse.json({ 
        success: false,
        error: 'Invalid token' 
      }, { status: 401 });
    }

    // Get user ID from token (try userId first, then id)
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      console.log('❌ No userId found in token');
      return NextResponse.json({ 
        success: false,
        error: 'User ID not found in token' 
      }, { status: 401 });
    }

    console.log('✅ Token verified, user ID:', userId);

    // Fetch user profile from employee_profile
    const users = await executeQuery(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client,
              address, city, region, country, postbox, phone, phonealt, 
              picture, salary, account_details, created_at
       FROM employee_profile 
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      console.log('❌ User not found in database for ID:', userId);
      return NextResponse.json({ 
        success: false,
        error: 'User profile not found' 
      }, { status: 404 });
    }

    const user = users[0];
    
    // Ensure role is a number (handle both string and number from DB)
    if (user.role !== undefined && user.role !== null) {
      user.role = Number(user.role);
    }
    
    // Don't send password
    delete user.password;

    console.log('✅ Profile fetched successfully for user:', user.name, 'Role:', user.role);

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
