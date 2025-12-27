// src/app/api/stock/dncn/add/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const body = await request.json();
    const { stock_id, type, supplier_id, transporter_id, dncn_type, amount, remarks, current_dncn, new_dncn } = body;

    if (!stock_id || !dncn_type || !amount) {
      return NextResponse.json(
        { success: false, error: 'Stock ID, DNCN type, and amount are required' },
        { status: 400 }
      );
    }

    // Get user info for audit log
    let userId = null;
    let userName = null;
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

    // Check if stock exists
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
    const stockResult = await executeQuery(stockQuery, [stock_id]);

    if (stockResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Stock record not found' },
        { status: 404 }
      );
    }

    const stock = stockResult[0];
    const currentDncnValue = parseFloat(stock.dncn || 0);
    const amountValue = parseFloat(amount);
    const newDncnValue = dncn_type === 'Debit' 
      ? currentDncnValue + amountValue 
      : currentDncnValue - amountValue;

    // Update stock DNCN
    await executeQuery(
      `UPDATE stock SET dncn = ?, t_dncn = ? WHERE id = ?`,
      [newDncnValue, newDncnValue, stock_id]
    );

    // Get station and product names for audit log
    const stationName = stock.station_name || 'N/A';
    const productName = stock.product_name || 'N/A';

    // Get supplier/transporter name for audit log
    let partyName = 'N/A';
    if (type === 'Supplier' && supplier_id) {
      const supplierResult = await executeQuery(
        `SELECT name FROM suppliers WHERE id = ?`,
        [supplier_id]
      );
      if (supplierResult.length > 0) {
        partyName = supplierResult[0].name;
      }
    } else if (type === 'Transporter' && transporter_id) {
      const transporterResult = await executeQuery(
        `SELECT transporter_name FROM transporters WHERE id = ?`,
        [transporter_id]
      );
      if (transporterResult.length > 0) {
        partyName = transporterResult[0].transporter_name;
      }
    }

    // Create audit log
    await createAuditLog({
      page: 'Stock Management',
      uniqueCode: `STOCK-${stock_id}`,
      section: 'DNCN Management',
      userId: userId,
      userName: userName,
      action: dncn_type.toLowerCase(),
      remarks: `${dncn_type} Note added for ${type}: ${partyName} - ₹${amountValue.toLocaleString('en-IN')}${remarks ? ` - ${remarks}` : ''}`,
      oldValue: { dncn: currentDncnValue, stock_id: parseInt(stock_id) },
      newValue: { 
        dncn: newDncnValue, 
        stock_id: parseInt(stock_id), 
        amount: amountValue, 
        type: dncn_type,
        party_type: type,
        party_id: type === 'Supplier' ? supplier_id : transporter_id,
        party_name: partyName
      },
      fieldName: 'dncn',
      recordType: 'stock',
      recordId: parseInt(stock_id)
    });

    return NextResponse.json({
      success: true,
      message: `${dncn_type} Note added successfully`,
      data: {
        stock_id: parseInt(stock_id),
        current_dncn: currentDncnValue,
        new_dncn: newDncnValue,
        amount: amountValue,
        type: dncn_type
      }
    });

  } catch (error) {
    console.error('Error adding DNCN:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

