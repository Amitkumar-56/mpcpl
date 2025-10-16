import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// 🟢 Create Purchase
export async function POST(request) {
  try {
    const data = await request.json();

    // ✅ Input Validation
    if (!data.supplier_id || !data.invoiceNumber || !data.product_id) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: supplier_id, invoiceNumber, product_id' },
        { status: 400 }
      );
    }

    // Helper functions to get names from IDs
    const getSupplierName = async (supplierId) => {
      try {
        const result = await executeQuery('SELECT name FROM suppliers WHERE id = ?', [supplierId]);
        return result[0]?.name || null;
      } catch (error) {
        console.error('Error fetching supplier name:', error);
        return null;
      }
    };

    const getProductName = async (productId) => {
      try {
        const result = await executeQuery('SELECT pname FROM products WHERE id = ?', [productId]);
        return result[0]?.pname || null;
      } catch (error) {
        console.error('Error fetching product name:', error);
        return null;
      }
    };

    const getStationName = async (stationId) => {
      try {
        if (!stationId) return null;
        const result = await executeQuery('SELECT station_name FROM stations WHERE id = ?', [stationId]);
        return result[0]?.station_name || null;
      } catch (error) {
        console.error('Error fetching station name:', error);
        return null;
      }
    };

    // Get names from IDs
    const supplierName = await getSupplierName(data.supplier_id);
    const productName = await getProductName(data.product_id);
    const stationName = await getStationName(data.station_id);

    if (!supplierName || !productName) {
      return NextResponse.json(
        { success: false, message: 'Invalid supplier or product ID' },
        { status: 400 }
      );
    }

    // ✅ Destructure with defaults
    const {
      type = 'sale',
      supplier_id,
      product_id,
      station_id,
      invoiceNumber,
      invoiceDate,
      ewayBillNumber,
      ewayBillExpiryDate,
      density,
      quantityInKg,
      quantityInLtr,
      tankerNumber,
      driverNumber,
      lrNo,
      invoiceAmount,
      debitNote = 0,
      creditNote = 0,
      amount,
      status = 'on_the_way',
      quantityChanged = false,
      quantity_change_reason = '',
      quantity,
      unit
    } = data;

    // ✅ SQL Insert Query (includes all table columns)
    const query = `
      INSERT INTO purchases (
        purchase_type, supplier_id, supplier_name, product_id, product_name, station_id,
        invoice_number, invoice_date, eway_bill_number, eway_bill_expiry_date, 
        density, quantity_kg, quantity_ltr, tanker_number, driver_number, lr_no, 
        invoice_amount, debit_note, credit_note, amount, status, quantity_changed, 
        quantity_change_reason, quantity, unit
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      type,
      supplier_id,
      supplierName,
      product_id,
      productName,
      station_id || null,
      invoiceNumber,
      invoiceDate || null,
      ewayBillNumber || null,
      ewayBillExpiryDate || null,
      density || null,
      quantityInKg || null,
      quantityInLtr || null,
      tankerNumber || null,
      driverNumber || null,
      lrNo || null,
      invoiceAmount || null,
      debitNote,
      creditNote,
      amount || null,
      status,
      quantityChanged ? 1 : 0,
      quantity_change_reason,
      quantity || null,
      unit || null
    ];

    console.log('Executing query with params:', params);

    const result = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      message: 'Purchase saved successfully!',
      data: result
    });
  } catch (error) {
    console.error('Error saving purchase:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Error saving purchase data',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// 🟢 Get Purchases (with optional ?type= filter)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = `
      SELECT 
        id,
        purchase_type AS type,
        supplier_id,
        supplier_name AS supplierName,
        product_id,
        product_name AS productName,
        station_id,
        invoice_number AS invoiceNumber,
        invoice_date AS invoiceDate,
        eway_bill_number AS ewayBillNumber,
        eway_bill_expiry_date AS ewayBillExpiryDate,
        density,
        quantity_kg AS quantityInKg,
        quantity_ltr AS quantityInLtr,
        tanker_number AS tankerNumber,
        driver_number AS driverNumber,
        lr_no AS lrNo,
        invoice_amount AS invoiceAmount,
        debit_note AS debitNote,
        credit_note AS creditNote,
        amount,
        status,
        quantity_changed AS quantityChanged,
        quantity_change_reason,
        quantity,
        unit,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM purchases
    `;

    const params = [];

    if (type) {
      query += ' WHERE purchase_type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC';

    const purchases = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      data: purchases
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      { success: false, message: 'Error fetching purchases', error: error.message },
      { status: 500 }
    );
  }
}