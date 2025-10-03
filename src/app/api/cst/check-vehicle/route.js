import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicle_number = searchParams.get('vehicle_number');
    const customer_id = searchParams.get('customer_id');

    if (!vehicle_number || !customer_id) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters' },
        { status: 400 }
      );
    }

    // Get customer com_id
    const customerData = await executeQuery(
      'SELECT com_id FROM customers WHERE id = ?',
      [customer_id]
    );

    if (customerData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const cid = customerData[0].com_id || customer_id;

    const existingRequest = await executeQuery(
      `SELECT rid, status FROM filling_requests 
       WHERE vehicle_number = ? AND cid = ? AND status IN ('Pending', 'In Progress')`,
      [vehicle_number, cid]
    );

    return NextResponse.json({
      exists: existingRequest.length > 0,
      rid: existingRequest.length > 0 ? existingRequest[0].rid : null,
      status: existingRequest.length > 0 ? existingRequest[0].status : null
    });

  } catch (error) {
    console.error('Error in check-vehicle API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}