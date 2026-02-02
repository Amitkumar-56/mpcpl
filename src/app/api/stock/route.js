// src/app/api/stock/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request) {
  try {
    // Get user role to filter delivered items for staff/incharge
    let userRole = null;
    try {
      const currentUser = await getCurrentUser();
      userRole = currentUser?.role || null;
    } catch (err) {
      console.log('Could not get user role, showing all items');
    }

    // Build query with optional filter for staff/incharge (role 1 or 2)
    let query = `
      SELECT 
        s.id,
        s.supplier_id,
        s.product_id,
        s.fs_id,
        s.invoice_number,
        s.invoice_date,
  
        s.density,
        s.kg,
        s.ltr,
        s.tanker_no,
        s.driver_no,
        s.lr_no,
        s.transporter_id,
        s.v_invoice_value,
        s.dncn,
        s.t_dncn,
        s.payable,
        s.t_payable,
        s.payment,
        s.t_payment,
        s.status,
        s.weight_type,
        s.quantity_change_reason,
        s.quantity_changed,
        s.created_at,
        -- Join with suppliers table to get supplier name
        sup.name as supplier_name,
        -- Join with products table to get product name
        p.pname as product_name,
        -- Join with filling_stations table to get station name
        fs.station_name as station_name,
        fs.fl_id,
        fs.fa_id,
        -- Join with transporters table to get transporter name
        t.transporter_name
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      LEFT JOIN transporters t ON s.transporter_id = t.id
      WHERE 1=1
    `;

    // Filter out 'delivered' items for Staff (role 1) or Incharge (role 2)
    // Only show delivered items to higher roles (Admin, Accountant, Team Leader)
    if (userRole === 1 || userRole === 2) {
      query += ` AND (s.status != 'delivered' AND s.status != '3')`;
    }

    query += ` ORDER BY s.id DESC`;

    const stockData = await executeQuery(query);

    // Get total stock history count (count of filling_history)
    let totalStockHistory = 0;
    try {
      const historyResult = await executeQuery('SELECT COUNT(*) as count FROM filling_history');
      totalStockHistory = historyResult[0]?.count || 0;
    } catch (e) {
      console.warn('Failed to count stock history', e);
    }

    // ✅ Handle empty result safely
    if (!stockData || stockData.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        total_stock_history: totalStockHistory,
        message: "No stock data found",
      });
    }

    // ✅ Success response
    return NextResponse.json({
      success: true,
      data: stockData,
      count: stockData.length,
      total_stock_history: totalStockHistory,
    });
  } catch (error) {
    console.error("Error fetching stock data:", error.message, error.stack);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error.message || "Database query failed",
      },
      { status: 500 }
    );
  }
}