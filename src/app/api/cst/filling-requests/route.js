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
             fs.station_name,
             c.name AS customer_name
      FROM filling_requests fr
      LEFT JOIN products p ON fr.product = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      WHERE fr.cid = ?
    `;
    
    let params = [cid];
    let conditions = [];

    // Add status filter if provided and not 'All'
    if (status && status !== 'All') {
      conditions.push(`fr.status = ?`);
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