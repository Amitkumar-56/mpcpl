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
      invoiceDate
    } = await request.json();

    // Validate required fields
    if (!supplier_name || !product_name || !amount || !quantity || !invoiceDate) {
      return NextResponse.json(
        { 
          success: false,
          message: 'All fields are required' 
        },
        { status: 400 }
      );
    }

    // Insert into purchase_for_use table
    const result = await executeQuery(
      `INSERT INTO purchase_for_use 
       (supplier_name, product_name, amount, quantity, invoice_date) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        supplier_name,
        product_name,
        parseFloat(amount),
        parseFloat(quantity),
        invoiceDate
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