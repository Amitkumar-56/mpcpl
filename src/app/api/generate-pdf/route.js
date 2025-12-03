import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("request_id") || searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ 
        success: false,
        error: "Request ID is required" 
      }, { status: 400 });
    }

    const query = `
      SELECT 
        fr.*,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address,
        fs.station_name as loading_station,
        fs.address as station_address,
        pc.pcode as product_name,
        ep.name as staff_name,
        cb.amtlimit as customer_balance,
        fl_created.created_by_name,
        fl_created.created_by_type,
        fl_created.created_date,
        ep_processed.name as processed_by_name,
        fl_processed.processed_date,
        ep_completed.name as completed_by_name,
        fl_completed.completed_date
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_codes pc ON pc.id = fr.sub_product_id
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      LEFT JOIN (
        SELECT 
          fl.request_id,
          fl.created_by,
          fl.created_date,
          COALESCE(
            (SELECT c.name FROM customers c WHERE c.id = fl.created_by LIMIT 1),
            (SELECT ep.name FROM employee_profile ep WHERE ep.id = fl.created_by LIMIT 1),
            'System'
          ) as created_by_name,
          CASE 
            WHEN EXISTS(SELECT 1 FROM customers c WHERE c.id = fl.created_by) THEN 'customer'
            WHEN EXISTS(SELECT 1 FROM employee_profile ep WHERE ep.id = fl.created_by) THEN 'employee'
            ELSE 'system'
          END as created_by_type
        FROM filling_logs fl
        WHERE fl.created_by IS NOT NULL
        AND fl.id = (
          SELECT fl2.id 
          FROM filling_logs fl2 
          WHERE fl2.request_id = fl.request_id 
          AND fl2.created_by IS NOT NULL
          ORDER BY fl2.created_date DESC, fl2.id DESC
          LIMIT 1
        )
      ) fl_created ON fr.rid = fl_created.request_id
      LEFT JOIN filling_logs fl_processed ON fr.rid = fl_processed.request_id AND fl_processed.processed_by IS NOT NULL
      LEFT JOIN employee_profile ep_processed ON fl_processed.processed_by = ep_processed.id
      LEFT JOIN filling_logs fl_completed ON fr.rid = fl_completed.request_id AND fl_completed.completed_by IS NOT NULL
      LEFT JOIN employee_profile ep_completed ON fl_completed.completed_by = ep_completed.id
      WHERE fr.id = ?
      LIMIT 1
    `;

    console.log('🔍 Fetching request for PDF with ID:', requestId);
    
    let requestData;
    try {
      requestData = await executeQuery(query, [requestId]);
    } catch (queryError) {
      console.error('❌ SQL Query Error:', queryError);
      throw queryError;
    }

    if (requestData.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Request not found" 
      }, { status: 404 });
    }

    const request = requestData[0];

    // Format dates
    const createdDate = request.created ? new Date(request.created).toLocaleString('en-IN') : 'N/A';
    const completedDate = request.completed_date && request.completed_date !== "0000-00-00 00:00:00" 
      ? new Date(request.completed_date).toLocaleString('en-IN') 
      : 'N/A';

    // Return structured data for PDF generation
    return NextResponse.json({
      success: true,
      request: {
        ...request,
        formatted_created: createdDate,
        formatted_completed: completedDate,
        current_date: new Date().toLocaleString('en-IN')
      }
    });

  } catch (error) {
    console.error("❌ PDF Generation API Error:", error);
    
    return NextResponse.json(
      { 
        success: false,
        error: "Server error"
      },
      { status: 500 }
    );
  }
}