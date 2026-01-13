//src/app/api/cst/create-requests/route.js
import { createAuditLog } from "@/lib/auditLog";
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    console.log('✅ API Hit: /api/cst/filling-requests/create-requests');
    
    const body = await request.json();
    console.log('📦 Received data:', body);
    
    const {
      product_id,
      sub_product_id, // ✅ Accept sub_product_id if provided
      station_id,
      licence_plate,
      phone,
      request_type,
      qty,
      remarks,
      customer_id
    } = body;

    // Validate required fields
    if ((!product_id && !sub_product_id) || !station_id || !licence_plate || !phone || !customer_id) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required fields (product/sub-product, station, vehicle, phone, or customer)' 
      }, { status: 400 });
    }

    const stationRows = await executeQuery(
      'SELECT id, station_name, status FROM filling_stations WHERE id = ?',
      [parseInt(station_id)]
    );
    if (stationRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Station not found'
      }, { status: 404 });
    }
    if (stationRows[0].status === 0 || stationRows[0].status === '0') {
      return NextResponse.json({
        success: false,
        message: `Station "${stationRows[0].station_name}" is disabled. Please enable the station first to create filling requests.`
      }, { status: 403 });
    }
    const blRows = await executeQuery(
      'SELECT blocklocation FROM customers WHERE id = ?',
      [parseInt(customer_id)]
    );
    const bl = blRows.length > 0 ? String(blRows[0].blocklocation || '').trim() : '';
    const allowedIds = bl
      .split(',')
      .map(x => x.trim())
      .filter(x => x !== '' && !isNaN(parseInt(x)))
      .map(x => parseInt(x));
    if (!allowedIds.includes(parseInt(station_id))) {
      return NextResponse.json({
        success: false,
        message: 'Selected station is not allowed for this customer'
      }, { status: 403 });
    }

    // Check if customer is active
    const customerBalanceRows = await executeQuery(
      'SELECT day_limit, is_active FROM customer_balances WHERE com_id = ?',
      [parseInt(customer_id)]
    );
    
    if (customerBalanceRows.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Customer balance record not found'
      }, { status: 404 });
    }
    
    const isActive = customerBalanceRows[0].is_active === 1;
    const dayLimitVal = customerBalanceRows.length > 0 ? parseInt(customerBalanceRows[0].day_limit) || 0 : 0;
    
    // Block request if customer is inactive
    if (!isActive) {
      // Check if it's due to day limit expiry
      if (dayLimitVal > 0) {
        const oldestUnpaid = await executeQuery(
          `SELECT completed_date 
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0
           ORDER BY completed_date ASC 
           LIMIT 1`,
          [parseInt(customer_id)]
        );
        
        if (oldestUnpaid.length > 0) {
          const oldestUnpaidDate = new Date(oldestUnpaid[0].completed_date);
          oldestUnpaidDate.setHours(0, 0, 0, 0);
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
          const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
          
          if (daysElapsed >= dayLimitVal) {
            return NextResponse.json({
              success: false,
              message: `Day limit exceeded. Your day limit has been exceeded (${daysElapsed} days elapsed, limit: ${dayLimitVal} days). Please recharge your account to continue.`
            }, { status: 403 });
          }
        }
      }
      
      return NextResponse.json({
        success: false,
        message: 'Your account is inactive. Please contact administrator.'
      }, { status: 403 });
    }
    if (dayLimitVal > 0) {
      // For day_limit customers: Check if oldest unpaid day is cleared
      // Get oldest unpaid day's total amount
      const oldestUnpaidDay = await executeQuery(
        `SELECT 
           DATE(completed_date) as day_date,
           SUM(totalamt) as day_total,
           COUNT(*) as transaction_count
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         GROUP BY DATE(completed_date)
         ORDER BY DATE(completed_date) ASC
         LIMIT 1`,
        [parseInt(customer_id)]
      );
      
      if (oldestUnpaidDay.length > 0 && oldestUnpaidDay[0].day_date) {
        const dayTotal = parseFloat(oldestUnpaidDay[0].day_total) || 0;
        const transactionCount = parseInt(oldestUnpaidDay[0].transaction_count) || 0;
        const dayDate = oldestUnpaidDay[0].day_date;
        
        // Check if this day has unpaid amount - if yes, block new requests
        if (dayTotal > 0 && transactionCount > 0) {
          return NextResponse.json({
            success: false,
            message: `Day limit: Please clear the payment for ${dayDate} (₹${dayTotal.toFixed(2)}) before making new requests. Total ${transactionCount} transaction(s) pending for this day.`
          }, { status: 403 });
        }
      }
      
      // Also check day limit expiry (days elapsed since oldest unpaid transaction)
      const earliestRows = await executeQuery(
        `SELECT completed_date FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         ORDER BY completed_date ASC LIMIT 1`,
        [parseInt(customer_id)]
      );
      if (earliestRows.length > 0 && earliestRows[0].completed_date) {
        const completed = new Date(earliestRows[0].completed_date);
        const daysUsed = Math.max(0, Math.floor((Date.now() - completed.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysUsed >= dayLimitVal) {
          return NextResponse.json({
            success: false,
            message: `Day limit exceeded (${daysUsed}/${dayLimitVal} days). Please pay the oldest day's amount to continue.`
          }, { status: 403 });
        }
      }
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
    // ✅ FIX: Get current IST time directly (server timezone should be IST)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    // ✅ Use sub_product_id if provided, otherwise use product_id as fallback
    const subProductIdToUse = sub_product_id || product_id;
    
    // Get product details using sub_product_id (product_code.id)
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
    const productResult = await executeQuery(productQuery, [subProductIdToUse]);
    
    if (productResult.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Invalid product code (sub-product) selected'
      }, { status: 400 });
    }

    const productData = productResult[0];

    // Minimum quantity enforcement based on product and code (Bulk/Retail)
    const pcodeUpper = String(productData.pcode || '').toUpperCase();
    const pid = parseInt(productData.product_id);
    let category = 'retail';
    if (pid === 2 || pid === 3) {
      const norm = pcodeUpper.replace(/\s+/g, '');
      const isRetail = norm.endsWith('R') || norm.includes('-R') || pcodeUpper.includes('RTL') || pcodeUpper.includes('RETAIL');
      category = isRetail ? 'retail' : 'bulk';
    } else if (pid === 4) {
      const norm = pcodeUpper.replace(/\s+/g, '');
      if (norm.includes('BULK') || norm.includes('DEFLB')) category = 'bulk';
      else category = 'retail';
    } else if (pid === 5) {
      if (pcodeUpper.includes('BUCKET')) category = 'bulk';
      else category = 'retail';
    }
    let minLiters = 1;
    if (pid === 2 || pid === 3) {
      minLiters = category === 'bulk' ? 1000 : 1;
    } else if (pid === 4) {
      minLiters = category === 'bulk' ? 1000 : 1;
    } else if (pid === 5) {
      const bucketSize = 20;
      minLiters = category === 'bulk' ? (25 * bucketSize) : (1 * bucketSize);
    }
    const requestedQty = parseFloat(qty) || 0;
    if (requestedQty < minLiters) {
      const msg =
        pid === 5
          ? (category === 'bulk' ? 'Minimum Bulk quantity is 25 buckets (500 Ltr)' : 'Minimum Retail quantity is 1 bucket (20 Ltr)')
          : (category === 'bulk'
              ? 'Minimum Bulk quantity is 1000 Ltr'
              : 'Minimum Retail quantity is 1 Ltr');
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    // Get price - check for sub_product_id match first, then product_id only
    let priceQuery = '';
    let priceParams = [];
    
    // First try to get price with sub_product_id match
    priceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE com_id = ? 
        AND station_id = ?
        AND product_id = ?
        AND sub_product_id = ?
        AND is_active = 1
        AND status = 'active'
      ORDER BY updated_date DESC
      LIMIT 1
    `;
    
    priceParams = [
      customer_id,
      station_id,
      productData.product_id,
      productData.sub_product_id
    ];
    
    let priceResult = await executeQuery(priceQuery, priceParams);
    
    // If no exact match with sub_product_id, try without sub_product_id
    if (priceResult.length === 0) {
      priceQuery = `
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
      
      priceParams = [
        customer_id,
        station_id,
        productData.product_id
      ];
      
      priceResult = await executeQuery(priceQuery, priceParams);
    }

    let price = 0;
    if (priceResult.length > 0) {
      price = parseFloat(priceResult[0].price) || 0;
    }

    const typeRows = await executeQuery(
      'SELECT client_type FROM customers WHERE id = ?',
      [parseInt(customer_id)]
    );
    const clientType = typeRows.length > 0 ? String(typeRows[0].client_type) : '';
    if (clientType === '2') {
      const requestedAmount = price * (parseFloat(qty) || 0);
      const balRows = await executeQuery(
        'SELECT amtlimit FROM customer_balances WHERE com_id = ?',
        [parseInt(customer_id)]
      );
      const amtlimit = balRows.length > 0 ? parseFloat(balRows[0].amtlimit) || 0 : 0;
      if (requestedAmount > amtlimit) {
        return NextResponse.json({
          success: false,
          message: 'Insufficient credit limit. Please recharge to continue.'
        }, { status: 403 });
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
      // ✅ Get customer name from customers table
      let customerName = null;
      let customerPermissions = {};
      
      try {
        const customerInfo = await executeQuery(
          `SELECT id, name FROM customers WHERE id = ?`,
          [parseInt(customer_id)]
        );
        
        if (customerInfo.length > 0) {
          customerName = customerInfo[0].name;
          
          // ✅ Check customer_permissions
          const permissionRows = await executeQuery(
            `SELECT module_name, can_view, can_edit, can_create 
             FROM customer_permissions 
             WHERE customer_id = ?`,
            [parseInt(customer_id)]
          );
          
          permissionRows.forEach((row) => {
            customerPermissions[row.module_name] = {
              can_view: Boolean(row.can_view),
              can_edit: Boolean(row.can_edit),
              can_create: Boolean(row.can_create),
            };
          });
        }
      } catch (custError) {
        console.error('Error fetching customer info:', custError);
      }

      // ✅ Create audit log with customer name and permissions
      try {
        await createAuditLog({
          page: 'Customer Dashboard - Filling Requests',
          uniqueCode: `FR-CST-${newRid}`,
          section: 'Create Filling Request',
          userId: parseInt(customer_id),
          userName: customerName || `Customer ID: ${customer_id}`,
          action: 'create',
          remarks: `Created filling request ${newRid}: ${productData.product_name}, Qty: ${qty}, Vehicle: ${licence_plate.toUpperCase()}, Station: ${station_id}`,
          oldValue: null,
          newValue: {
            rid: newRid,
            customer_id: parseInt(customer_id),
            customer_name: customerName,
            product_id: productData.product_id,
            product_name: productData.product_name,
            station_id: parseInt(station_id),
            vehicle_number: licence_plate.toUpperCase(),
            qty: parseFloat(qty) || 0,
            price: price,
            total_amount: (price * parseFloat(qty || 0)).toFixed(2),
            permissions: customerPermissions
          }
        });
        console.log('✅ Audit log created for customer filling request');
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Continue even if audit log fails
      }

      // ✅ FIX: Create filling_logs entry with customer ID (for CST requests)
      // Customer creates request, so created_by = customer_id
      try {
        // First check if log already exists
        const checkLogQuery = `SELECT id FROM filling_logs WHERE request_id = ?`;
        const existingLog = await executeQuery(checkLogQuery, [newRid]);
        
        if (existingLog.length === 0) {
          // ✅ FIX: Use customer_id directly for CST requests
          const logInsertQuery = `
            INSERT INTO filling_logs (request_id, created_by, created_date) 
            VALUES (?, ?, ?)
          `;
          await executeQuery(logInsertQuery, [newRid, parseInt(customer_id), currentDate]);
          console.log('✅ Filling logs entry created with customer ID:', customer_id, 'for request:', newRid);
          
          // Verify the log was created correctly
          const verifyLogQuery = `
            SELECT fl.*, c.name as customer_name 
            FROM filling_logs fl
            LEFT JOIN customers c ON fl.created_by = c.id
            WHERE fl.request_id = ?
          `;
          const verifyLog = await executeQuery(verifyLogQuery, [newRid]);
          if (verifyLog.length > 0) {
            console.log('✅ Verified log created:', {
              request_id: newRid,
              created_by: verifyLog[0].created_by,
              customer_name: verifyLog[0].customer_name
            });
          }
        } else {
          console.log('⚠️ Log already exists for request:', newRid);
        }
      } catch (logError) {
        console.error('❌ Error creating filling logs:', logError);
        console.error('Error details:', logError.message);
        // Continue even if log creation fails
      }

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
