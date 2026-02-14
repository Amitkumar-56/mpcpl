import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET endpoint to fetch transporter invoices
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Transporter ID is required' },
        { status: 400 }
      );
    }

    // Get transporter name
    const transporterQuery = 'SELECT transporter_name FROM transporters WHERE id = ?';
    const transporterResult = await executeQuery(transporterQuery, [id]);
    
    const transporterName = transporterResult.length > 0 
      ? transporterResult[0].transporter_name 
      : 'Unknown Transporter';

    // Get stock data for the transporter
    const stockQuery = 'SELECT * FROM stock WHERE transporter_id = ? ORDER BY id DESC';
    const stockResult = await executeQuery(stockQuery, [id]);

    // Fetch additional details for each stock item
    const enrichedStock = await Promise.all(stockResult.map(async (item) => {
      // Get product name
      const productQuery = 'SELECT pname FROM products WHERE id = ?';
      const productResult = await executeQuery(productQuery, [item.product_id]);
      
      // Get station name
      const stationQuery = 'SELECT station_name FROM filling_stations WHERE id = ?';
      const stationResult = await executeQuery(stationQuery, [item.fs_id]);

      return {
        ...item,
        product_name: productResult.length > 0 ? productResult[0].pname : 'Product not found',
        station_name: stationResult.length > 0 ? stationResult[0].station_name : 'Station not found',
        transporter_name: transporterName
      };
    }));

    return NextResponse.json({
      transporterId: id,
      transporterName,
      invoices: enrichedStock
    });

  } catch (error) {
    console.error('Error fetching transporter invoices:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to update payment
export async function POST(request) {
  try {
    const body = await request.json();
    const { sid, amount, pay_date, remarks, v_invoice, transporterId } = body;

    console.log('Payment data received:', { sid, amount, pay_date, remarks, v_invoice, transporterId });

    if (!sid || !amount || !pay_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    try {
      // Check current stock values before update
      const checkQuery = 'SELECT t_payable, t_payment FROM stock WHERE id = ?';
      const currentStock = await executeQuery(checkQuery, [sid]);
      console.log('Current stock values:', currentStock[0]);

      if (currentStock.length === 0) {
        return NextResponse.json(
          { error: 'Stock record not found' },
          { status: 404 }
        );
      }

      // Update stock payment
      const updateStockQuery = `
        UPDATE stock 
        SET 
          t_payment = t_payment + ?, 
          t_paydate = ?, 
          t_payable = t_payable - ? 
        WHERE id = ?
      `;
      const updateResult = await executeQuery(updateStockQuery, [amount, pay_date, amount, sid]);
      console.log('Stock update result:', updateResult);

      // Verify the update
      const verifyQuery = 'SELECT t_payable, t_payment FROM stock WHERE id = ?';
      const updatedStock = await executeQuery(verifyQuery, [sid]);
      console.log('Updated stock values:', updatedStock[0]);

      // Insert into update_invoice
      const insertInvoiceQuery = `
        INSERT INTO update_invoice (supply_id, v_invoice, payment, date, remarks, type) 
        VALUES (?, ?, ?, ?, ?, 2)
      `;
      await executeQuery(insertInvoiceQuery, [sid, v_invoice, amount, pay_date, remarks]);

      return NextResponse.json({ 
        success: true, 
        message: 'Payment updated successfully',
        previousValues: currentStock[0],
        newValues: updatedStock[0],
        redirectUrl: `/transportersinvoice?id=${transporterId}`
      });

    } catch (error) {
      console.error('Database operation error:', error);
      console.error('Database error details:', error.message);
      return NextResponse.json(
        { error: error.message || 'Database operation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error updating payment:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}