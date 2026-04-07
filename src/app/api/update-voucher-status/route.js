// src/app/api/update-voucher-status/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const body = await request.json();
    const { voucher_id, status } = body;

    // Only allow approve (status = 1)
    if (status != 1) {
      return NextResponse.json(
        { error: 'Invalid status. Only approve is allowed.' },
        { status: 400 }
      );
    }

    // Get current user from token - ALWAYS fetch from employee_profile
    let current_user = { id: null, name: null };
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0 && users[0].name) {
            current_user = { id: users[0].id, name: users[0].name };
          } else {
            // If not found, use userId but don't use 'System'
            current_user = { id: userId, name: `Employee ID: ${userId}` };
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user info:', authError);
    }
    
    // If no user found, return error instead of using System
    if (!current_user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

    console.log('=== Update Voucher Status API Called ===');
    console.log('Voucher ID:', voucher_id);
    console.log('New Status:', status);
    console.log('Current User:', current_user);

    // Get current voucher data for rollback
    const currentVoucher = await executeQuery(
      'SELECT status FROM vouchers WHERE voucher_id = ?',
      [voucher_id]
    );
    
    if (currentVoucher.length === 0) {
      return NextResponse.json(
        { error: 'Voucher not found' },
        { status: 404 }
      );
    }

    // Approve: store approver's id
    const sql = 'UPDATE vouchers SET status = 1, approved_by = ?, approved_at = NOW() WHERE voucher_id = ?';
    const params = [current_user.id, voucher_id];
    const actionType = 'approve';
    const remarks = `Approved by ${current_user.name}`;

    console.log('SQL Query:', sql);
    console.log('Parameters:', params);

    try {
      const result = await executeQuery(sql, params);
      console.log('Update Result:', result);
      console.log(`Voucher ${voucher_id} ${actionType}d successfully`);
    } catch (updateError) {
      console.error('Error updating voucher:', updateError);
      return NextResponse.json({ 
        error: `Failed to update voucher: ${updateError.message}`, 
        success: false,
        old_status: currentVoucher[0].status
      }, { status: 500 });
    }

    // Log the action in audit log
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS voucher_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          voucher_id INT NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          user_id INT,
          user_name VARCHAR(255),
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_voucher_id (voucher_id),
          INDEX idx_created_at (created_at)
        )
      `);

      await executeQuery(`
        INSERT INTO voucher_audit_log (voucher_id, action_type, user_id, user_name, remarks)
        VALUES (?, ?, ?, ?, ?)
      `, [voucher_id, actionType, current_user.id, current_user.name, remarks]);
    } catch (logError) {
      console.error('Error logging action:', logError);
    }

    // Create comprehensive audit log
    try {
      await createAuditLog({
        page: 'Vouchers',
        uniqueCode: voucher_id.toString(),
        section: 'Voucher Status',
        userId: current_user.id,
        userName: current_user.name,
        action: actionType,
        remarks: remarks,
        oldValue: { status: currentVoucher[0].status },
        newValue: { status: 1 },
        recordType: 'voucher',
        recordId: parseInt(voucher_id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Voucher approved successfully' 
    });
  } catch (error) {
    console.error('Error in POST update-voucher-status:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');
    const status = searchParams.get('status');

    // Only allow approve (status = 1)
    if (status != 1) {
      return NextResponse.json(
        { error: 'Invalid status. Only approve is allowed.' },
        { status: 400 }
      );
    }

    // Get current user from token - ALWAYS fetch from employee_profile
    let current_user = { id: null, name: null };
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0 && users[0].name) {
            current_user = { id: users[0].id, name: users[0].name };
          } else {
            // If not found, use userId but don't use 'System'
            current_user = { id: userId, name: `Employee ID: ${userId}` };
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user info:', authError);
    }
    
    // If no user found, return error instead of using System
    if (!current_user.id) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login again.' },
        { status: 401 }
      );
    }

    console.log('=== Update Voucher Status API Called ===');
    console.log('Voucher ID:', voucher_id);
    console.log('New Status:', status);
    console.log('Current User:', current_user);

    // Approve: store approver's id
    const sql = 'UPDATE vouchers SET status = 1, approved_by = ?, approved_at = NOW() WHERE voucher_id = ?';
    const params = [current_user.id, voucher_id];
    const actionType = 'approve';
    const remarks = `Approved by ${current_user.name}`;

    console.log('SQL Query:', sql);
    console.log('Parameters:', params);

    try {
      const result = await executeQuery(sql, params);
      console.log('Update Result:', result);
      console.log(`Voucher ${voucher_id} ${actionType}d successfully`);
    } catch (updateError) {
      console.error('Error updating voucher:', updateError);
      return NextResponse.json({ 
        error: `Failed to update voucher: ${updateError.message}`, 
        success: false 
      }, { status: 500 });
    }

    // Log the action in audit log
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS voucher_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          voucher_id INT NOT NULL,
          action_type VARCHAR(50) NOT NULL,
          user_id INT,
          user_name VARCHAR(255),
          remarks TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_voucher_id (voucher_id),
          INDEX idx_created_at (created_at)
        )
      `);

      await executeQuery(`
        INSERT INTO voucher_audit_log (voucher_id, action_type, user_id, user_name, remarks)
        VALUES (?, ?, ?, ?, ?)
      `, [voucher_id, actionType, current_user.id, current_user.name, remarks]);
    } catch (logError) {
      console.error('Error logging action:', logError);
    }

    // Create comprehensive audit log
    try {
      await createAuditLog({
        page: 'Vouchers',
        uniqueCode: voucher_id.toString(),
        section: 'Voucher Status',
        userId: current_user.id,
        userName: current_user.name,
        action: actionType,
        remarks: remarks,
        oldValue: { status: 0 },
        newValue: { status: 1 },
        recordType: 'voucher',
        recordId: parseInt(voucher_id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Voucher approved successfully' 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}