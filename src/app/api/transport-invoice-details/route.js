import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Fetch stock details
    const stockQuery = 'SELECT * FROM stock WHERE id = ?';
    const stockResult = await executeQuery(stockQuery, [id]);

    if (stockResult.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    const stock = stockResult[0];

    // Fetch filling station name
    let stationName = '';
    if (stock.fs_id) {
      const stationQuery = 'SELECT station_name FROM filling_stations WHERE id = ?';
      const stationResult = await executeQuery(stationQuery, [stock.fs_id]);
      stationName = stationResult.length > 0 ? stationResult[0].station_name : '';
    }

    // Fetch product name
    let productName = '';
    if (stock.product_id) {
      const productQuery = 'SELECT pname FROM products WHERE id = ?';
      const productResult = await executeQuery(productQuery, [stock.product_id]);
      productName = productResult.length > 0 ? productResult[0].pname : '';
    }

    // Fetch transporter name
    let transporterName = '';
    if (stock.transporter_id) {
      const transporterQuery = 'SELECT transporter_name FROM transporters WHERE id = ?';
      const transporterResult = await executeQuery(transporterQuery, [stock.transporter_id]);
      transporterName = transporterResult.length > 0 ? transporterResult[0].transporter_name : '';
    }

    // Fetch supplier name
    let supplierName = '';
    if (stock.supplier_id) {
      const supplierQuery = 'SELECT name FROM suppliers WHERE id = ?';
      const supplierResult = await executeQuery(supplierQuery, [stock.supplier_id]);
      supplierName = supplierResult.length > 0 ? supplierResult[0].name : '';
    }

    // Combine all data
    const invoiceData = {
      ...stock,
      station_name: stationName,
      product_name: productName,
      transporter_name: transporterName,
      supplier_name: supplierName
    };

    return NextResponse.json(invoiceData);

  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, amount, pay_date, remarks, v_invoice } = body;

    if (!id || !amount || !pay_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    await executeQuery('START TRANSACTION');

    try {
      // Update stock payment
      const updateStockQuery = `
        UPDATE stock 
        SET 
          t_payment = t_payment + ?, 
          t_paydate = ?, 
          t_payable = t_payable - ? 
        WHERE id = ?
      `;
      await executeQuery(updateStockQuery, [amount, pay_date, amount, id]);

      // Insert into update_invoice
      const insertInvoiceQuery = `
        INSERT INTO update_invoice (supply_id, v_invoice, payment, date, remarks, type) 
        VALUES (?, ?, ?, ?, ?, 2)
      `;
      await executeQuery(insertInvoiceQuery, [id, v_invoice, amount, pay_date, remarks]);

      // Commit transaction
      await executeQuery('COMMIT');

      return NextResponse.json({ 
        success: true, 
        message: 'Payment updated successfully',
        redirectUrl: `/transport-invoice-details?id=${id}`
      });

    } catch (error) {
      // Rollback on error
      await executeQuery('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}