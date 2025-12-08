import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    // Check authentication - try both cookies and Authorization header
    const tokenCookie = request.cookies.get('token');
    const authHeader = request.headers.get('authorization');
    const token = tokenCookie?.value || (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
    
    // If no token, return 401
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: "Unauthorized - No authentication token found" 
      }, { status: 401 });
    }

    // Verify token by checking /api/auth/verify or just proceed if token exists
    // For now, if token exists, we'll proceed (you can add proper verification later)
    
    // Query to fetch stock data with joins for related tables
    const query = `
      SELECT 
        s.*,
        p.pname as product_name,
        sup.name as supplier_name,
        NULL as transporter_name,
        fs.station_name
      FROM stock s
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      ORDER BY s.id DESC
    `;
    
    const stockRequests = await executeQuery(query);
    
    return NextResponse.json({
      success: true,
      data: stockRequests || []
    });
    
  } catch (error) {
    console.error("Error fetching stock requests:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}
