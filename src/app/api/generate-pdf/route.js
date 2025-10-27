import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("request_id");

    if (!requestId) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    // Fetch request data with all necessary details
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
        cb.amtlimit as customer_balance
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_codes pc ON pc.id = fr.fl_id
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      WHERE fr.id = ?
    `;

    const requestData = await executeQuery(query, [requestId]);

    if (requestData.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const request = requestData[0];

    // Check if request is completed
    if (request.status !== "Completed") {
      return NextResponse.json({ 
        error: "PDF can only be generated for completed requests" 
      }, { status: 400 });
    }

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
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}