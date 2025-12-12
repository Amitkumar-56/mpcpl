// app/api/supplierinvoice-history/route.js
import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    // Get supplier name
    const supplierQuery = 'SELECT name FROM supplier WHERE id = ?';
    const supplierResult = await executeQuery(supplierQuery, [id]);
    
    if (supplierResult.length === 0) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const supplierName = supplierResult[0].name;

    // Build stock query
    let stockQuery = 'SELECT * FROM stock WHERE supplier_id = ?';
    const params = [id];

    if (from_date) {
      stockQuery += ' AND invoice_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      stockQuery += ' AND invoice_date <= ?';
      params.push(to_date);
    }

    stockQuery += ' ORDER BY id DESC';

    const stockRows = await executeQuery(stockQuery, params);
    
    // Fetch additional data for each stock entry
    const enrichedData = await Promise.all(
      stockRows.map(async (row) => {
        // Payment records
        let paymentQuery = 'SELECT * FROM update_invoice WHERE type = 1 AND supply_id = ?';
        const paymentParams = [row.id];
        
        if (from_date) {
          paymentQuery += ' AND date >= ?';
          paymentParams.push(from_date);
        }
        
        if (to_date) {
          paymentQuery += ' AND date <= ?';
          paymentParams.push(to_date);
        }
        
        paymentQuery += ' ORDER BY id DESC';
        const payments = await executeQuery(paymentQuery, paymentParams);

        // DNCN records
        let dncnQuery = 'SELECT * FROM dncn WHERE sup_id = ?';
        const dncnParams = [row.id];
        
        if (from_date) {
          dncnQuery += ' AND dncn_date >= ?';
          dncnParams.push(from_date);
        }
        
        if (to_date) {
          dncnQuery += ' AND dncn_date <= ?';
          dncnParams.push(to_date);
        }
        
        const dncns = await executeQuery(dncnQuery, dncnParams);

        return {
          ...row,
          payments,
          dncns
        };
      })
    );

    return NextResponse.json({
      supplierName,
      data: enrichedData
    });

  } catch (error) {
    console.error('Error fetching supplier invoice history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}