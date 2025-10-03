// src/app/api/cst/filling-requests/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    console.log("API: Fetching filling requests...");
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cid = searchParams.get('cid'); 
    
    console.log("API: Status filter:", status);
    console.log("API: Customer ID filter:", cid); 
    
    // Validate customer ID
    if (!cid) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required', requests: [] },
        { status: 400 }
      );
    }

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

    if (status && status !== 'All') {
      conditions.push(`fr.status = ?`);
      params.push(status.toLowerCase());
    }

    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(' AND ');
    }
    
    query += ` ORDER BY fr.created DESC, fr.id DESC`;

    console.log("API: Executing query:", query);
    console.log("API: Query params:", params);
    
    const rows = await executeQuery(query, params);
    console.log("API: Found rows:", rows.length);

    return NextResponse.json({ success: true, requests: rows });
  } catch (error) {
    console.error("GET API error:", error);
    return NextResponse.json(
      { success: false, message: error.message, requests: [] }, 
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("API: Creating new filling request:", body);
    
    const { product, fs_id, vehicle_number, driver_number, qty, cid } = body;
    
    // Validate required fields
    if (!product || !fs_id || !vehicle_number || !driver_number || !qty || !cid) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }
    
    // Generate unique request ID
    const rid = 'REQ' + Date.now();
    
    const query = `
      INSERT INTO filling_requests (rid, product, fs_id, vehicle_number, driver_number, qty, cid, status, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;
    
    const params = [rid, product, fs_id, vehicle_number, driver_number, qty, cid];
    
    const result = await executeQuery(query, params);
    
    console.log("API: Request created successfully, ID:", result.insertId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Filling request created successfully',
      requestId: result.insertId,
      rid: rid
    });
  } catch (error) {
    console.error("POST API error:", error);
    return NextResponse.json(
      { success: false, message: error.message }, 
      { status: 500 }
    );
  }
}