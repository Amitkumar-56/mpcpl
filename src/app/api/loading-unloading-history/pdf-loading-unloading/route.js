// src/app/api/loading-unloading-history/pdf-loading-unloading/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shipmentId = searchParams.get('shipment_id');

    if (!shipmentId) {
      return NextResponse.json(
        { success: false, message: 'Shipment ID is required' },
        { status: 400 }
      );
    }

    // Fetch shipment record
    const query = "SELECT * FROM shipment_records WHERE shipment_id = ?";
    const results = await executeQuery(query, [parseInt(shipmentId)]);

    if (results.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Shipment not found' },
        { status: 404 }
      );
    }

    const shipment = results[0];

    return NextResponse.json({
      success: true,
      data: shipment
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching shipment data',
        error: error.message 
      },
      { status: 500 }
    );
  }
}