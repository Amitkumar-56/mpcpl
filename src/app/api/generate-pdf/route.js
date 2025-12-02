import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    // ✅ FIX: Accept both 'id' and 'request_id' parameters
    const requestId = searchParams.get("request_id") || searchParams.get("id");

    if (!requestId) {
      return NextResponse.json({ 
        success: false,
        error: "Request ID is required" 
      }, { status: 400 });
    }

    // Fetch request data with all necessary details including logs
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
          COALESCE(
            MAX(CASE WHEN c_sub.id IS NOT NULL THEN c_sub.name END),
            MAX(CASE WHEN ep_sub.id IS NOT NULL THEN ep_sub.name END),
            NULL
          ) as created_by_name,
          CASE 
            WHEN MAX(c_sub.id) IS NOT NULL THEN 'customer'
            WHEN MAX(ep_sub.id) IS NOT NULL THEN 'employee'
            ELSE 'unknown'
          END as created_by_type,
          MAX(fl.created_date) as created_date
        FROM filling_logs fl
        LEFT JOIN customers c_sub ON fl.created_by = c_sub.id
        LEFT JOIN employee_profile ep_sub ON fl.created_by = ep_sub.id AND c_sub.id IS NULL
        WHERE fl.created_by IS NOT NULL
        GROUP BY fl.request_id
      ) fl_created ON fr.rid = fl_created.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          MAX(ep.name) as processed_by_name,
          MAX(fl.processed_date) as processed_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.processed_by = ep.id
        WHERE fl.processed_by IS NOT NULL
        GROUP BY fl.request_id
      ) fl_processed ON fr.rid = fl_processed.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          MAX(ep.name) as completed_by_name,
          MAX(fl.completed_date) as completed_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.completed_by = ep.id
        WHERE fl.completed_by IS NOT NULL
        GROUP BY fl.request_id
      ) fl_completed ON fr.rid = fl_completed.request_id
      WHERE fr.id = ?
    `;

    console.log('🔍 Fetching request for PDF with ID:', requestId);
    const requestData = await executeQuery(query, [requestId]);
    console.log('📦 Request data found:', requestData.length > 0);

    if (requestData.length === 0) {
      return NextResponse.json({ 
        success: false,
        error: "Request not found" 
      }, { status: 404 });
    }

    const request = requestData[0];

    // ✅ FIX: Allow PDF generation for all statuses, not just Completed
    // (User requested to show PDF modal for all requests)
    // if (request.status !== "Completed") {
    //   return NextResponse.json({ 
    //     success: false,
    //     error: "PDF can only be generated for completed requests" 
    //   }, { status: 400 });
    // }

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
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        success: false,
        error: "Server error", 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}