import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get('token')?.value;
    
    console.log('🔍 Profile API called');
    console.log('Token from cookies:', token ? 'exists' : 'missing');
    
    // If no token in cookies, check Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization');
      console.log('Auth header:', authHeader ? 'exists' : 'missing');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
        console.log('Token from auth header: exists');
      }
    }
    
    if (!token) {
      console.log('❌ No token found in request');
      return NextResponse.json({ 
        success: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Verify the token
    const decoded = verifyToken(token);
    if (!decoded) {
      console.log('❌ Token verification failed - token might be expired or invalid');
      return NextResponse.json({ 
        success: false,
        error: 'Invalid or expired token' 
      }, { status: 401 });
    }

    // Get user ID from token
    const userId = decoded.userId || decoded.id || decoded.emp_id;
    console.log('✅ Token decoded successfully, user ID:', userId, 'decoded:', decoded);

    if (!userId) {
      console.log('❌ No user ID found in token');
      return NextResponse.json({ 
        success: false,
        error: 'User ID not found in token' 
      }, { status: 401 });
    }

    // Fetch user profile
    console.log('📋 Fetching profile from database for user ID:', userId);
    const users = await executeQuery(
      `SELECT id, emp_code, name, email, role, status, fs_id, fl_id, station, client,
              address, city, region, country, postbox, phone, phonealt, 
              picture, salary, account_details, created_at
       FROM employee_profile 
       WHERE id = ?`,
      [userId]
    );

    console.log('📊 Database query result count:', users.length);

    if (users.length === 0) {
      console.log('❌ User not found in database for ID:', userId);
      return NextResponse.json({ 
        success: false,
        error: 'User profile not found' 
      }, { status: 404 });
    }

    const user = users[0];
    
    // Check if employee is active (status = 1)
    if (user.status === 0 || user.status === null || user.status === undefined) {
      console.log('❌ Employee account is disabled');
      return NextResponse.json({ 
        success: false,
        error: 'Your account has been deactivated by admin. Please contact administrator.' 
      }, { status: 403 });
    }
    
    // Ensure role is a number
    if (user.role !== undefined && user.role !== null) {
      user.role = Number(user.role);
    }

    console.log('✅ Profile fetched successfully:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    return NextResponse.json({ 
      success: true,
      data: user
    });

  } catch (error) {
    console.error('🔥 Profile API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + (error.message || 'Unknown error')
    }, { status: 500 });
  }
}