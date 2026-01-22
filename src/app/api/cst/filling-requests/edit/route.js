import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching request with ID:', id);

    // Fetch request details
    const query = `
      SELECT 
        fr.*,
        p.pname AS product_name,
        pc.pcode AS product_code,
        fs.station_name,
        c.name AS customer_name
      FROM filling_requests fr
      LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      WHERE fr.id = ?
    `;
    
    const result = await executeQuery(query, [id]);
    console.log('📦 Request data:', result);
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      request: result[0]
    });

  } catch (error) {
    console.error('❌ Error fetching request:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      id,
      product,
      station,
      customer,
      vehicle_number,
      driver_number,
      qty,
      aqty
    } = body;

    console.log('📝 Updating request:', body);

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!product || !station || !customer || !qty) {
      return NextResponse.json(
        { success: false, message: 'Product, Station, Customer, and Quantity are required' },
        { status: 400 }
      );
    }

    // Check if request exists and is in pending status
    const checkQuery = `
      SELECT status FROM filling_requests WHERE id = ?
    `;
    const checkResult = await executeQuery(checkQuery, [id]);
    
    if (checkResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Request not found' },
        { status: 404 }
      );
    }

    const currentStatus = checkResult[0].status;
    console.log('📊 Current status:', currentStatus);
    
    // Only allow editing if status is pending
    if (currentStatus.toLowerCase() !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Only pending requests can be edited' },
        { status: 400 }
      );
    }

    // Update the request
    const updateQuery = `
      UPDATE filling_requests 
      SET 
        sub_product_id = ?,
        fs_id = ?,
        cid = ?,
        licence_plate = ?,
        phone = ?,
        qty = ?,
        aqty = ?,
        updated_at = NOW()
      WHERE id = ?
    `;

    await executeQuery(updateQuery, [
      product,
      station,
      customer,
      vehicle_number,
      driver_number,
      qty,
      aqty || null,
      id
    ]);

    console.log('✅ Request updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Request updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating request:', error);
    return NextResponse.json(
      { success: false, message: 'Server error: ' + error.message },
      { status: 500 }
    );
  }
}
