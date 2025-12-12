// src/app/api/suppliers/route.js
import pool from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET all suppliers
export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.execute(`
      SELECT id, name, phone, address, postbox, email, picture, 
             gstin, pan, supplier_type, status, created_at
      FROM suppliers
      ORDER BY created_at DESC
    `);
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json(
      { error: 'Error fetching suppliers' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// POST - Create new supplier
export async function POST(request) {
  let connection;
  try {
    const data = await request.json();
    const {
      name, phone, address, postbox, email, picture,
      gstin, pan, supplier_type, status, password
    } = data;

    // Validation
    if (!name || !pan || !supplier_type || !status || !password) {
      return NextResponse.json(
        { error: 'Required fields: name, pan, supplier_type, status, password' },
        { status: 400 }
      );
    }

    // Hash password using SHA-256
    const hashedPassword = hashPassword(password);

    connection = await pool.getConnection();
    
    const [result] = await connection.execute(
      `INSERT INTO suppliers 
       (name, phone, address, postbox, email, picture, gstin, pan, supplier_type, status, password) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, phone, address, postbox, email, picture || 'default.png', 
       gstin, pan, supplier_type, status, hashedPassword]
    );

    const [newSupplier] = await connection.execute(
      'SELECT id, name, phone, address, postbox, email, picture, gstin, pan, supplier_type, status, created_at FROM suppliers WHERE id = ?',
      [result.insertId]
    );

    return NextResponse.json(newSupplier[0], { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error creating supplier' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

// PUT - Update supplier (only changed fields)
export async function PUT(request) {
  let connection;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    
    connection = await pool.getConnection();
    
    // Get old supplier data
    const [oldSupplierResult] = await connection.execute(
      'SELECT * FROM suppliers WHERE id = ?',
      [id]
    );

    if (oldSupplierResult.length === 0) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const oldSupplier = oldSupplierResult[0];

    // Build update query dynamically - only update changed fields
    const updateFields = [];
    const updateValues = [];

    // Handle password separately (hash it if provided)
    if (updateData.password !== undefined && updateData.password !== null && updateData.password !== '') {
      updateFields.push('password = ?');
      updateValues.push(hashPassword(updateData.password));
      delete updateData.password;
    }

    // Only update fields that have actually changed
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || updateData[key] === null) {
        return;
      }
      
      // Get old and new values
      const oldValue = oldSupplier[key];
      const newValue = updateData[key];
      
      // Handle numeric/string comparison
      const numericFields = ['id'];
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
        updateValues.push(updateData[key]);
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

    // Update supplier
    const updateQuery = `UPDATE suppliers SET ${updateFields.join(', ')} WHERE id = ?`;
    await connection.execute(updateQuery, updateValues);

    // Fetch updated supplier
    const [updatedSupplier] = await connection.execute(
      'SELECT id, name, phone, address, postbox, email, picture, gstin, pan, supplier_type, status, created_at FROM suppliers WHERE id = ?',
      [id]
    );

    return NextResponse.json({
      success: true,
      data: updatedSupplier[0]
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Error updating supplier: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}