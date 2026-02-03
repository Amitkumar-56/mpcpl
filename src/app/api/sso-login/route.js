import { getCurrentUser } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request) {
  try {
    // Get current logged-in user
    const currentUser = await getCurrentUser();
    
    if (!currentUser || !currentUser.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user details from database
    const userQuery = `
      SELECT id, name, email, role, emp_code 
      FROM employee_profile 
      WHERE id = ? AND status = 1
    `;
    const users = await executeQuery(userQuery, [currentUser.userId]);
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];

    // Create SSO token for old website
    const ssoToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        empCode: user.emp_code,
        timestamp: Date.now(),
        source: 'new-website'
      },
      JWT_SECRET,
      { expiresIn: '5m' } // Token valid for 5 minutes
    );

    // Store token in database for verification
    const insertTokenQuery = `
      INSERT INTO sso_tokens (user_id, token, expires_at, created_at) 
      VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE), NOW())
    `;
    await executeQuery(insertTokenQuery, [user.id, ssoToken]);

    return NextResponse.json({
      success: true,
      ssoToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        empCode: user.emp_code
      }
    });

  } catch (error) {
    console.error('SSO Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
