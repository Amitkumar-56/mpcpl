// src/app/api/stock/edit/route.js
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser, verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

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

    console.log('🔄 [Stock Edit API] PUT Request Received:', {
      id,
      updateData,
      bodyKeys: Object.keys(body)
    });

    if (!id) {
      console.log('❌ [Stock Edit API] No ID provided');
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

    // ✅ FIX: Get user info for audit log - MUST fetch from employee_profile using user ID
    let userId = null;
    let userName = null; // Start with null, not 'System'
    
    try {
      // First, try getCurrentUser() which properly fetches from employee_profile
      try {
        const currentUser = await getCurrentUser();
        if (currentUser && currentUser.userId) {
          userId = currentUser.userId; // This is employee_profile.id
          userName = currentUser.userName || null;
          console.log('✅ [Stock Edit] Got user from getCurrentUser:', { userId, userName });
        }
      } catch (getUserError) {
        // Silently continue to token fallback - don't log warning for normal auth flow
        // Only log if it's an unexpected error (not authentication related)
        if (!getUserError.message || (!getUserError.message.includes('Unauthorized') && !getUserError.message.includes('token'))) {
          console.warn('⚠️ [Stock Edit] getCurrentUser failed, trying token:', getUserError.message);
        }
      }
      
      // Fallback: try to get user ID from token if getCurrentUser didn't work
      if (!userId) {
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get('token')?.value;
          
          if (token) {
            try {
              const decoded = verifyToken(token);
              if (decoded) {
                userId = decoded.userId || decoded.id;
                console.log('✅ [Stock Edit] Got userId from token:', userId);
              }
            } catch (verifyError) {
              // Token invalid - don't log as it's a normal auth check
            }
          }
        } catch (cookieError) {
          // Cookie access error - don't log warning
        }
      }
      
      // ✅ CRITICAL: If we have userId, ALWAYS verify it exists in employee_profile table
      // userId must be employee_profile.id for filling_history.created_by
      if (userId) {
        try {
          console.log(`🔍 [Stock Edit] Verifying and fetching employee for userId (employee_profile.id): ${userId}`);
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          console.log(`🔍 [Stock Edit] Employee query result:`, users);
          
          if (users.length > 0) {
            // Verified: userId exists in employee_profile table (employee_profile.id)
            userName = users[0].name || null;
            console.log(`✅ [Stock Edit] Verified employee_profile.id: ${userId}, name: ${userName}`);
          } else {
            console.error(`❌ [Stock Edit] Employee not found in employee_profile table for ID: ${userId}`);
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
        // Fallback: Try getCurrentUser if token method failed (silently)
        try {
          const currentUser = await getCurrentUser();
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
          // Silent fallback - don't log warnings for normal auth failures
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
        // Silent - userName not found but userId exists
      } else {
        userName = 'Unknown User';
        // Don't log - normal for unauthenticated requests (expired session, etc.)
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
    if (statusChanged) {
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
        const effectiveQty = updateData.ltr !== undefined ? (parseFloat(updateData.ltr) || 0) : quantity;
        if (effectiveQty <= 0) {
          // Skip stock update if no quantity available
        } else {
        const newStock = currentStock + effectiveQty;
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
              effectiveQty,
              `Stock delivered - Invoice: ${oldStock.invoice_number || 'N/A'}`,
              `Status changed from ${oldStatus} to delivered`
            ]
          );
        }
        
        // Insert into filling_history with stock_type
        try {
          const oldStockValue = currentStock;
          const newStockValue = currentStock + effectiveQty;
          
          // ✅ Use current user (who is delivering/updating status to delivered) as created_by
          // This is the user who delivered the stock, NOT the original purchase creator
          let deliveredByUserId = userId; // Current user who is updating status to delivered
          
          // ✅ CRITICAL: Ensure we have a valid userId before inserting
          if (!deliveredByUserId) {
            // Try getCurrentUser fallback silently
            try {
              const currentUser = await getCurrentUser();
              if (currentUser && currentUser.userId) {
                deliveredByUserId = currentUser.userId;
              }
            } catch (fallbackError) {
              // Silent - fallback failed, will use NULL in database
            }
          }
          
          // ✅ Verify the userId exists in employee_profile table (silently)
          if (deliveredByUserId) {
            try {
              const verifyQuery = `SELECT id FROM employee_profile WHERE id = ?`;
              const verifyResult = await executeQuery(verifyQuery, [deliveredByUserId]);
              // Silent verification - if not found, will still use the ID
            } catch (verifyError) {
              // Silent - verification failed
            }
          }
          // If deliveredByUserId is null, will use NULL in database (normal for unauthenticated requests)
          
          // Check if stock_type column exists
          const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
          const colSet = new Set(colsInfo.map(r => r.Field));
          const hasStockType = colSet.has('stock_type');
          
          // ✅ Log before inserting to debug
          console.log('🔍 [Stock Edit] Inserting into filling_history with created_by:', {
            deliveredByUserId,
            stockId: id,
            quantity,
            fs_id: oldStock.fs_id,
            product_id: oldStock.product_id
          });
          
          if (hasStockType) {
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, stock_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Inward', 'inward', ?, ?, NOW(), ?, NOW())`,
              [
                oldStock.fs_id,
                oldStock.product_id,
                effectiveQty,
                oldStockValue, // Current stock before change
                newStockValue, // Available stock after change
                deliveredByUserId || null // Use current user who delivered (employee_profile.id)
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
                effectiveQty,
                oldStockValue, // Current stock before change
                newStockValue, // Available stock after change
                deliveredByUserId || null // Use current user who delivered (employee_profile.id)
              ]
            );
          }
          console.log('✅ Filling history entry created with delivery user ID:', { 
            oldStock: oldStockValue, 
            newStock: newStockValue, 
            quantity: effectiveQty,
            created_by: deliveredByUserId,
            delivered_by: deliveredByUserId,
            wasNull: !deliveredByUserId
          });
        } catch (historyError) {
          console.log('⚠️ filling_history insert failed:', historyError);
        }
        
        // ✅ Stock record will remain in stock table with status "delivered"
        // Staff and Incharge will not see delivered items (filtered in GET route)
        // Only filling_station_stocks and filling_history are updated
        console.log(`✅ Stock delivered: ${effectiveQty} Ltr (Status: ${oldStatus} -> delivered). Record remains in stock table.`);
        }
      } else if (oldStatus === 'delivered' && (newStatus === 'on_the_way' || newStatus === 'pending')) {
        // When moving from delivered to other status:
        // 1. Decrease stock from filling_station_stocks
        // 2. Create filling_history entry
        // 3. Re-insert record into stock table (since it was deleted when delivered)
        if (currentStockResult.length > 0 && quantity > 0 && currentStock >= quantity) {
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
          
          // ✅ Stock record remains in stock table (not deleted), will be updated with new status below
          console.log(`✅ Stock decreased: ${quantity} Ltr (Status: delivered -> ${newStatus})`);
          // Continue with normal update flow below - record already exists in stock table
        }
      }
    }

    // ✅ Handle quantity/station/product changes when status is delivered (no status change)
    try {
      if (!statusChanged && oldStatus === 'delivered') {
        const oldQty = parseFloat(oldStock.ltr) || 0;
        const newQty = updateData.ltr !== undefined ? (parseFloat(updateData.ltr) || 0) : oldQty;
        const fsOld = oldStock.fs_id;
        const prodOld = oldStock.product_id;
        const fsNew = updateData.fs_id !== undefined ? updateData.fs_id : fsOld;
        const prodNew = updateData.product_id !== undefined ? updateData.product_id : prodOld;
        
        // Current user will be the editor who performs the delta change
        let editorUserId = userId || null;
        if (!editorUserId) {
          try {
            const currentUser = await getCurrentUser();
            if (currentUser && currentUser.userId) {
              editorUserId = currentUser.userId;
            }
          } catch {}
        }
        
        // Verify stock_type column existence once
        let hasStockType = false;
        try {
          const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
          const colSet = new Set(colsInfo.map(r => r.Field));
          hasStockType = colSet.has('stock_type');
        } catch {}
        
        if (fsNew === fsOld && prodNew === prodOld) {
          // Same station/product: apply delta
          const delta = newQty - oldQty;
          if (delta !== 0) {
            // Fetch current stock
            const curRes = await executeQuery(
              `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?`,
              [fsOld, prodOld]
            );
            const currentStock = curRes.length > 0 ? (parseFloat(curRes[0].stock) || 0) : 0;
            const newStock = currentStock + delta;
            
            if (curRes.length > 0) {
              await executeQuery(
                `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`,
                [newStock, fsOld, prodOld]
              );
            } else {
              await executeQuery(
                `INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [
                  fsOld, prodOld, Math.max(0, newStock),
                  delta > 0 ? `Stock increased by edit (+${delta})` : `Stock decreased by edit (${delta})`,
                  `Edited quantity from ${oldQty} to ${newQty}`
                ]
              );
            }
            
            // Insert filling_history entry for delta
            if (hasStockType) {
              await executeQuery(
                `INSERT INTO filling_history 
                 (fs_id, product_id, filling_qty, trans_type, stock_type, current_stock, available_stock, filling_date, created_by, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
                [
                  fsOld, prodOld, delta,
                  delta > 0 ? 'Inward' : 'Outward',
                  delta > 0 ? 'inward' : 'stored',
                  currentStock, newStock, editorUserId
                ]
              );
            } else {
              await executeQuery(
                `INSERT INTO filling_history 
                 (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW())`,
                [
                  fsOld, prodOld, delta,
                  delta > 0 ? 'Inward' : 'Outward',
                  currentStock, newStock, editorUserId
                ]
              );
            }
            
            // Log specific audit for quantity delta
            await createAuditLog({
              page: 'Stock Management',
              uniqueCode: `STOCK-${id}`,
              section: 'Quantity Change (Delivered)',
              userId: userId,
              userName: userName,
              action: 'edit',
              remarks: `Quantity changed from ${oldQty}L to ${newQty}L; station ${fsOld}, product ${prodOld}; stock ${currentStock} → ${newStock}`,
              oldValue: { ltr: oldQty, fs_id: fsOld, product_id: prodOld },
              newValue: { ltr: newQty, fs_id: fsNew, product_id: prodNew },
              recordType: 'stock',
              recordId: parseInt(id)
            });
          }
        } else {
          // Station/Product changed: move stock from old to new
          const curOldRes = await executeQuery(
            `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?`,
            [fsOld, prodOld]
          );
          const curNewRes = await executeQuery(
            `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?`,
            [fsNew, prodNew]
          );
          const oldCurrent = curOldRes.length > 0 ? (parseFloat(curOldRes[0].stock) || 0) : 0;
          const newCurrent = curNewRes.length > 0 ? (parseFloat(curNewRes[0].stock) || 0) : 0;
          
          const afterOld = Math.max(0, oldCurrent - oldQty);
          const afterNew = newCurrent + newQty;
          
          // Update old
          if (curOldRes.length > 0) {
            await executeQuery(
              `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`,
              [afterOld, fsOld, prodOld]
            );
          }
          // Update/Insert new
          if (curNewRes.length > 0) {
            await executeQuery(
              `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`,
              [afterNew, fsNew, prodNew]
            );
          } else {
            await executeQuery(
              `INSERT INTO filling_station_stocks (fs_id, product, stock, msg, remark, created_at)
               VALUES (?, ?, ?, ?, ?, NOW())`,
              [
                fsNew, prodNew, afterNew,
                `Stock moved by edit (+${newQty})`,
                `Moved from station ${fsOld}/product ${prodOld}`,
              ]
            );
          }
          
          // filling_history entries: Outward from old, Inward to new
          if (hasStockType) {
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, stock_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Outward', 'stored', ?, ?, NOW(), ?, NOW())`,
              [fsOld, prodOld, -oldQty, oldCurrent, afterOld, editorUserId]
            );
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, stock_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Inward', 'inward', ?, ?, NOW(), ?, NOW())`,
              [fsNew, prodNew, newQty, newCurrent, afterNew, editorUserId]
            );
          } else {
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Outward', ?, ?, NOW(), ?, NOW())`,
              [fsOld, prodOld, -oldQty, oldCurrent, afterOld, editorUserId]
            );
            await executeQuery(
              `INSERT INTO filling_history 
               (fs_id, product_id, filling_qty, trans_type, current_stock, available_stock, filling_date, created_by, created_at) 
               VALUES (?, ?, ?, 'Inward', ?, ?, NOW(), ?, NOW())`,
              [fsNew, prodNew, newQty, newCurrent, afterNew, editorUserId]
            );
          }
          
          // Log audit for station/product change
          await createAuditLog({
            page: 'Stock Management',
            uniqueCode: `STOCK-${id}`,
            section: 'Station/Product Change (Delivered)',
            userId: userId,
            userName: userName,
            action: 'edit',
            remarks: `Moved delivered stock: old ${fsOld}/${prodOld} (${oldQty}L, ${oldCurrent}→${afterOld}), new ${fsNew}/${prodNew} (${newQty}L, ${newCurrent}→${afterNew})`,
            oldValue: { ltr: oldQty, fs_id: fsOld, product_id: prodOld },
            newValue: { ltr: newQty, fs_id: fsNew, product_id: prodNew },
            recordType: 'stock',
            recordId: parseInt(id)
          });
        }
      }
    } catch (deltaError) {
      console.warn('⚠️ Quantity/Station/Product delta handling failed:', deltaError);
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

    console.log('✅ [Stock Edit API] Update successful, sending response:', {
      success: true,
      message: 'Stock updated successfully',
      id: id,
      changes: Object.keys(changes).length
    });

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

// ✅ DELETE functionality removed - stock records cannot be deleted

