
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
      customer_id,
      sub_product_id
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

    // ✅ NEW: Check if station is enabled
    const stationCheck = await executeQuery(
      'SELECT id, station_name, status FROM filling_stations WHERE id = ?',
      [parseInt(station_id)]
    );

    if (stationCheck.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Station not found'
      }, { status: 404 });
    }

    const station = stationCheck[0];
    
    // Block request if station is disabled (status = 0)
    if (station.status === 0 || station.status === '0') {
      console.log('❌ Station is disabled:', station.station_name, 'Status:', station.status);
      return NextResponse.json({
        success: false,
        message: `Station "${station.station_name}" is disabled. Please enable the station first to create filling requests.`
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

    let chosenSubProductId = sub_product_id ? parseInt(sub_product_id) : null;
    let productData = null;
    const allCodesQuery = `
      SELECT 
        pc.id as sub_product_id,
        pc.pcode,
        pc.product_id,
        p.pname as product_name
      FROM product_codes pc
      LEFT JOIN products p ON pc.product_id = p.id
      WHERE pc.product_id = ?
      ORDER BY pc.id ASC
    `;
    const codeRows = await executeQuery(allCodesQuery, [product_id]);
    if (!codeRows || codeRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No product codes found for this product'
      }, { status: 400 });
    }
    const classify = (pcode) => {
      const code = (pcode || '').toUpperCase().replace(/\s+/g, '');
      if (product_id === 2 || product_id === 3) {
        const isRetail = code.endsWith('R') || code.includes('-R') || code.includes('RTL') || code.includes('RETAIL');
        return isRetail ? 'retail' : 'bulk';
      } else if (product_id === 4) {
        if (code.includes('BULK') || code.includes('DEFLB')) return 'bulk';
        return 'retail';
      } else if (product_id === 5) {
        if (code.includes('BUCKET')) return 'bulk';
        return 'retail';
      }
      return 'retail';
    };
    const qtyNum = parseFloat(qty) || 0;
    const desired = qtyNum >= 1000 ? 'bulk' : 'retail';
    if (!chosenSubProductId) {
      const match = codeRows.find(r => classify(r.pcode) === desired);
      chosenSubProductId = match ? match.sub_product_id : codeRows[0].sub_product_id;
    }
    const chosenRow = codeRows.find(r => r.sub_product_id === chosenSubProductId) || codeRows[0];
    productData = {
      product_id: chosenRow.product_id,
      product_name: chosenRow.product_name,
      sub_product_id: chosenRow.sub_product_id,
      pcode: chosenRow.pcode
    };

    // Get price
    let price = 0;
    const exactPriceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE com_id = ? 
        AND station_id = ?
        AND product_id = ?
        AND sub_product_id = ?
        AND is_active = 1
        AND status = 'active'
        AND is_applied = 1
      ORDER BY updated_date DESC
      LIMIT 1
    `;
    const mainPriceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE com_id = ? 
        AND station_id = ?
        AND product_id = ?
        AND (sub_product_id IS NULL OR sub_product_id = 0 OR sub_product_id = '')
        AND is_active = 1
        AND status = 'active'
        AND is_applied = 1
      ORDER BY updated_date DESC
      LIMIT 1
    `;
    const exactRes = await executeQuery(exactPriceQuery, [
      parseInt(customer_id),
      parseInt(station_id),
      parseInt(productData.product_id),
      parseInt(productData.sub_product_id)
    ]);
    if (exactRes && exactRes.length > 0) {
      price = parseFloat(exactRes[0].price) || 0;
    } else {
      const mainRes = await executeQuery(mainPriceQuery, [
        parseInt(customer_id),
        parseInt(station_id),
        parseInt(productData.product_id)
      ]);
      if (mainRes && mainRes.length > 0) {
        price = parseFloat(mainRes[0].price) || 0;
      }
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
