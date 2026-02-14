import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

// GET endpoint to fetch single T_DNCN record
export async function GET(request, { params }) {
  try {
    const { id } = params;

    const query = 'SELECT * FROM t_dncn WHERE id = ?';
    const result = await executeQuery(query, [id]);

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result[0]);

  } catch (error) {
    console.error('Error fetching T_DNCN record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete T_DNCN record
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    // Get the T_DNCN record before deleting to reverse its effect on stock
    const recordQuery = 'SELECT * FROM t_dncn WHERE id = ?';
    const recordResult = await executeQuery(recordQuery, [id]);
    
    if (recordResult.length === 0) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    const record = recordResult[0];
    const sup_id = record.sup_id;

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

    // Reverse the transaction effect on stock
    if (parseInt(record.type) === 1) {
      // Was Debit: Add back the amount to both t_dncn and t_payable
      newTDncn += parseFloat(record.amount);
      newTPayable += parseFloat(record.amount);
    } else if (parseInt(record.type) === 2) {
      // Was Credit: Subtract the amount from both t_dncn and t_payable
      newTDncn -= parseFloat(record.amount);
      newTPayable -= parseFloat(record.amount);
    }

    // Delete the T_DNCN record
    const deleteQuery = 'DELETE FROM t_dncn WHERE id = ?';
    await executeQuery(deleteQuery, [id]);

    // Update stock table to reverse the effect
    const updateStockQuery = `
      UPDATE stock 
      SET t_dncn = ?, t_payable = ?
      WHERE id = ?
    `;
    
    await executeQuery(updateStockQuery, [newTDncn, newTPayable, sup_id]);

    console.log(`✅ Stock updated for sup_id ${sup_id} (delete): t_dncn=${currentStock.t_dncn}→${newTDncn}, t_payable=${currentStock.t_payable}→${newTPayable}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Record deleted successfully and stock updated',
      stockUpdate: {
        t_dncn: newTDncn,
        t_payable: newTPayable
      }
    });

  } catch (error) {
    console.error('Error deleting T_DNCN record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}