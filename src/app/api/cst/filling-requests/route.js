// src/app/api/cst/filling-requests/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    console.log("🔍 API: Fetching filling requests...");
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cid = searchParams.get('cid'); 
    
    console.log("📊 API: Status filter:", status);
    console.log("👤 API: Customer ID:", cid); 
    
    // Validate customer ID
    if (!cid) {
      console.log("❌ API: Customer ID is missing");
      return NextResponse.json(
        { success: false, message: 'Customer ID is required', requests: [] },
        { status: 400 }
      );
    }

    // ✅ Convert customer ID to integer for proper matching
    const customerIdInt = parseInt(cid, 10);
    if (isNaN(customerIdInt) || customerIdInt <= 0) {
      console.log("❌ API: Invalid Customer ID:", cid);
      return NextResponse.json(
        { success: false, message: 'Invalid Customer ID', requests: [] },
        { status: 400 }
      );
    }

    // ✅ First, check if customer exists and get count of requests
    try {
      const customerCheck = await executeQuery(
        'SELECT id, name FROM customers WHERE id = ?',
        [customerIdInt]
      );
      console.log("👤 API: Customer check result:", customerCheck);
      
      if (customerCheck.length === 0) {
        console.log("⚠️ API: Customer not found with ID:", customerIdInt);
      } else {
        console.log("✅ API: Customer found:", customerCheck[0].name);
      }

      // ✅ Check total requests count for this customer (for debugging)
      const countCheck = await executeQuery(
        'SELECT COUNT(*) as total FROM filling_requests WHERE cid = ?',
        [customerIdInt]
      );
      console.log("📊 API: Total requests in DB for customer:", countCheck[0]?.total || 0);
    } catch (checkError) {
      console.error("⚠️ API: Error checking customer:", checkError);
    }

    // Build query based on filters
    let query = `
      SELECT fr.*, 
             p.pname AS product_name, 
             pc.pcode AS product_code,
             fs.station_name,
             c.name AS customer_name,
             fl_cancelled.cancelled_by_name,
             fl_cancelled.cancelled_date
      FROM filling_requests fr
      LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name AS cancelled_by_name,
          fl.cancelled_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.cancelled_by = ep.id
        WHERE fl.cancelled_by IS NOT NULL
      ) fl_cancelled ON fr.rid = fl_cancelled.request_id
      WHERE fr.cid = ?
    `;
    
    let params = [customerIdInt];
    let conditions = [];

    // Add status filter if provided and not 'All'
    if (status && status !== 'All') {
      conditions.push(`LOWER(fr.status) = ?`);
      params.push(status.toLowerCase());
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(' AND ');
    }
    
    // Add ordering
    query += ` ORDER BY fr.created DESC, fr.id DESC`;

    console.log("📝 API: Executing query:", query);
    console.log("🔢 API: Query params:", params);
    console.log("🔢 API: Customer ID (original):", cid, "(type:", typeof cid + ")");
    console.log("🔢 API: Customer ID (converted):", customerIdInt, "(type:", typeof customerIdInt + ")");
    
    // Execute query with error handling
    let rows = [];
    try {
      rows = await executeQuery(query, params);
      console.log("✅ API: Query executed successfully");
      
      // ✅ Ensure rows is an array
      if (!Array.isArray(rows)) {
        console.error("❌ API: Query did not return an array:", typeof rows);
        rows = [];
      }
      
      console.log("✅ API: Found requests:", rows.length);
    } catch (queryError) {
      console.error("❌ API: Query execution error:", queryError);
      console.error("❌ API: Error message:", queryError.message);
      console.error("❌ API: Error stack:", queryError.stack);
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Database error: ${queryError.message}`, 
          requests: [],
          error: queryError.message
        }, 
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      requests: rows || [],
      count: rows?.length || 0 
    });
    
  } catch (error) {
    console.error("❌ GET API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message, 
        requests: [] 
      }, 
      { status: 500 }
    );
  }
}