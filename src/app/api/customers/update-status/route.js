// src/app/api/customers/update-status/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function PATCH(request) {
  try {
    const cookieStore = await cookies();
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

    // Ensure customer_permissions exists
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS customer_permissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          customer_id INT NOT NULL,
          module_name VARCHAR(255) NOT NULL,
          can_view TINYINT(1) DEFAULT 0,
          can_edit TINYINT(1) DEFAULT 0,
          can_create TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_customer (customer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
      
      // ✅ Add can_create column if table exists but column doesn't
      try {
        await executeQuery(`ALTER TABLE customer_permissions ADD COLUMN can_create TINYINT(1) DEFAULT 0`);
      } catch (alterErr) {
        // Column already exists, ignore
        if (!alterErr.message.includes('Duplicate column name')) {
          console.warn('Error adding can_create column:', alterErr.message);
        }
      }
      
      // ✅ Remove can_delete column if it exists
      try {
        await executeQuery(`ALTER TABLE customer_permissions DROP COLUMN can_delete`);
      } catch (dropErr) {
        // Column doesn't exist, ignore
        if (!dropErr.message.includes("doesn't exist") && !dropErr.message.includes('Unknown column')) {
          console.warn('Error removing can_delete column:', dropErr.message);
        }
      }
    } catch (permErr) {
      // continue even if ensure fails
      console.error('Ensure customer_permissions error:', permErr);
    }

    // Sync key modules permissions on activate/deactivate
    const modulesToSync = ['Products', 'Loading Station'];
    for (const moduleName of modulesToSync) {
      // Check existing permission
      const existing = await executeQuery(
        `SELECT id FROM customer_permissions WHERE customer_id = ? AND module_name = ? LIMIT 1`,
        [customerId, moduleName]
      );
      if (existing.length > 0) {
        await executeQuery(
          `UPDATE customer_permissions SET can_view = ?, can_edit = ?, can_create = ? WHERE id = ?`,
          [status ? 1 : 0, status ? 1 : 0, status ? 1 : 0, existing[0].id]
        );
      } else {
        await executeQuery(
          `INSERT INTO customer_permissions (customer_id, module_name, can_view, can_edit, can_create, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [customerId, moduleName, status ? 1 : 0, status ? 1 : 0, status ? 1 : 0]
        );
      }
    }

    // Get admin user name for audit log
    let adminName = null;
    try {
      const adminResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [decoded.userId]
      );
      if (adminResult.length > 0) {
        adminName = adminResult[0].name;
      }
    } catch (nameError) {
      console.error('Error getting admin name:', nameError);
    }

    // Create audit log for status change
    try {
      const { createAuditLog } = await import('@/lib/auditLog');
      await createAuditLog({
        page: 'Customers',
        uniqueCode: customerId.toString(),
        section: 'Customer Management',
        userId: decoded.userId,
        userName: adminName || 'Admin',
        action: status ? 'approve' : 'reject',
        remarks: status ? `Customer enabled by ${adminName || 'Admin'}` : `Customer disabled by ${adminName || 'Admin'}`,
        oldValue: { status: customer[0].status, name: customer[0].name },
        newValue: { status: status ? 1 : 0, name: customer[0].name },
        recordType: 'customer',
        recordId: customerId
      });
    } catch (auditErr) {
      console.error('Audit log error:', auditErr);
    }

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

