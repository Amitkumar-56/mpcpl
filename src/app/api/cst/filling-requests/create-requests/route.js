// src/app/api/cst/filling-requests/create-requests/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    console.log('✅ API Hit: /api/cst/filling-requests/create-requests');
    
    const body = await request.json();
    console.log('📦 Received data:', body);
    
    const {
      product_id,
      station_id,
      licence_plate,
      phone,
      request_type,
      qty,
      remarks,
      customer_id
    } = body;

    // Validate required fields
    if (!product_id || !station_id || !licence_plate || !phone || !customer_id) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check if customer exists and is active (status = 1)
    const customerCheck = await executeQuery(
      'SELECT id, name, status FROM customers WHERE id = ?',
      [parseInt(customer_id)]
    );

    if (customerCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Customer not found'
      }, { status: 404 });
    }

    const customer = customerCheck[0];
    
    // Block request if customer is disabled (status = 0)
    if (customer.status === 0 || customer.status === '0' || customer.status === 'Disable') {
      console.log('❌ Customer is disabled:', customer.name, 'Status:', customer.status);
      return NextResponse.json({
        success: false,
        message: `Customer "${customer.name}" is disabled. Please enable the customer first to create filling requests.`
      }, { status: 403 });
    }

    // Generate RID
    const lastRequestQuery = `SELECT rid FROM filling_requests ORDER BY id DESC LIMIT 1`;
    const lastRequest = await executeQuery(lastRequestQuery);
    
    let newRid = 'MP000001';
    if (lastRequest.length > 0 && lastRequest[0].rid) {
      const lastRid = lastRequest[0].rid;
      if (lastRid.startsWith('MP')) {
        const lastNumber = parseInt(lastRid.replace('MP', ''));
        if (!isNaN(lastNumber)) {
          newRid = 'MP' + String(lastNumber + 1).padStart(6, '0');
        }
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Get product details
    const productQuery = `
      SELECT 
        pc.id as product_code_id,
        pc.pcode,
        pc.product_id,
        pc.id as sub_product_id,
        p.pname as product_name
      FROM product_codes pc 
      LEFT JOIN products p ON pc.product_id = p.id 
      WHERE pc.id = ?
    `;
    const productResult = await executeQuery(productQuery, [product_id]);
    
    if (productResult.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid product selected'
      }, { status: 400 });
    }

    const productData = productResult[0];

    // Get price
    const priceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE com_id = ? 
        AND station_id = ?
        AND product_id = ?
        AND is_active = 1
        AND status = 'active'
      ORDER BY updated_date DESC
      LIMIT 1
    `;

    const priceResult = await executeQuery(priceQuery, [
      customer_id,
      station_id,
      productData.product_id
    ]);

    let price = 0;
    if (priceResult.length > 0) {
      price = parseFloat(priceResult[0].price) || 0;
    }

    console.log('📊 Insert Data:', {
      rid: newRid,
      fs_id: station_id,
      vehicle_number: licence_plate,
      product: productData.product_id,
      sub_product_id: productData.sub_product_id,
      price: price
    });

    // Insert into filling_requests
    const insertQuery = `
      INSERT INTO filling_requests (
        rid, 
        fs_id, 
        vehicle_number, 
        driver_number, 
        rtype, 
        qty, 
        aqty,
        otp, 
        cid, 
        remark, 
        status, 
        created, 
        product, 
        sub_product_id,
        price
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertQuery, [
      newRid,
      parseInt(station_id),
      licence_plate.toUpperCase().trim(),
      phone.trim(),
      request_type || 'Liter',
      parseFloat(qty) || 0,
      parseFloat(qty) || 0,
      otp,
      parseInt(customer_id),
      remarks || '',
      'pending',
      currentDate,
      productData.product_id,
      productData.sub_product_id,
      price
    ]);

    console.log('✅ Database insert result:', result);

    if (result.affectedRows === 1) {
      const stationQuery = `SELECT station_name FROM filling_stations WHERE id = ?`;
      const stationResult = await executeQuery(stationQuery, [station_id]);
      const stationName = stationResult.length > 0 ? stationResult[0].station_name : 'Unknown Station';

      return NextResponse.json({
        success: true,
        rid: newRid,
        otp: otp,
        vehicle: licence_plate.toUpperCase(),
        product: productData.product_name,
        product_code: productData.pcode,
        station: stationName,
        quantity: qty,
        price: price,
        total_amount: (price * parseFloat(qty || 0)).toFixed(2),
        request_type: request_type || 'Liter',
        message: 'Filling request created successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to create request in database'
      }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ Create Request API Error:", error);
    return NextResponse.json({ 
      success: false, 
      message: 'Server error: ' + error.message 
    }, { status: 500 });
  }
}