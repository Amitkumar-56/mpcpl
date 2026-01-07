// app/api/purchases-for-use/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const purchases = await executeQuery(
      `SELECT 
        id,
        supplier_name,
        product_name,
        amount,
        quantity,
        invoice_date,
        created_at
       FROM purchase_for_use 
       ORDER BY created_at DESC`
    );

    return NextResponse.json({
      success: true,
      data: purchases,
      message: 'Purchases fetched successfully'
    });

  } catch (error) {
    console.error('Error fetching purchases:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch purchases',
        error: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const {
      supplier_name,
      product_name,
      amount,
      quantity,
      invoiceDate,
      fs_id
    } = await request.json();

    const missingFields = [];
    if (!supplier_name) missingFields.push('supplier_name');
    if (!product_name) missingFields.push('product_name');
    if (amount === undefined || amount === null || amount === '') missingFields.push('amount');
    if (quantity === undefined || quantity === null || quantity === '') missingFields.push('quantity');
    if (!invoiceDate) missingFields.push('invoiceDate');
    if (!fs_id || fs_id === '' || fs_id === null || fs_id === undefined) missingFields.push('fs_id');
    const fieldErrors = {};
    const amountNum = parseFloat(amount);
    const quantityNum = parseFloat(quantity);
    const fsIdNum = fs_id ? parseInt(fs_id) : null;
    if (!isNaN(amountNum) && amountNum <= 0) fieldErrors.amount = 'Amount must be greater than 0';
    if (!isNaN(quantityNum) && quantityNum <= 0) fieldErrors.quantity = 'Quantity must be greater than 0';
    if (missingFields.length > 0 || Object.keys(fieldErrors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          missingFields,
          fieldErrors
        },
        { status: 400 }
      );
    }

    // Insert into purchase_for_use table
    const result = await executeQuery(
      `INSERT INTO purchase_for_use 
       (supplier_name, product_name, amount, quantity, invoice_date, fs_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        supplier_name,
        product_name,
        amountNum,
        quantityNum,
        invoiceDate,
        fsIdNum
      ]
    );

    return NextResponse.json(
      { 
        success: true,
        message: 'Purchase for use created successfully', 
        id: result.insertId 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating purchase for use:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}
