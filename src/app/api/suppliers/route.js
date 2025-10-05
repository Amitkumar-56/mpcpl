// src/app/api/suppliers/routes.js
import pool from '@/lib/db';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

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
    console.error('Database error:', error);
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
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

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
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Error creating supplier' },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}