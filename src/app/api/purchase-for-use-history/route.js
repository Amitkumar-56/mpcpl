// app/api/purchase-for-use-history/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching purchase history...');

    const purchases = await executeQuery(`
      SELECT 
        id,
        supplier_name,
        product_name,
        amount,
        quantity,
        invoice_date,
        created_at
      FROM purchase_for_use 
      ORDER BY created_at DESC
    `);

    // If no purchases found, return empty array
    if (!purchases || purchases.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No purchases found'
      });
    }

    // Format the data to ensure proper types
    const formattedPurchases = purchases.map(purchase => ({
      id: purchase.id,
      supplier_name: purchase.supplier_name || 'N/A',
      product_name: purchase.product_name || 'N/A',
      amount: parseFloat(purchase.amount) || 0,
      quantity: parseInt(purchase.quantity) || 0,
      invoice_date: purchase.invoice_date,
      created_at: purchase.created_at
    }));

    return NextResponse.json({
      success: true,
      data: formattedPurchases,
      count: formattedPurchases.length,
      message: 'Purchase history fetched successfully'
    });

  } catch (error) {
    console.error('Database error in purchase-for-use-history:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error while fetching purchase history',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
      },
      { status: 500 }
    );
  }
}