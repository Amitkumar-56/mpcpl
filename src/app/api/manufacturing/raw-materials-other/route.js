import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    const query = `
      SELECT 
        rmo.*,
        t.name as tank_name
      FROM raw_materials_other rmo
      LEFT JOIN manufacturing_tanks t ON rmo.tank_id = t.id
      ORDER BY rmo.created_at DESC
    `;
    
    const [rows] = await connection.execute(query);
    connection.release();
    
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching raw materials other:', error);
    return NextResponse.json(
      { error: 'Failed to fetch raw materials' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const {
      material_name,
      category,
      quantity_kg,
      quantity_litre,
      tank_id,
      supplier_name,
      storage_location,
      batch_number,
      expiry_date,
      remarks
    } = data;

    if (!material_name || !tank_id) {
      return NextResponse.json(
        { error: 'Material name and tank are required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    const query = `
      INSERT INTO raw_materials_other (
        material_name, category, quantity_kg, quantity_litre, tank_id,
        supplier_name, storage_location, batch_number, expiry_date, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      material_name,
      category || 'methanol',
      quantity_kg || 0,
      quantity_litre || 0,
      tank_id,
      supplier_name || null,
      storage_location || null,
      batch_number || null,
      expiry_date || null,
      remarks || null
    ]);
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: 'Raw material added successfully'
    });
  } catch (error) {
    console.error('Error adding raw material:', error);
    return NextResponse.json(
      { error: 'Failed to add raw material' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });
    
    if (updateFields.length === 0) {
      connection.release();
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    const query = `
      UPDATE raw_materials_other 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    updateValues.push(id);
    
    const [result] = await connection.execute(query, updateValues);
    connection.release();
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Raw material updated successfully'
    });
  } catch (error) {
    console.error('Error updating raw material:', error);
    return NextResponse.json(
      { error: 'Failed to update raw material' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const data = await request.json();
    const { id } = data;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Material ID is required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    const query = 'DELETE FROM raw_materials_other WHERE id = ?';
    const [result] = await connection.execute(query, [id]);
    connection.release();
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Material not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Raw material deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting raw material:', error);
    return NextResponse.json(
      { error: 'Failed to delete raw material' },
      { status: 500 }
    );
  }
}
