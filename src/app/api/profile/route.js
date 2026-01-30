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

    // Fetch user profile with station info using JOIN
    console.log('📋 Fetching profile from database for user ID:', userId);
    const users = await executeQuery(
      `SELECT e.id, e.emp_code, e.name, e.email, e.role, e.status, e.fs_id, e.fl_id, e.station, e.client,
              e.address, e.city, e.region, e.country, e.postbox, e.phone, e.phonealt, 
              e.picture, e.salary, e.account_details, e.created_at,
              GROUP_CONCAT(DISTINCT fs.station_name ORDER BY fs.station_name SEPARATOR ', ') as station_names
       FROM employee_profile e 
       LEFT JOIN filling_stations fs ON FIND_IN_SET(fs.id, e.fs_id) > 0
       WHERE e.id = ?
       GROUP BY e.id, e.emp_code, e.name, e.email, e.role, e.status, e.fs_id, e.fl_id, e.station, e.client,
               e.address, e.city, e.region, e.country, e.postbox, e.phone, e.phonealt, 
               e.picture, e.salary, e.account_details, e.created_at`,
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
    
    // Ensure role is a number
    if (user.role !== undefined && user.role !== null) {
      user.role = Number(user.role);
    }

    // Add station details to user object (from JOIN)
    user.station_details = user.station_names;

    console.log('✅ Profile fetched successfully:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      fs_id: user.fs_id,
      station_names: user.station_names,
      station: user.station
    });

    console.log('🔍 Station info:', {
      fs_id: user.fs_id,
      station: user.station,
      station_names: user.station_names
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