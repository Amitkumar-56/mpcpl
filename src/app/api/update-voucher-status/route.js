// src/app/api/update-voucher-status/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const voucher_id = searchParams.get('voucher_id');
    const status = searchParams.get('status');

    // Get current user from token
    let current_user = { id: 1, name: 'System' };
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
          if (users.length > 0) {
            current_user = users[0];
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user info:', authError);
    }

    let sql, params;
    let actionType = '';
    let remarks = '';

    if (status == 1) {
      // Approve: store approver's id
      sql = 'UPDATE vouchers SET status = 1, approved_by = ?, approved_date = NOW() WHERE voucher_id = ?';
      params = [current_user.id, voucher_id];
      actionType = 'approve';
      remarks = `Approved by ${current_user.name}`;
    } else {
      // Reject: store rejector's id
      sql = 'UPDATE vouchers SET status = 2, rejected_by = ?, rejected_date = NOW() WHERE voucher_id = ?';
      params = [current_user.id, voucher_id];
      actionType = 'reject';
      remarks = `Rejected by ${current_user.name}`;
    }

    await executeQuery(sql, params);

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
        oldValue: { status: status == 1 ? 0 : 1 },
        newValue: { status: status == 1 ? 1 : 2 },
        recordType: 'voucher',
        recordId: parseInt(voucher_id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Voucher ${status == 1 ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}