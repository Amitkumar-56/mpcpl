// src/app/api/cst/change-password/route.js
import { executeQuery } from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ 
        success: false,
        error: 'Current password and new password are required' 
      }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        success: false,
        error: 'New password must be at least 6 characters long' 
      }, { status: 400 });
    }

    // Get customer ID from headers
    const customerId = request.headers.get('x-customer-id');
    if (!customerId) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer authentication required' 
      }, { status: 401 });
    }

    // Get current user data
    const userQuery = 'SELECT password FROM customers WHERE id = ?';
    const userResult = await executeQuery(userQuery, [parseInt(customerId)]);

    if (userResult.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    // Verify current password
    const hashedCurrentPassword = crypto.createHash('sha256').update(currentPassword).digest('hex');
    if (userResult[0].password !== hashedCurrentPassword) {
      return NextResponse.json({ 
        success: false,
        error: 'Current password is incorrect' 
      }, { status: 400 });
    }

    // Hash new password
    const hashedNewPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

    // Update password
    const updateQuery = 'UPDATE customers SET password = ? WHERE id = ?';
    await executeQuery(updateQuery, [hashedNewPassword, parseInt(customerId)]);

    return NextResponse.json({ 
      success: true,
      message: 'Password changed successfully' 
    });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
