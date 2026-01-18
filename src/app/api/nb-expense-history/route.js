// app/api/nb-expense-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = searchParams.get('station_id');
    
    console.log('Station ID received:', stationId);

    if (!stationId) {
      return NextResponse.json(
        { error: 'Station ID is required', success: false },
        { status: 400 }
      );
    }

    // Fetch initial stock from non_billing_stocks table
    const initialStockQuery = `
      SELECT product_id, stock 
      FROM non_billing_stocks 
      WHERE station_id = ?
    `;
    
    console.log('Executing initial stock query...');
    const initialStockRows = await executeQuery(initialStockQuery, [stationId]);
    console.log('Initial stock rows:', initialStockRows);

    const initialStock = {};
    initialStockRows.forEach(row => {
      initialStock[row.product_id] = row.stock;
    });

    console.log('Initial stock object:', initialStock);

    // Fetch expense data with created_by information
    const expenseQuery = `
      SELECT 
        n.*, 
        f.station_name, 
        p.pname AS product_name,
        ep.name as created_by_name,
        ep.id as created_by_id
      FROM nb_expense n
      JOIN filling_stations f ON n.station_id = f.id
      JOIN products p ON n.product_id = p.id
      LEFT JOIN employee_profile ep ON n.created_by = ep.id
      WHERE n.station_id = ?
      ORDER BY n.id ASC
    `;
    
    console.log('Executing expense query...');
    const expenseRows = await executeQuery(expenseQuery, [stationId]);
    console.log('Expense rows found:', expenseRows.length);

    // Calculate stock values
    const stockTracker = { ...initialStock };
    const resultWithStock = expenseRows.map(row => {
      const productId = row.product_id;
      const currentStock = stockTracker[productId] || 0;
      const remainingStock = currentStock - parseFloat(row.amount);
      
      // Store result
      const result = {
        id: row.id,
        payment_date: row.payment_date,
        title: row.title,
        reason: row.reason,
        paid_to: row.paid_to,
        amount: parseFloat(row.amount),
        station_name: row.station_name,
        product_name: row.product_name,
        product_id: productId,
        total_stock: currentStock,
        remaining_stock: remainingStock,
        created_by: row.created_by || null,
        created_by_id: row.created_by_id || null,
        created_by_name: row.created_by_name || 'Unknown'
      };
      
      // Update tracker for next iteration
      stockTracker[productId] = remainingStock;
      
      return result;
    });

    console.log('Final result count:', resultWithStock.length);

    return NextResponse.json({
      success: true,
      data: resultWithStock,
      stationId: parseInt(stationId),
      summary: {
        totalExpenses: resultWithStock.reduce((sum, row) => sum + row.amount, 0),
        totalRecords: resultWithStock.length,
        uniqueProducts: [...new Set(resultWithStock.map(row => row.product_name))].length,
        uniqueUsers: [...new Set(resultWithStock.filter(row => row.created_by_name).map(row => row.created_by_name))].length
      }
    });

  } catch (error) {
    console.error('Error in NB expense history API:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch NB expense history',
        details: error.message,
        success: false 
      },
      { status: 500 }
    );
  }
}