import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { station_id, product_id, quantity, remarks } = await request.json();

    // Validate required fields
    if (!station_id || !product_id || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Station ID, Product ID and Quantity are required' },
        { status: 400 }
      );
    }

    // First, check if the stock record exists
    const checkQuery = `
      SELECT id, stock FROM filling_station_stocks 
      WHERE fs_id = ? AND product = ?
    `;
    
    const existingRecord = await executeQuery(checkQuery, [station_id, product_id]);

    if (existingRecord.length > 0) {
      // Update existing record
      const updateQuery = `
        UPDATE filling_station_stocks 
        SET stock = stock + ?, msg = ?, remark = ?, created_at = NOW() 
        WHERE fs_id = ? AND product = ?
      `;
      await executeQuery(updateQuery, [
        parseInt(quantity), 
        `Stock added: ${quantity}`, 
        remarks || 'Stock added',
        station_id, 
        product_id
      ]);
    } else {
      // Insert new record
      const insertQuery = `
        INSERT INTO filling_station_stocks 
        (fs_id, product, stock, msg, remark, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      await executeQuery(insertQuery, [
        station_id, 
        product_id, 
        parseInt(quantity),
        `Stock added: ${quantity}`,
        remarks || 'Stock added'
      ]);
    }

    // Insert into stock_history with remarks (if stock_history table exists)
    try {
      const historyQuery = `
        INSERT INTO stock_history (fs_id, product_id, quantity, remarks, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;
      await executeQuery(historyQuery, [
        station_id, 
        product_id, 
        parseInt(quantity), 
        remarks || 'Stock added'
      ]);
    } catch (historyError) {
      console.log('stock_history table might not exist, skipping...');
    }

    // Create audit log entry
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS stock_audit_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          stock_id INT,
          station_id INT,
          product_id INT,
          action_type VARCHAR(50) NOT NULL,
          user_id INT,
          user_name VARCHAR(255),
          remarks TEXT,
          quantity DECIMAL(10,2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_stock_id (stock_id),
          INDEX idx_station_id (station_id),
          INDEX idx_created_at (created_at)
        )
      `);
      
      // Fetch employee name from employee_profile
      let employeeName = 'System';
      const stockId = existingRecord.length > 0 ? existingRecord[0].id : null;
      try {
        const employeeResult = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [1]
        );
        if (employeeResult.length > 0) {
          employeeName = employeeResult[0].name;
        }
      } catch (empError) {
        console.error('Error fetching employee name:', empError);
      }
      
      await executeQuery(
        `INSERT INTO stock_audit_log (stock_id, station_id, product_id, action_type, user_id, user_name, remarks, quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [stockId, station_id, product_id, 'added', 1, employeeName, remarks || 'Stock added', parseInt(quantity)]
      );
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
      // Don't fail the main operation
    }

    return NextResponse.json({
      success: true,
      message: 'Stock added successfully'
    });

  } catch (error) {
    console.error('Error adding stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add stock: ' + error.message },
      { status: 500 }
    );
  }
}