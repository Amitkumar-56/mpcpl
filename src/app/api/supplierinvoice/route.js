// src/app/api/supplierinvoice/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET handler for fetching supplier invoices
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Build the query
    let query = `
      SELECT s.*, 
             p.pname as product_name,
             f.station_name as station_name
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations f ON s.fs_id = f.id
      WHERE s.supplier_id = ?
    `;

    const params = [id];

    if (fromDate) {
      query += ` AND s.invoice_date >= ?`;
      params.push(fromDate);
    }

    if (toDate) {
      query += ` AND s.invoice_date <= ?`;
      params.push(toDate);
    }

    query += ` ORDER BY s.id DESC`;

    // Fetch supplier details
    const supplierQuery = `SELECT name FROM suppliers WHERE id = ?`;
    const [supplierRows] = await executeQuery(supplierQuery, [id]);
    const supplierName = supplierRows.length > 0 ? supplierRows[0].name : 'Unknown Supplier';

    // Fetch invoice data
    const [rows] = await executeQuery(query, params);

    return NextResponse.json({
      supplierName,
      invoices: rows,
      total: rows.length
    });

  } catch (error) {
    console.error('Error fetching supplier invoices:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST handler for making payments
export async function POST(request) {
  try {
    const formData = await request.json();
    const { id, amount, pay_date, remarks, v_invoice } = formData;

    // Validate inputs
    if (!id || !amount || !pay_date) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Start transaction
    await executeQuery('START TRANSACTION');

    // Update stock payment
    const updateStockQuery = `
      UPDATE stock 
      SET payment = payment + ?, 
          pay_date = ?, 
          payable = payable - ? 
      WHERE id = ?
    `;
    await executeQuery(updateStockQuery, [amount, pay_date, amount, id]);

    // Insert into update_invoice
    const insertInvoiceQuery = `
      INSERT INTO update_invoice (supply_id, v_invoice, payment, date, remarks, type) 
      VALUES (?, ?, ?, ?, ?, 1)
    `;
    await executeQuery(insertInvoiceQuery, [id, v_invoice, amount, pay_date, remarks]);

    // Commit transaction
    await executeQuery('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      redirectUrl: `/supplierinvoice?id=${id}`
    });

  } catch (error) {
    await executeQuery('ROLLBACK');
    console.error('Error processing payment:', error);
    return NextResponse.json({ error: 'Failed to process payment' }, { status: 500 });
  }
}