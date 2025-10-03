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
      remarks ,
       products_codes,
              
    } = body;

    // Validate required fields
    if (!customer || !products_codes || !station_id || !vehicle_no || !driver_no || !qty) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

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

    // Insert into filling_requests table
    const result = await executeQuery(
      `INSERT INTO filling_requests (
        rid,  fs_id, vehicle_number, driver_number, rtype, qty, aqty, 
        created, cid, status, remark, product
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
         parseInt(products_codes),           
        ,                        
      ]
    );

    if (result.affectedRows > 0) {
      return NextResponse.json({ 
        success: true, 
        message: "Request created successfully",
        rid: nextRID 
      });
    } else {
      return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
    }

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}