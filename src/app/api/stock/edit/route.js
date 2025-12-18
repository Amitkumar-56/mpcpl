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
    const userName = currentUser?.userName || 'System';

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

