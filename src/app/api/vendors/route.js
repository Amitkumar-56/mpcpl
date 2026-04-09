// src/app/api/vendors/route.js
import pool from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all vendors
export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT id, name, phone, status, created_at, updated_at, created_by
      FROM vendors
      ORDER BY created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return NextResponse.json(
      { error: 'Error fetching vendors' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// POST - Create new vendor
export async function POST(request) {
  let connection;
  try {
    connection = await pool.getConnection();
    const { name, phone, status, created_by } = await request.json();

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Validate phone number - exactly 10 digits
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Phone number must be exactly 10 digits' },
        { status: 400 }
      );
    }

    // Insert new vendor with status
    const [result] = await connection.execute(`
      INSERT INTO vendors (name, phone, status, created_by)
      VALUES (?, ?, ?, ?)
    `, [name, phone, status || 1, created_by]);

    // Get the created vendor
    const [newVendor] = await connection.execute(
      'SELECT * FROM vendors WHERE id = ?',
      [result.insertId]
    );

    // Create Audit Log
    try {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth');
      const { createAuditLog } = await import('@/lib/auditLog');
      
      let userId = null;
      let userName = null;
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const [users] = await connection.execute(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name || null;
            }
          }
        }
      } catch (authError) {
        console.error('Error getting user for audit log:', authError);
      }

      await createAuditLog({
        page: 'Vendors',
        uniqueCode: result.insertId.toString(),
        section: 'Vendor Management',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `Vendor created: ${name}`,
        oldValue: null,
        newValue: newVendor[0],
        recordType: 'vendor',
        recordId: result.insertId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json(newVendor[0], { status: 201 });
  } catch (error) {
    console.error('Error creating vendor:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating vendor', details: error.toString() },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PUT - Update vendor
export async function PUT(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    connection = await pool.getConnection();
    
    // Get old vendor data
    const [oldVendorResult] = await connection.execute(
      'SELECT id, name, phone, status, created_at, updated_at, created_by FROM vendors WHERE id = ?',
      [id]
    );

    if (oldVendorResult.length === 0) {
      return NextResponse.json(
        { error: 'Vendor not found' },
        { status: 404 }
      );
    }

    const oldVendor = oldVendorResult[0];

    // Build update query dynamically - only update changed fields
    const updateFields = [];
    const updateValues = [];

    // Only update fields that have actually changed
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        return;
      }
      
      // Get old and new values
      const oldValue = oldVendor[key];
      const newValue = updateData[key];
      
      // Handle numeric/string comparison
      const numericFields = ['id', 'created_by'];
      let hasChanged = false;
      
      if (numericFields.includes(key)) {
        const oldNum = oldValue !== null && oldValue !== undefined ? Number(oldValue) : null;
        const newNum = newValue !== null && newValue !== undefined ? Number(newValue) : null;
        hasChanged = oldNum !== newNum;
      } else {
        // For string fields, compare trimmed values
        const oldStr = oldValue !== null && oldValue !== undefined 
          ? String(oldValue).trim() 
          : '';
        const newStr = newValue !== null && newValue !== undefined 
          ? String(newValue).trim() 
          : '';
        hasChanged = oldStr !== newStr;
      }
      
      // Only add to update if value has actually changed
      if (hasChanged) {
        updateFields.push(`${key} = ?`);
        // Convert status string to integer if it's the status field
        if (key === 'status') {
          const statusValue = newValue === 'active' || newValue === 'Active' || newValue === 1 || newValue === '1' ? 1 : 0;
          updateValues.push(statusValue);
        } else {
          updateValues.push(newValue);
        }
      }
    });

    // Check if there's anything to update
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(id);

    // Update vendor
    const updateQuery = `UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`;
    await connection.execute(updateQuery, updateValues);

    // Fetch updated vendor
    const [updatedVendor] = await connection.execute(
      'SELECT id, name, phone, status, created_at, updated_at, created_by FROM vendors WHERE id = ?',
      [id]
    );

    // Create Audit Log
    try {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth');
      const { createAuditLog } = await import('@/lib/auditLog');
      
      let userId = null;
      let userName = null;
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (token) {
          const decoded = verifyToken(token);
          if (decoded) {
            userId = decoded.userId || decoded.id;
            const [users] = await connection.execute(
              `SELECT name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name || null;
            }
          }
        }
      } catch (authError) {
        console.error('Error getting user for audit log:', authError);
      }

      await createAuditLog({
        page: 'Vendors',
        uniqueCode: id.toString(),
        section: 'Vendor Management',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Vendor updated: ${oldVendor.name}`,
        oldValue: oldVendor,
        newValue: updatedVendor[0],
        recordType: 'vendor',
        recordId: parseInt(id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedVendor[0]
    });

  } catch (error) {
    console.error('Error updating vendor:', error);
    return NextResponse.json(
      { error: 'Error updating vendor: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
