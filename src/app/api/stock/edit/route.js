// src/app/api/stock/edit/route.js
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser, verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET - Fetch stock data for editing
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    const stockQuery = `
      SELECT 
        s.*,
        sup.name as supplier_name,
        p.pname as product_name,
        fs.station_name
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      WHERE s.id = ?
    `;
    const stockResult = await executeQuery(stockQuery, [id]);

    if (stockResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: stockResult[0]
    });

  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update stock
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    // ✅ FIX: Get user info for audit log - MUST fetch from employee_profile using user ID
    let userId = null;
    let userName = null; // Start with null, not 'System'
    
    try {
      // First, try to get user ID from token
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      
      console.log('🔍 [Stock Edit] Token exists:', !!token);
      
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          console.log('🔍 [Stock Edit] Decoded userId:', userId);
        } else {
          console.warn('⚠️ [Stock Edit] Token verification failed');
        }
      } else {
        console.warn('⚠️ [Stock Edit] No token found in cookies');
      }
      
      // ✅ CRITICAL: If we have userId, ALWAYS fetch name from employee_profile table
      if (userId) {
        try {
          console.log(`🔍 [Stock Edit] Fetching employee name for userId: ${userId}`);
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          console.log(`🔍 [Stock Edit] Employee query result:`, users);
          
          if (users.length > 0 && users[0].name) {
            userName = users[0].name;
            console.log(`✅ [Stock Edit] Fetched employee name: ${userName} (ID: ${userId})`);
          } else {
            console.error(`❌ [Stock Edit] Employee not found in database for ID: ${userId}`);
            // Try alternative: check if user_id column name is different
            const altUsers = await executeQuery(
              `SELECT * FROM employee_profile WHERE id = ? LIMIT 1`,
              [userId]
            );
            console.log(`🔍 [Stock Edit] Alternative query result:`, altUsers);
            if (altUsers.length > 0) {
              userName = altUsers[0].name || altUsers[0].employee_name || null;
              console.log(`✅ [Stock Edit] Got name from alternative query: ${userName}`);
            }
          }
        } catch (dbError) {
          console.error('❌ [Stock Edit] Error fetching employee name from database:', dbError);
          // Try fallback with getCurrentUser
          try {
            const currentUser = await getCurrentUser();
            console.log('🔍 [Stock Edit] getCurrentUser result:', currentUser);
            if (currentUser && currentUser.userName) {
              userName = currentUser.userName;
              console.log(`✅ [Stock Edit] Got employee name from getCurrentUser: ${userName}`);
            }
          } catch (userError) {
            console.error('❌ [Stock Edit] Error getting current user:', userError);
          }
        }
      } else {
        console.warn('⚠️ [Stock Edit] No userId found, trying getCurrentUser fallback');
        // Fallback: Try getCurrentUser if token method failed
        try {
          const currentUser = await getCurrentUser();
          console.log('🔍 [Stock Edit] getCurrentUser fallback result:', currentUser);
          if (currentUser && currentUser.userId) {
            userId = currentUser.userId;
            if (currentUser.userName) {
              userName = currentUser.userName;
            } else if (userId) {
              // Still try to fetch from database
              const users = await executeQuery(
                `SELECT name FROM employee_profile WHERE id = ?`,
                [userId]
              );
              if (users.length > 0 && users[0].name) {
                userName = users[0].name;
                console.log(`✅ [Stock Edit] Fetched name in fallback: ${userName}`);
              }
            }
          }
        } catch (userError) {
          console.error('❌ [Stock Edit] Error in getCurrentUser fallback:', userError);
        }
      }
      
      // ✅ FINAL CHECK: If still no userName but we have userId, try one more time
      if (!userName && userId) {
        console.log(`🔍 [Stock Edit] Final attempt to fetch name for userId: ${userId}`);
        try {
          const finalUsers = await executeQuery(
            `SELECT name, employee_name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (finalUsers.length > 0) {
            userName = finalUsers[0].name || finalUsers[0].employee_name || null;
            console.log(`✅ [Stock Edit] Final fetch result: ${userName}`);
          }
        } catch (finalError) {
          console.error('❌ [Stock Edit] Final fetch error:', finalError);
        }
      }
      
    } catch (error) {
      console.error('❌ [Stock Edit] Error in user authentication:', error);
    }
    
    // ✅ If still no userName, use a descriptive message instead of 'System'
    if (!userName) {
      if (userId) {
        userName = `Employee ID: ${userId}`;
        console.warn(`⚠️ [Stock Edit] Could not fetch name, using: ${userName}`);
      } else {
        userName = 'Unknown User';
        console.error(`❌ [Stock Edit] No userId and no userName, using: ${userName}`);
      }
    }
    
    console.log(`✅ [Stock Edit] Final user info for audit log: userId=${userId}, userName=${userName}`);

    // Get old stock data
    const oldStockQuery = `SELECT * FROM stock WHERE id = ?`;
    const oldStockResult = await executeQuery(oldStockQuery, [id]);

    if (oldStockResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock record not found' },
        { status: 404 }
      );
    }

    const oldStock = oldStockResult[0];

    // ✅ NEW: Handle status changes for stock management
    // Normalize status values (handle both string and numeric)
    const normalizeStatus = (status) => {
      if (!status) return 'pending';
      const s = status.toString().toLowerCase().trim();
      if (s === '3' || s === 'delivered') return 'delivered';
      if (s === '2' || s === 'on_the_way' || s === 'on the way' || s === 'on_the_way') return 'on_the_way';
      if (s === '1' || s === 'pending') return 'pending';
      return s;
    };
    
    const oldStatus = normalizeStatus(oldStock.status);
    // Use updateData.status if provided, otherwise keep old status
    const newStatus = updateData.status !== undefined ? normalizeStatus(updateData.status) : oldStatus;
    
    // Check if status is changing
    const statusChanged = oldStatus !== newStatus;
    const quantity = parseFloat(oldStock.ltr) || 0;
    
    // ✅ NEW: Handle stock updates based on status changes
    if (statusChanged && quantity > 0) {
      // Get current stock in filling_station_stocks
      const currentStockQuery = `
        SELECT stock FROM filling_station_stocks 
        WHERE fs_id = ? AND product = ?
      `;
      const currentStockResult = await executeQuery(currentStockQuery, [
        oldStock.fs_id, 
        oldStock.product_id
      ]);
      
      let currentStock = 0;
      if (currentStockResult.length > 0) {
        currentStock = parseFloat(currentStockResult[0].stock) || 0;
      }
      
      // Status transition logic:
      // pending -> on_the_way: No stock change (stock not added yet)
      // pending -> delivered: Add stock
      // on_the_way -> delivered: Add stock
      // delivered -> on_the_way: Decrease stock
      // delivered -> pending: Decrease stock
      // on_the_way -> pending: No stock change
      
      if (newStatus === 'delivered' || newStatus === '3') {
        // Add stock when delivered
        const newStock = currentStock + quantity;
        if (currentStockResult.length > 0) {
          await executeQuery(
            `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`,
            [newStock, oldStock.fs_id, oldStock.product_id]
          );
        } else {
          await executeQuery(
            `INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at) 
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              oldStock.fs_id,
              oldStock.product_id,
              quantity,
              `Stock delivered - Invoice: ${oldStock.invoice_number || 'N/A'}`,
              `Status changed from ${oldStatus} to delivered`
            ]
          );
        }
        
        // Insert into filling_history with stock_type
        try {
          const oldStockValue = currentStock; // Stock before addition
          const newStockValue = currentStock + quantity; // Stock after addition
          
          // Check if stock_type column exists
          const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
          const colSet = new Set(colsInfo.map(r => r.Field));
          const hasStockType = colSet.has('stock_type');
          
          if (hasStockType) {
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, stock_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Inward', 'inward', ?, ?, NOW(), ?, NOW())`,
              [
                oldStock.fs_id,
                oldStock.product_id,
                quantity, // Positive quantity for Inward
                oldStockValue, // Current stock before change
                newStockValue, // Available stock after change
                userId || null
              ]
            );
          } else {
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Inward', ?, ?, NOW(), ?, NOW())`,
              [
                oldStock.fs_id,
                oldStock.product_id,
                quantity, // Positive quantity for Inward
                oldStockValue, // Current stock before change
                newStockValue, // Available stock after change
                userId || null
              ]
            );
          }
          console.log('✅ Filling history entry created:', { oldStock: oldStockValue, newStock: newStockValue, quantity });
        } catch (historyError) {
          console.log('⚠️ filling_history insert failed:', historyError);
        }
        
        console.log(`✅ Stock added: ${quantity} Ltr (Status: ${oldStatus} -> delivered)`);
      } else if (oldStatus === 'delivered' && (newStatus === 'on_the_way' || newStatus === 'pending')) {
        // Decrease stock when moving from delivered to other status
        if (currentStockResult.length > 0 && currentStock >= quantity) {
          const newStock = currentStock - quantity;
          await executeQuery(
            `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`,
            [newStock, oldStock.fs_id, oldStock.product_id]
          );
          
          // Insert into filling_history
          try {
            const oldStockValue = currentStock; // Stock before deduction
            const newStockValue = newStock; // Stock after deduction
            
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Outward', ?, ?, NOW(), ?, NOW())`,
              [
                oldStock.fs_id,
                oldStock.product_id,
                -quantity, // Negative quantity for Outward
                oldStockValue, // Current stock before change
                newStockValue, // Available stock after change
                userId || null
              ]
            );
            console.log('✅ Filling history entry created (Outward):', { oldStock: oldStockValue, newStock: newStockValue, quantity: -quantity });
          } catch (historyError) {
            console.log('⚠️ filling_history insert failed:', historyError);
          }
          
          console.log(`✅ Stock decreased: ${quantity} Ltr (Status: delivered -> ${newStatus})`);
        }
      }
    }

    // Build update query dynamically - include all fields even if empty
    const updateFields = [];
    const updateValues = [];
    const changes = {};

    // List of all updatable fields
    const allowedFields = [
      'supplier_id', 'product_id', 'fs_id', 'invoice_number', 'invoice_date',
      'eway_bill_number', 'eway_bill_expiry_date', 'density', 'kg', 'ltr',
      'tanker_no', 'driver_no', 'lr_no', 'v_invoice_value', 'dncn', 't_dncn',
      'payable', 't_payable', 'payment', 't_payment', 'status', 'weight_type',
      'quantity_change_reason', 'quantity_changed'
    ];

    allowedFields.forEach(key => {
      if (updateData.hasOwnProperty(key)) {
        // Include field even if value is empty string or null
        updateFields.push(`${key} = ?`);
        // Convert empty strings to null for database, normalize status
        let value = updateData[key] === '' ? null : updateData[key];
        
        // Normalize status value if it's the status field
        if (key === 'status' && value) {
          value = normalizeStatus(value);
        }
        
        updateValues.push(value);
        
        // Track changes for audit log
        const oldValue = oldStock[key] !== undefined ? oldStock[key] : null;
        const newValue = value;
        if (String(oldValue) !== String(newValue)) {
          changes[key] = {
            old: oldValue,
            new: newValue
          };
        }
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(id);

    // Update stock - ensure update happens
    const updateQuery = `UPDATE stock SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log('Executing update query:', updateQuery);
    console.log('Update values:', updateValues);
    const updateResult = await executeQuery(updateQuery, updateValues);
    console.log('Update result:', updateResult);
    
    // Verify update was successful
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'No rows were updated. Stock record may not exist or no changes were made.' },
        { status: 400 }
      );
    }

    // Get station and product names
    let stationName = 'N/A';
    let productName = 'N/A';
    try {
      const stationResult = await executeQuery(
        `SELECT station_name FROM filling_stations WHERE id = ?`,
        [oldStock.fs_id]
      );
      if (stationResult.length > 0) {
        stationName = stationResult[0].station_name;
      }
      
      const productResult = await executeQuery(
        `SELECT pname FROM products WHERE id = ?`,
        [oldStock.product_id]
      );
      if (productResult.length > 0) {
        productName = productResult[0].pname;
      }
    } catch (nameError) {
      console.error('Error fetching names:', nameError);
    }

    // ✅ Create specific audit log for status changes
    if (statusChanged) {
      const statusDisplayMap = {
        'pending': 'Pending',
        'on_the_way': 'On The Way',
        'delivered': 'Delivered'
      };
      
      const oldStatusDisplay = statusDisplayMap[oldStatus] || oldStatus;
      const newStatusDisplay = statusDisplayMap[newStatus] || newStatus;
      
      await createAuditLog({
        page: 'Stock Management',
        uniqueCode: `STOCK-${id}`,
        section: 'Status Change',
        userId: userId,
        userName: userName,
        action: 'status_change',
        remarks: `Status changed from "${oldStatusDisplay}" to "${newStatusDisplay}" for ${stationName} - ${productName} (Invoice: ${oldStock.invoice_number || 'N/A'}, Quantity: ${oldStock.ltr || 0} Ltr)`,
        oldValue: { status: oldStatus, ...oldStock },
        newValue: { status: newStatus, ...oldStock, ...updateData },
        fieldName: 'status',
        recordType: 'stock',
        recordId: parseInt(id)
      });
      
      console.log(`✅ Status change logged: ${oldStatusDisplay} → ${newStatusDisplay} by ${userName} (ID: ${userId})`);
    }

    // Create general audit log for other field changes
    const hasOtherChanges = Object.keys(changes).some(key => key !== 'status');
    if (hasOtherChanges) {
      await createAuditLog({
        page: 'Stock Management',
        uniqueCode: `STOCK-${id}`,
        section: 'Edit Stock',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Stock record updated for ${stationName} - ${productName}`,
        oldValue: oldStock,
        newValue: { ...oldStock, ...updateData },
        recordType: 'stock',
        recordId: parseInt(id)
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Stock updated successfully'
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete stock
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    // Get user info for audit log
    let userId = null;
    let userName = 'System';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Get stock data before deletion
    const stockQuery = `
      SELECT s.*, sup.name as supplier_name, p.pname as product_name, fs.station_name
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      WHERE s.id = ?
    `;
    const stockResult = await executeQuery(stockQuery, [id]);

    if (stockResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock record not found' },
        { status: 404 }
      );
    }

    const stockData = stockResult[0];

    // Delete stock
    await executeQuery('DELETE FROM stock WHERE id = ?', [id]);

    // Create audit log
    await createAuditLog({
      page: 'Stock Management',
      uniqueCode: `STOCK-${id}`,
      section: 'Delete Stock',
      userId: userId,
      userName: userName,
      action: 'delete',
      remarks: `Stock record deleted: ${stockData.station_name} - ${stockData.product_name} (Invoice: ${stockData.invoice_number})`,
      oldValue: stockData,
      newValue: null,
      recordType: 'stock',
      recordId: parseInt(id)
    });

    return NextResponse.json({
      success: true,
      message: 'Stock deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting stock:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

