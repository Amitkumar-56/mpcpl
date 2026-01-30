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
    let userName = currentUser?.userName || null;
    
    // If no userName, try to fetch from database
    if (!userName && userId) {
      try {
        const users = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0 && users[0].name) {
          userName = users[0].name;
        }
      } catch (err) {
        console.error('Error fetching employee name:', err);
      }
    }
    
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

    // ✅ First, check if the stock record exists (no duplicate - check first)
    const checkQuery = `
      SELECT id, stock FROM filling_station_stocks 
      WHERE fs_id = ? AND product = ?
    `;
    
    const existingRecord = await executeQuery(checkQuery, [station_id, product_id]);

    const quantityValue = parseInt(quantity);
    const isMinus = operation_type === 'minus' || quantityValue < 0;
    const absQuantity = Math.abs(quantityValue);
    
    // ✅ Get current stock before update (for filling_history)
    const currentStock = existingRecord.length > 0 ? parseFloat(existingRecord[0].stock) || 0 : 0;
    const availableStock = isMinus ? Math.max(0, currentStock - absQuantity) : currentStock + absQuantity;
    
    if (existingRecord.length > 0) {
      // ✅ Update existing record (no duplicate - only UPDATE, not INSERT)
      const updateQuery = `
        UPDATE filling_station_stocks 
        SET stock = ?, msg = ?, remark = ?, created_at = NOW() 
        WHERE fs_id = ? AND product = ?
      `;
      await executeQuery(updateQuery, [
        availableStock, 
        isMinus ? `Stock shortage: -${absQuantity}` : `Stock added: +${absQuantity}`, 
        remarks || (isMinus ? 'Stock shortage deducted' : 'Stock added'),
        station_id, 
        product_id
      ]);
      console.log("✅ Filling station stocks updated:", {
        fs_id: station_id,
        product_id,
        oldStock: currentStock,
        change: isMinus ? -absQuantity : absQuantity,
        newStock: availableStock
      });
    } else {
      // ✅ Insert new record (only for plus, not for minus if no record exists)
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
        console.log("✅ Filling station stocks inserted:", {
          fs_id: station_id,
          product_id,
          stock: absQuantity
        });
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
    
    // Always insert into filling_history (insert only) - ONLY when called from all-stock page
    // Add (+): trans_type = 'extra'
    // Minus (-): trans_type = 'stored'
    try {
      // Check if stock_type column exists
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
      const colSet = new Set(colsInfo.map(r => r.Field));
      const hasStockType = colSet.has('stock_type');
      
      // Determine trans_type based on operation
      // Add (+): trans_type = 'extra'
      // Minus (-): trans_type = 'stored'
      // Determine trans_type and stock_type based on operation
      // Add (+): trans_type = 'extra', stock_type = 'extra'
      // Minus (-): trans_type = 'stored', stock_type = 'stored'
      const transType = isMinus ? 'stored' : 'extra';
      const stockType = isMinus ? 'stored' : 'extra';
      
      // filling_qty: positive for add, negative for minus
      const fillingQty = isMinus ? -absQuantity : absQuantity;
      
      if (hasStockType) {
        // Insert with trans_type only (remove stock_type)
        const fillingHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_at, updated_at) 
          VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
        `;
        // Ensure userId is valid before inserting
        let createdByUserId = (userId && userId > 0) ? userId : null;
        
        // Verify userId exists in employee_profile if provided
        if (createdByUserId) {
          try {
            const verifyUser = await executeQuery(
              `SELECT id, name FROM employee_profile WHERE id = ?`,
              [createdByUserId]
            );
            if (verifyUser.length === 0) {
              console.warn(`⚠️ User ID ${createdByUserId} not found in employee_profile, using null for created_by`);
              createdByUserId = null;
            } else {
              console.log(`✅ Verified user for stock history: ${verifyUser[0].name} (ID: ${createdByUserId})`);
            }
          } catch (verifyError) {
            console.error(' Error verifying user ID:', verifyError);
            // Continue with userId even if verification fails
          }
        }
        
        const insertResult = await executeQuery(fillingHistoryQuery, [
          station_id,
          product_id,
          transType, // 'Inward' for add (+), 'Outward' for minus (-)
          currentStock, // Current stock before change
          fillingQty, // Positive for add, negative for minus
          availableStock, // Available stock after change
          createdByUserId // Use verified userId or null
        ]);
        console.log(' Filling history entry created (with stock_type):', {
          fs_id: station_id,
          product_id,
          trans_type: transType,
          current_stock: currentStock,
          filling_qty: fillingQty,
          available_stock: availableStock,
          operation: isMinus ? 'Minus (-)' : 'Add (+)',
          created_by: createdByUserId,
          created_by_name: userName,
          insertId: insertResult?.insertId || 'N/A'
        });
      } else {
        // ✅ Insert without stock_type column (if column doesn't exist)
        const fillingHistoryQuery = `
          INSERT INTO filling_history 
          (fs_id, product_id, trans_type, current_stock, filling_qty, available_stock, filling_date, created_by, created_at) 
          VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW())
        `;
        // ✅ Ensure userId is valid before inserting
        let createdByUserId = (userId && userId > 0) ? userId : null;
        
        // ✅ Verify userId exists in employee_profile if provided
        if (createdByUserId) {
          try {
            const verifyUser = await executeQuery(
              `SELECT id, name FROM employee_profile WHERE id = ?`,
              [createdByUserId]
            );
            if (verifyUser.length === 0) {
              console.warn(`⚠️ User ID ${createdByUserId} not found in employee_profile, using null for created_by`);
              createdByUserId = null;
            } else {
              console.log(`✅ Verified user for stock history: ${verifyUser[0].name} (ID: ${createdByUserId})`);
            }
          } catch (verifyError) {
            console.error('⚠️ Error verifying user ID:', verifyError);
            // Continue with userId even if verification fails
          }
        }
        
        const insertResult = await executeQuery(fillingHistoryQuery, [
          station_id,
          product_id,
          transType, // ✅ 'Inward' for add (+), 'Outward' for minus (-)
          currentStock, // Current stock before change
          fillingQty, // Positive for add, negative for minus
          availableStock, // Available stock after change
          createdByUserId // ✅ Use verified userId or null
        ]);
        console.log('✅ Filling history entry created (without stock_type):', {
          fs_id: station_id,
          product_id,
          trans_type: transType,
          stock_type: 'N/A (column not exists)',
          current_stock: currentStock,
          filling_qty: fillingQty,
          available_stock: availableStock,
          operation: isMinus ? 'Minus (-)' : 'Add (+)',
          insertId: insertResult?.insertId || 'N/A'
        });
      }
    } catch (fillingError) {
      console.error('❌ filling_history insert failed:', fillingError);
      // Don't throw - continue even if history insert fails
    }

    // Get stock ID for audit log
    const stockId = existingRecord.length > 0 ? existingRecord[0].id : null;
    
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

    // ✅ Create comprehensive audit log entry
    try {
      const logUserName = agentName || userName || (userId ? `Employee ID: ${userId}` : null);
      const auditResult = await createAuditLog({
        page: 'Stock Management',
        uniqueCode: stockId ? `STOCK-${stockId}` : `NEW-STOCK-${station_id}-${product_id}`,
        section: 'Add Stock',
        userId: agent_id ? null : userId,
        userName: logUserName,
        action: isMinus ? 'deduct' : (existingRecord.length > 0 ? 'update' : 'add'),
        remarks: remarks || `Stock ${isMinus ? 'shortage deducted' : (existingRecord.length > 0 ? 'updated' : 'added')} for ${stationName} - ${productName}${agent_id ? ' (by Agent)' : ''}`,
        oldValue: { stock: currentStock, station_id, product_id },
        newValue: { stock: availableStock, station_id, product_id, quantity_change: isMinus ? -absQuantity : absQuantity, agent_id: agent_id || null },
        fieldName: 'stock',
        recordType: 'stock',
        recordId: stockId
      });
      console.log('✅ Audit log created for stock operation:', { 
        userId: agent_id ? null : userId, 
        userName: logUserName, 
        action: isMinus ? 'deduct' : 'add',
        auditResult 
      });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
      // Don't throw - continue even if audit log fails
    }

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