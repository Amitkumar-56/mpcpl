import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// GET endpoint to fetch T_DNCN records
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Supply ID is required' },
        { status: 400 }
      );
    }

    // Fetch stock details
    const stockQuery = 'SELECT * FROM stock WHERE id = ?';
    const stockResult = await executeQuery(stockQuery, [id]);
    
    const stockData = stockResult.length > 0 ? stockResult[0] : null;

    // Fetch T_DNCN records
    const dncnQuery = 'SELECT * FROM t_dncn WHERE sup_id = ? ORDER BY id DESC';
    const dncnRecords = await executeQuery(dncnQuery, [id]);

    // Get transporter ID from stock data
    const transporterId = stockData?.transporter_id || null;

    return NextResponse.json({
      supplyId: id,
      stockData,
      transporterId,
      records: dncnRecords
    });

  } catch (error) {
    console.error('Error fetching T_DNCN records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to create new T_DNCN record
export async function POST(request) {
  try {
    const body = await request.json();
    const { sup_id, type, amount, t_dncn_date, remarks, status } = body;

    if (!sup_id || !type || !amount || !t_dncn_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get current stock data to calculate new values
    const stockQuery = 'SELECT t_dncn, t_payable FROM stock WHERE id = ?';
    const stockResult = await executeQuery(stockQuery, [sup_id]);
    
    if (stockResult.length === 0) {
      return NextResponse.json(
        { error: 'Stock record not found' },
        { status: 404 }
      );
    }

    const currentStock = stockResult[0];
    let newTDncn = currentStock.t_dncn || 0;
    let newTPayable = currentStock.t_payable || 0;

    // Calculate new values based on type (1 = Debit, 2 = Credit)
    if (parseInt(type) === 1) {
      // Debit: Subtract from t_dncn, subtract from t_payable
      newTDncn -= parseFloat(amount);
      newTPayable -= parseFloat(amount);
    } else if (parseInt(type) === 2) {
      // Credit: Add to t_dncn, add to t_payable
      newTDncn += parseFloat(amount);
      newTPayable += parseFloat(amount);
    }

    // Start transaction
    // Insert into t_dncn
    const insertQuery = `
      INSERT INTO t_dncn (sup_id, type, amount, t_dncn_date, remarks, status) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const result = await executeQuery(insertQuery, [
      sup_id, 
      type, 
      amount, 
      t_dncn_date, 
      remarks || null,
      status || 0
    ]);

    // Update stock table with new t_dncn and t_payable values
    const updateStockQuery = `
      UPDATE stock 
      SET t_dncn = ?, t_payable = ?
      WHERE id = ?
    `;
    
    await executeQuery(updateStockQuery, [newTDncn, newTPayable, sup_id]);

    console.log(`✅ Stock updated for sup_id ${sup_id}: t_dncn=${currentStock.t_dncn}→${newTDncn}, t_payable=${currentStock.t_payable}→${newTPayable}`);

    return NextResponse.json({ 
      success: true, 
      message: 'T_DNCN record created successfully and stock updated',
      id: result.insertId,
      stockUpdate: {
        t_dncn: newTDncn,
        t_payable: newTPayable
      }
    });

  } catch (error) {
    console.error('Error creating T_DNCN record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT endpoint to update T_DNCN record
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, type, amount, t_dncn_date, remarks, status } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Get current T_DNCN record to calculate the difference
    const currentRecordQuery = 'SELECT * FROM t_dncn WHERE id = ?';
    const currentRecordResult = await executeQuery(currentRecordQuery, [id]);
    
    if (currentRecordResult.length === 0) {
      return NextResponse.json(
        { error: 'T_DNCN record not found' },
        { status: 404 }
      );
    }

    const currentRecord = currentRecordResult[0];
    const sup_id = currentRecord.sup_id;

    // Get current stock data
    const stockQuery = 'SELECT t_dncn, t_payable FROM stock WHERE id = ?';
    const stockResult = await executeQuery(stockQuery, [sup_id]);
    
    if (stockResult.length === 0) {
      return NextResponse.json(
        { error: 'Stock record not found' },
        { status: 404 }
      );
    }

    const currentStock = stockResult[0];
    let newTDncn = currentStock.t_dncn || 0;
    let newTPayable = currentStock.t_payable || 0;

    // Reverse the old transaction first
    if (parseInt(currentRecord.type) === 1) {
      // Old was Debit: Add back the amount
      newTDncn += parseFloat(currentRecord.amount);
      newTPayable += parseFloat(currentRecord.amount);
    } else if (parseInt(currentRecord.type) === 2) {
      // Old was Credit: Subtract the amount
      newTDncn -= parseFloat(currentRecord.amount);
      newTPayable -= parseFloat(currentRecord.amount);
    }

    // Apply the new transaction
    if (parseInt(type) === 1) {
      // New is Debit: Subtract from t_dncn, subtract from t_payable
      newTDncn -= parseFloat(amount);
      newTPayable -= parseFloat(amount);
    } else if (parseInt(type) === 2) {
      // New is Credit: Add to t_dncn, add to t_payable
      newTDncn += parseFloat(amount);
      newTPayable += parseFloat(amount);
    }

    // Update T_DNCN record
    const updateQuery = `
      UPDATE t_dncn 
      SET type = ?, amount = ?, t_dncn_date = ?, remarks = ?, status = ?
      WHERE id = ?
    `;
    
    await executeQuery(updateQuery, [
      type, 
      amount, 
      t_dncn_date, 
      remarks || null,
      status,
      id
    ]);

    // Update stock table with new t_dncn and t_payable values
    const updateStockQuery = `
      UPDATE stock 
      SET t_dncn = ?, t_payable = ?
      WHERE id = ?
    `;
    
    await executeQuery(updateStockQuery, [newTDncn, newTPayable, sup_id]);

    console.log(`✅ Stock updated for sup_id ${sup_id} (edit): t_dncn=${currentStock.t_dncn}→${newTDncn}, t_payable=${currentStock.t_payable}→${newTPayable}`);

    return NextResponse.json({ 
      success: true, 
      message: 'T_DNCN record updated successfully and stock updated',
      stockUpdate: {
        t_dncn: newTDncn,
        t_payable: newTPayable
      }
    });

  } catch (error) {
    console.error('Error updating T_DNCN record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}