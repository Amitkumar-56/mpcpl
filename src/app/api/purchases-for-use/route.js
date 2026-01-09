// app/api/purchases-for-use/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || currentUser?.id || null;
      userName = currentUser?.userName || null;
      
      // Fetch employee name from employee_profile
      if (userId) {
        try {
          const empResult = await executeQuery(
            `SELECT name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (empResult.length > 0 && empResult[0].name) {
            userName = empResult[0].name;
          }
        } catch (empError) {
          console.error('Error fetching employee name:', empError);
        }
      }
    } catch (authError) {
      console.warn('Auth check failed, continuing without user info:', authError.message);
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

    // Create audit log
    try {
      await createAuditLog({
        page: 'Stock Management',
        uniqueCode: `PURCHASE-USE-${result.insertId}`,
        section: 'Purchase for Use',
        userId: userId,
        userName: userName || (userId ? `Employee ID: ${userId}` : null),
        action: 'add',
        remarks: `Purchase for use created: ${supplier_name} - ${product_name}, Amount: ₹${amountNum}, Quantity: ${quantityNum}Kg, Station ID: ${fsIdNum}`,
        oldValue: null,
        newValue: {
          supplier_name,
          product_name,
          amount: amountNum,
          quantity: quantityNum,
          invoice_date: invoiceDate,
          fs_id: fsIdNum
        },
        recordType: 'purchase_for_use',
        recordId: result.insertId
      });
      console.log('✅ Audit log created for purchase for use:', { userId, userName, purchaseId: result.insertId });
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
      // Don't throw - continue even if audit log fails
    }

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
