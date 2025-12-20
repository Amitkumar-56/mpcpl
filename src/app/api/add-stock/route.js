import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const { station_id, product_id, quantity, remarks, agent_id } = await request.json();
    
    // Get user info for audit log
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null;
    const userName = currentUser?.userName || 'System';
    
    // If agent_id is provided, get agent name
    let agentName = null;
    if (agent_id) {
      try {
        const agentResult = await executeQuery(
          `SELECT CONCAT(first_name, ' ', last_name) AS name FROM agents WHERE id = ?`,
          [agent_id]
        );
        if (agentResult.length > 0) {
          agentName = agentResult[0].name;
        }
      } catch (agentError) {
        console.error('Error fetching agent name:', agentError);
      }
    }

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

    // Insert into stock_history with remarks and agent_id (if stock_history table exists)
    try {
      const historyQuery = agent_id ? `
        INSERT INTO stock_history (fs_id, product_id, quantity, remarks, agent_id, created_at) 
        VALUES (?, ?, ?, ?, ?, NOW())
      ` : `
        INSERT INTO stock_history (fs_id, product_id, quantity, remarks, created_at) 
        VALUES (?, ?, ?, ?, NOW())
      `;
      
      const historyParams = agent_id 
        ? [station_id, product_id, parseInt(quantity), remarks || 'Stock added', agent_id]
        : [station_id, product_id, parseInt(quantity), remarks || 'Stock added'];
        
      await executeQuery(historyQuery, historyParams);
    } catch (historyError) {
      console.log('stock_history table might not exist, skipping...');
    }
    
    // Also insert into filling_history for inward transaction
    try {
      const fillingHistoryQuery = `
        INSERT INTO filling_history 
        (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, agent_id, created_at) 
        VALUES (?, ?, ?, 'Inward', 
          (SELECT COALESCE(stock, 0) FROM filling_station_stocks WHERE fs_id = ? AND product = ?),
          (SELECT COALESCE(stock, 0) FROM filling_station_stocks WHERE fs_id = ? AND product = ?),
          NOW(), ?, ?, NOW())
      `;
      await executeQuery(fillingHistoryQuery, [
        station_id,
        product_id,
        parseInt(quantity),
        station_id,
        product_id,
        station_id,
        product_id,
        userId || null,
        agent_id || null
      ]);
    } catch (fillingError) {
      console.log('filling_history insert failed, skipping...', fillingError);
    }

    // Get stock ID and old value for audit log
    const stockId = existingRecord.length > 0 ? existingRecord[0].id : null;
    const oldStock = existingRecord.length > 0 ? existingRecord[0].stock : 0;
    const newStock = oldStock + parseInt(quantity);
    
    // Get station and product names for better logging
    let stationName = 'N/A';
    let productName = 'N/A';
    try {
      const stationResult = await executeQuery(
        `SELECT station_name FROM filling_stations WHERE id = ?`,
        [station_id]
      );
      if (stationResult.length > 0) {
        stationName = stationResult[0].station_name;
      }
      
      const productResult = await executeQuery(
        `SELECT pname FROM products WHERE id = ?`,
        [product_id]
      );
      if (productResult.length > 0) {
        productName = productResult[0].pname;
      }
    } catch (nameError) {
      console.error('Error fetching names:', nameError);
    }

    // Create comprehensive audit log entry
    const logUserName = agentName || userName;
    await createAuditLog({
      page: 'Stock Management',
      uniqueCode: stockId ? `STOCK-${stockId}` : `NEW-STOCK-${station_id}-${product_id}`,
      section: 'Add Stock',
      userId: agent_id ? null : userId,
      userName: logUserName,
      action: existingRecord.length > 0 ? 'update' : 'add',
      remarks: remarks || `Stock ${existingRecord.length > 0 ? 'updated' : 'added'} for ${stationName} - ${productName}${agent_id ? ' (by Agent)' : ''}`,
      oldValue: { stock: oldStock, station_id, product_id },
      newValue: { stock: newStock, station_id, product_id, quantity_added: parseInt(quantity), agent_id: agent_id || null },
      fieldName: 'stock',
      recordType: 'stock',
      recordId: stockId
    });

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