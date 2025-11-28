// src/app/api/customers/update-status/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
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

    // Check if user is admin (role 5)
    const adminCheck = await executeQuery(
      `SELECT role FROM employee_profile WHERE id = ?`,
      [decoded.userId]
    );

    if (adminCheck.length === 0 || adminCheck[0].role !== 5) {
      return NextResponse.json({ 
        success: false,
        error: 'Only admin can update customer status' 
      }, { status: 403 });
    }

    const { customerId, status } = await request.json();

    if (!customerId || status === undefined) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer ID and status are required' 
      }, { status: 400 });
    }

    // Check if customer exists
    const customer = await executeQuery(
      `SELECT id, name, status FROM customers WHERE id = ?`,
      [customerId]
    );

    if (customer.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: 'Customer not found' 
      }, { status: 404 });
    }

    // Update status
    await executeQuery(
      `UPDATE customers SET status = ? WHERE id = ?`,
      [status ? 1 : 0, customerId]
    );

    return NextResponse.json({ 
      success: true,
      message: `Customer ${status ? 'activated' : 'deactivated'} successfully` 
    });

  } catch (error) {
    console.error('Update customer status error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

