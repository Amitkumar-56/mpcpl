// src/app/api/packing/route.js
import pool from '@/lib/db';
import { NextResponse } from 'next/server';

// GET all packing entries
export async function GET(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;
    
    // Validate parameters
    if (isNaN(page) || page < 1) {
      return NextResponse.json(
        { error: 'Invalid page parameter' },
        { status: 400 }
      );
    }
    
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'Invalid limit parameter (must be between 1 and 1000)' },
        { status: 400 }
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { error: 'Invalid offset parameter' },
        { status: 400 }
      );
    }
    
    console.log('GET packing entries - Page:', page, 'Limit:', limit, 'Offset:', offset);
    
    connection = await pool.getConnection();
    
    // Get total count for pagination
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM vendors');
    const total = countResult[0].total;
    
    // Get paginated packing entries
    const [rows] = await connection.execute(`
      SELECT id, name, phone, status, amount, created_at, updated_at, created_by
      FROM vendors
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    return NextResponse.json({
      success: true,
      vendors: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching packing entries:', error);
    return NextResponse.json(
      { success: false, error: 'Error fetching packing entries' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// POST - Create new packing entry
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

    // Insert new packing entry with status and amount
    const [result] = await connection.execute(`
      INSERT INTO vendors (name, phone, status, amount, created_by)
      VALUES (?, ?, ?, ?, ?)
    `, [name, phone, status || 1, 0.00, created_by]);

    // Get the created packing entry
    const [newPacking] = await connection.execute(
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
        page: 'Packing',
        uniqueCode: result.insertId.toString(),
        section: 'Packing Management',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `Packing entry created: ${name}`,
        oldValue: null,
        newValue: newPacking[0],
        recordType: 'packing',
        recordId: result.insertId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json(newPacking[0], { status: 201 });
  } catch (error) {
    console.error('Error creating packing entry:', error);
    return NextResponse.json(
      { error: error.message || 'Error creating packing entry', details: error.toString() },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PUT - Update packing entry
export async function PUT(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Packing ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    connection = await pool.getConnection();
    
    // Get old packing data
    const [oldPackingResult] = await connection.execute(
      'SELECT id, name, phone, status, amount, created_at, updated_at, created_by FROM vendors WHERE id = ?',
      [id]
    );

    if (oldPackingResult.length === 0) {
      return NextResponse.json(
        { error: 'Packing entry not found' },
        { status: 404 }
      );
    }

    const oldPacking = oldPackingResult[0];

    // Build update query dynamically - only update changed fields
    const updateFields = [];
    const updateValues = [];

    // Only update fields that have actually changed
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        return;
      }
      
      // Get old and new values
      const oldValue = oldPacking[key];
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

    // Update packing entry
    const updateQuery = `UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`;
    await connection.execute(updateQuery, updateValues);

    // Fetch updated packing entry
    const [updatedPacking] = await connection.execute(
      'SELECT id, name, phone, status, amount, created_at, updated_at, created_by FROM vendors WHERE id = ?',
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
        page: 'Packing',
        uniqueCode: id.toString(),
        section: 'Packing Management',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Packing entry updated: ${oldPacking.name}`,
        oldValue: oldPacking,
        newValue: updatedPacking[0],
        recordType: 'packing',
        recordId: parseInt(id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedPacking[0]
    });

  } catch (error) {
    console.error('Error updating packing entry:', error);
    return NextResponse.json(
      { error: 'Error updating packing entry: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// DELETE - Delete packing entry
export async function DELETE(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Packing ID is required' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();
    
    // Get packing data before deletion for audit log
    const [packingResult] = await connection.execute(
      'SELECT id, name, phone, status, amount, created_at, updated_at, created_by FROM vendors WHERE id = ?',
      [id]
    );

    if (packingResult.length === 0) {
      return NextResponse.json(
        { error: 'Packing entry not found' },
        { status: 404 }
      );
    }

    const packing = packingResult[0];

    // Delete packing entry
    await connection.execute('DELETE FROM vendors WHERE id = ?', [id]);

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
        page: 'Packing',
        uniqueCode: id.toString(),
        section: 'Packing Management',
        userId: userId,
        userName: userName,
        action: 'delete',
        remarks: `Packing entry deleted: ${packing.name}`,
        oldValue: packing,
        newValue: null,
        recordType: 'packing',
        recordId: parseInt(id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Packing entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting packing entry:', error);
    return NextResponse.json(
      { error: 'Error deleting packing entry: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}
