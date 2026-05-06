import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const connection = await pool.getConnection();
    
    const query = `
      SELECT 
        fg.*,
        t.name as tank_name
      FROM finished_goods fg
      LEFT JOIN manufacturing_tanks t ON fg.tank_id = t.id
      ORDER BY fg.created_at DESC
    `;
    
    const [rows] = await connection.execute(query);
    connection.release();
    
    // Parse source_raw_materials array
    const processedRows = rows.map(row => ({
      ...row,
      source_raw_materials: row.source_raw_materials ? row.source_raw_materials.split(',').map(id => parseInt(id.trim())) : []
    }));
    
    return NextResponse.json(processedRows);
  } catch (error) {
    console.error('Error fetching finished goods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finished goods' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    const {
      product_name,
      category,
      quantity_kg,
      quantity_litre,
      tank_id,
      batch_number,
      production_date,
      expiry_date,
      quality_grade,
      source_raw_materials,
      processing_method,
      storage_location,
      remarks
    } = data;

    if (!product_name || !tank_id) {
      return NextResponse.json(
        { error: 'Product name and tank are required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    const query = `
      INSERT INTO finished_goods (
        product_name, category, quantity_kg, quantity_litre, tank_id,
        batch_number, production_date, expiry_date, quality_grade,
        source_raw_materials, processing_method, storage_location, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await connection.execute(query, [
      product_name,
      category || 'waste_material',
      quantity_kg || 0,
      quantity_litre || 0,
      tank_id,
      batch_number || null,
      production_date || null,
      expiry_date || null,
      quality_grade || 'A',
      source_raw_materials ? source_raw_materials.join(',') : null,
      processing_method || null,
      storage_location || null,
      remarks || null
    ]);

    // Update physical tank stock
    await connection.execute(`
      INSERT INTO manufacturing_tank_stocks (tank_id, kg_stock, litre_stock)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
      kg_stock = kg_stock + VALUES(kg_stock),
      litre_stock = litre_stock + VALUES(litre_stock)
    `, [tank_id, quantity_kg || 0, quantity_litre || 0]);

    // Update active allocation stock
    await connection.execute(`
      UPDATE tank_allocation
      SET current_quantity_kg = current_quantity_kg + ?,
          current_quantity_litre = current_quantity_litre + ?
      WHERE tank_id = ? AND status = 'active'
    `, [quantity_kg || 0, quantity_litre || 0, tank_id]);
    
    connection.release();
    
    return NextResponse.json({
      success: true,
      id: result.insertId,
      message: 'Finished goods added successfully'
    });
  } catch (error) {
    console.error('Error adding finished goods:', error);
    return NextResponse.json(
      { error: 'Failed to add finished goods' },
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
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    // Convert arrays to strings for storage
    const processedData = { ...updateData };
    if (processedData.source_raw_materials && Array.isArray(processedData.source_raw_materials)) {
      processedData.source_raw_materials = processedData.source_raw_materials.join(',');
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(processedData).forEach(key => {
      if (processedData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(processedData[key]);
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
      UPDATE finished_goods 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;
    
    updateValues.push(id);
    
    const [result] = await connection.execute(query, updateValues);
    connection.release();
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Finished goods updated successfully'
    });
  } catch (error) {
    console.error('Error updating finished goods:', error);
    return NextResponse.json(
      { error: 'Failed to update finished goods' },
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
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    const query = 'DELETE FROM finished_goods WHERE id = ?';
    const [result] = await connection.execute(query, [id]);
    connection.release();
    
    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Finished goods deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting finished goods:', error);
    return NextResponse.json(
      { error: 'Failed to delete finished goods' },
      { status: 500 }
    );
  }
}
