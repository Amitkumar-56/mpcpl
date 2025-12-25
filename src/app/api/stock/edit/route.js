// src/app/api/stock/edit/route.js
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Stock ID is required' },
        { status: 400 }
      );
    }

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
    const oldStatus = oldStock.status?.toString().toLowerCase() || 'pending';
    const newStatus = updateData.status?.toString().toLowerCase() || oldStatus;
    
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
        
        // Insert into filling_history
        try {
          const oldStockValue = currentStock; // Stock before addition
          const newStockValue = currentStock + quantity; // Stock after addition
          
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
          console.log('✅ Filling history entry created:', { oldStock: oldStockValue, newStock: newStockValue, quantity });
        } catch (historyError) {
          console.log('⚠️ filling_history insert failed:', historyError);
        }
        
        console.log(`✅ Stock added: ${quantity} Ltr (Status: ${oldStatus} -> delivered)`);
      } else if ((oldStatus === 'delivered' || oldStatus === '3') && (newStatus === 'on_the_way' || newStatus === '1' || newStatus === 'pending' || newStatus === '2')) {
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

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    const changes = {};

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
        
        // Track changes for audit log
        if (oldStock[key] !== updateData[key]) {
          changes[key] = {
            old: oldStock[key],
            new: updateData[key]
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

    // Update stock
    const updateQuery = `UPDATE stock SET ${updateFields.join(', ')} WHERE id = ?`;
    await executeQuery(updateQuery, updateValues);

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

    // Create audit log
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

