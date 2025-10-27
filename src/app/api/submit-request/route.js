import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

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
      products_codes, // This is the product_codes.id
    } = body;

    console.log('📥 Received data for request creation:', body);

    // Validate required fields
    if (!customer || !products_codes || !station_id || !vehicle_no || !driver_no || !qty) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
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
    const product_id = productCodeData.product_id; // This goes to filling_requests.product
    const sub_product_id = productCodeData.id; // This goes to filling_requests.sub_product_id
    const product_code_name = productCodeData.pcode; // Product code name

    console.log('📊 CORRECTED Product mapping details:', {
      selected_product_code_id: products_codes,
      product_code_name: product_code_name,
      product_id_for_filling_requests_product: product_id, // ✅ This should go to filling_requests.product
      sub_product_id_for_filling_requests_sub_product_id: sub_product_id // ✅ This should go to filling_requests.sub_product_id
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
      product: product_id, // ✅ product_codes.product_id → filling_requests.product
      sub_product_id: sub_product_id, // ✅ product_codes.id → filling_requests.sub_product_id
      customer: customer,
      qty: qty,
      product_code_name: product_code_name
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
        vehicle_no,                
        driver_no,                  
        request_type,             
        parseFloat(qty),           
        parseFloat(qty),            
        currentDate,              
        parseInt(customer),         
        'Pending',                  
        remarks || '', 
        parseInt(product_id), // ✅ CORRECT: product_codes.product_id → filling_requests.product
        parseInt(sub_product_id) // ✅ CORRECT: product_codes.id → filling_requests.sub_product_id
      ]
    );

    console.log('✅ CORRECTED - Insert result:', result);

    if (result.affectedRows > 0) {
      // Also create entry in filling_logs
      try {
        await executeQuery(
          `INSERT INTO filling_logs (request_id, created_by, created_date) VALUES (?, ?, ?)`,
          [nextRID, 1, currentDate] // Using user ID 1 as default
        );
        console.log('✅ Filling logs entry created');
      } catch (logError) {
        console.error('⚠️ Error creating filling logs:', logError);
        // Continue even if logs fail
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