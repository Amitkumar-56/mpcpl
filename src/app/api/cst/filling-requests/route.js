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
    
    let params = [cid];
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
    
    // Execute query
    const rows = await executeQuery(query, params);
    console.log("✅ API: Found requests:", rows.length);

    return NextResponse.json({ 
      success: true, 
      requests: rows,
      count: rows.length 
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
