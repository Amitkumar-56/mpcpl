import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request) {
  try {
    const { station_id, product_id, quantity, remarks, agent_id, operation_type } = await request.json();
    
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

    const quantityValue = parseInt(quantity);
    const isMinus = operation_type === 'minus' || quantityValue < 0;
    const absQuantity = Math.abs(quantityValue);
    
    if (existingRecord.length > 0) {
      const currentStock = parseFloat(existingRecord[0].stock) || 0;
      const newStock = isMinus ? Math.max(0, currentStock - absQuantity) : currentStock + absQuantity;
      
      // Update existing record
      const updateQuery = `
        UPDATE filling_station_stocks 
        SET stock = ?, msg = ?, remark = ?, created_at = NOW() 
        WHERE fs_id = ? AND product = ?
      `;
      await executeQuery(updateQuery, [
        newStock, 
        isMinus ? `Stock shortage: -${absQuantity}` : `Stock added: +${absQuantity}`, 
        remarks || (isMinus ? 'Stock shortage deducted' : 'Stock added'),
        station_id, 
        product_id
      ]);
    } else {
      // Insert new record (only for plus, not for minus if no record exists)
      if (!isMinus) {
        const insertQuery = `
          INSERT INTO filling_station_stocks 
          (fs_id, product, stock, msg, remark, created_at) 
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
        await executeQuery(insertQuery, [
          station_id, 
          product_id, 
          absQuantity,
          `Stock added: +${absQuantity}`,
          remarks || 'Stock added'
        ]);
      } else {
        return NextResponse.json(
          { success: false, error: 'Cannot deduct stock: No stock record exists for this station/product' },
          { status: 400 }
        );
      }
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
    
    // Also insert into filling_history for inward transaction (both plus and minus)
    try {
      // Get current stock after update
      const currentStockResult = await executeQuery(
        `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?`,
        [station_id, product_id]
      );
      const currentStock = currentStockResult.length > 0 ? parseFloat(currentStockResult[0].stock) || 0 : 0;
      
      const fillingHistoryQuery = `
        INSERT INTO filling_history 
        (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, agent_id, created_at) 
        VALUES (?, ?, ?, 'Inward', 
          ?, ?, NOW(), ?, ?, NOW())
      `;
      await executeQuery(fillingHistoryQuery, [
        station_id,
        product_id,
        isMinus ? -absQuantity : absQuantity, // Negative for minus
        station_id,
        product_id,
        currentStock,
        currentStock,
        userId || null,
        agent_id || null
      ]);
    } catch (fillingError) {
      console.log('filling_history insert failed, skipping...', fillingError);
    }

    // Get stock ID and old value for audit log
    const stockId = existingRecord.length > 0 ? existingRecord[0].id : null;
    const oldStock = existingRecord.length > 0 ? parseFloat(existingRecord[0].stock) || 0 : 0;
    const newStock = isMinus ? Math.max(0, oldStock - absQuantity) : oldStock + absQuantity;
    
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
      action: isMinus ? 'deduct' : (existingRecord.length > 0 ? 'update' : 'add'),
      remarks: remarks || `Stock ${isMinus ? 'shortage deducted' : (existingRecord.length > 0 ? 'updated' : 'added')} for ${stationName} - ${productName}${agent_id ? ' (by Agent)' : ''}`,
      oldValue: { stock: oldStock, station_id, product_id },
      newValue: { stock: newStock, station_id, product_id, quantity_change: isMinus ? -absQuantity : absQuantity, agent_id: agent_id || null },
      fieldName: 'stock',
      recordType: 'stock',
      recordId: stockId
    });

    return NextResponse.json({
      success: true,
      message: isMinus ? `Stock shortage deducted successfully (${absQuantity} units)` : `Stock added successfully (${absQuantity} units)`
    });

  } catch (error) {
    console.error('Error adding stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add stock: ' + error.message },
      { status: 500 }
    );
  }
}