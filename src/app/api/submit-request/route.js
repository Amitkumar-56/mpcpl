// src/app/api/submit-request/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/auditLog";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      customer,       
      station_id,    
      vehicle_no,      
      driver_no,      
      request_type,    
      qty,            
      remarks,
      products_codes,
    } = body;

    console.log('📥 Received data for request creation:', body);

    // Validate required fields
    if (!customer || !products_codes || !station_id || !vehicle_no || !driver_no || !qty) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // ✅ STRICT Vehicle Number Validation - NO SPACES ALLOWED
    if (vehicle_no.includes(' ')) {
      return NextResponse.json({ 
        error: "Spaces are not allowed in Vehicle Number! Please remove all spaces." 
      }, { status: 400 });
    }

    const cleanVehicleNo = vehicle_no.toString().replace(/\s/g, '').toUpperCase();
    
    if (cleanVehicleNo.length < 3) {
      return NextResponse.json({ 
        error: "Vehicle number must be at least 3 characters long" 
      }, { status: 400 });
    }

    // ✅ STRICT Driver Number Validation - NO SPACES ALLOWED
    if (driver_no.includes(' ')) {
      return NextResponse.json({ 
        error: "Spaces are not allowed in Driver Number! Please remove all spaces." 
      }, { status: 400 });
    }

    const cleanDriverNo = driver_no.toString().replace(/\s/g, '');
    
    if (cleanDriverNo.length !== 10 || !/^\d+$/.test(cleanDriverNo)) {
      return NextResponse.json({ 
        error: "Driver number must be exactly 10 digits without spaces" 
      }, { status: 400 });
    }

    // First, get the product details from product_codes table
    const productCodeQuery = await executeQuery(
      "SELECT id, pcode, product_id FROM product_codes WHERE id = ?",
      [parseInt(products_codes)]
    );

    console.log('🔍 Product code query result:', productCodeQuery);

    if (productCodeQuery.length === 0) {
      return NextResponse.json({ error: "Invalid product code selected" }, { status: 400 });
    }

    const productCodeData = productCodeQuery[0];
    const product_id = productCodeData.product_id;
    const sub_product_id = productCodeData.id;
    const product_code_name = productCodeData.pcode;

    console.log('📊 CORRECTED Product mapping details:', {
      selected_product_code_id: products_codes,
      product_code_name: product_code_name,
      product_id_for_filling_requests_product: product_id,
      sub_product_id_for_filling_requests_sub_product_id: sub_product_id
    });

    // Generate the next RID (MP000001 format)
    const ridResult = await executeQuery(
      "SELECT rid FROM filling_requests ORDER BY id DESC LIMIT 1"
    );
    
    let nextRID = "MP000001";
    if (ridResult.length > 0) {
      const lastRID = ridResult[0].rid;
      if (lastRID && lastRID.startsWith('MP')) {
        const lastNumber = parseInt(lastRID.substring(2));
        nextRID = `MP${String(lastNumber + 1).padStart(6, '0')}`;
      }
    }

    // Get current timestamp
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');

    console.log('📝 CORRECTED - Inserting into filling_requests:', {
      rid: nextRID,
      fs_id: station_id,
      product: product_id,
      sub_product_id: sub_product_id,
      customer: customer,
      qty: qty,
      product_code_name: product_code_name,
      vehicle_no: cleanVehicleNo,
      driver_no: cleanDriverNo
    });

    // Insert into filling_requests table with CORRECT mapping
    const result = await executeQuery(
      `INSERT INTO filling_requests (
        rid, fs_id, vehicle_number, driver_number, rtype, qty, aqty, 
        created, cid, status, remark, product, sub_product_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextRID,                 
        parseInt(station_id),     
        cleanVehicleNo,           // ✅ Use cleaned vehicle number
        cleanDriverNo,            // ✅ Use cleaned driver number  
        request_type,             
        parseFloat(qty),           
        parseFloat(qty),            
        currentDate,              
        parseInt(customer),         
        'Pending',                  
        remarks || '', 
        parseInt(product_id),
        parseInt(sub_product_id)
      ]
    );

    console.log('✅ CORRECTED - Insert result:', result);

    if (result.affectedRows > 0) {
      // ✅ Get customer name from customers table
      let customerName = null;
      let customerPermissions = {};
      
      try {
        const customerInfo = await executeQuery(
          `SELECT id, name FROM customers WHERE id = ?`,
          [parseInt(customer)]
        );
        
        if (customerInfo.length > 0) {
          customerName = customerInfo[0].name;
          
          // ✅ Check customer_permissions
          const permissionRows = await executeQuery(
            `SELECT module_name, can_view, can_edit, can_create 
             FROM customer_permissions 
             WHERE customer_id = ?`,
            [parseInt(customer)]
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
          page: 'Customer Dashboard - Submit Request',
          uniqueCode: `FR-SUBMIT-${nextRID}`,
          section: 'Create Filling Request',
          userId: parseInt(customer),
          userName: customerName || `Customer ID: ${customer}`,
          action: 'create',
          remarks: `Created filling request ${nextRID}: ${product_code_name}, Qty: ${qty}, Vehicle: ${cleanVehicleNo}, Station: ${station_id}`,
          oldValue: null,
          newValue: {
            rid: nextRID,
            customer_id: parseInt(customer),
            customer_name: customerName,
            product_id: parseInt(product_id),
            product_code: product_code_name,
            sub_product_id: parseInt(sub_product_id),
            station_id: parseInt(station_id),
            vehicle_number: cleanVehicleNo,
            driver_number: cleanDriverNo,
            qty: parseFloat(qty),
            permissions: customerPermissions
          }
        });
        console.log('✅ Audit log created for customer filling request');
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
        // Continue even if audit log fails
      }

      // Also create entry in filling_logs - use customer ID
      try {
        await executeQuery(
          `INSERT INTO filling_logs (request_id, created_by, created_date) VALUES (?, ?, ?)`,
          [nextRID, parseInt(customer), currentDate]
        );
        console.log('✅ Filling logs entry created with customer ID:', customer);
      } catch (logError) {
        console.error('⚠️ Error creating filling logs:', logError);
      }

      return NextResponse.json({ 
        success: true, 
        message: "Request created successfully",
        rid: nextRID 
      });
    } else {
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
  }
}