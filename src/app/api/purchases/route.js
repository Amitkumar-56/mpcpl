import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// 🟢 Create Purchase
export async function POST(request) {
  try {
    const data = await request.json();

    // ✅ Input Validation
    if (!data.supplierName || !data.invoiceNumber || !data.productName) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: supplierName, invoiceNumber, productName' },
        { status: 400 }
      );
    }

    // ✅ Destructure with defaults
    const {
      type = 'sale',
      supplierName,
      invoiceNumber,
      invoiceDate,
      productName,
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
      quantityChanged = false
    } = data;

    // ✅ SQL Insert Query (matches your DB table exactly)
    const query = `
      INSERT INTO purchases (
        purchase_type, supplier_name, invoice_number, invoice_date, product_name,
        eway_bill_number, eway_bill_expiry_date, density, quantity_kg, quantity_ltr,
        tanker_number, driver_number, lr_no, invoice_amount, debit_note, credit_note, amount,
        status, quantity_changed
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      type,
      supplierName,
      invoiceNumber,
      invoiceDate || null,
      productName,
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
      quantityChanged ? 1 : 0
    ];

    await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      message: 'Purchase saved successfully!'
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
        supplier_name AS supplierName,
        invoice_number AS invoiceNumber,
        invoice_date AS invoiceDate,
        product_name AS productName,
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
