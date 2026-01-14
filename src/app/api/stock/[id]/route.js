import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: "Stock ID is required" },
        { status: 400 }
      );
    }

    console.log("🔍 Fetching stock details for ID:", id);
    console.log("🔍 ID type:", typeof id, "value:", id);

    // First, let's check if any stock records exist
    const checkQuery = "SELECT COUNT(*) as total FROM stock";
    const checkResult = await executeQuery(checkQuery);
    console.log("📊 Total stock records:", checkResult[0]?.total || 0);

    // If no records, create a test record for debugging
    if (checkResult[0]?.total === 0) {
      console.log("⚠️ No stock records found, creating a test record...");
      await executeQuery(`
        INSERT INTO stock (supplier_id, product_id, fs_id, invoice_number, invoice_date, density, kg, ltr, tanker_no, driver_no, lr_no, v_invoice_value, dncn, t_dncn, payable, t_payable, payment, t_payment, status, weight_type, quantity_change_reason, quantity_changed, created_at)
        VALUES (1, 1, 1, 'TEST-001', '2024-01-01', 0.85, 1000, 1176.47, 'TEST-123', 'TEST-456', 'LR-001', 50000, 0, 0, 50000, 50000, 0, 0, '1', 'kg', 'Initial stock', 0, NOW())
      `);
      console.log("✅ Test stock record created");
    }

    // Fetch stock details with joins
    const stockQuery = `
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
        fs.station_name
      FROM stock s
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      WHERE s.id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const stockResult = await executeQuery(stockQuery, [id]);
    console.log("📦 Stock query result:", stockResult);

    if (!stockResult || stockResult.length === 0) {
      // Show available IDs for debugging
      const availableIds = await executeQuery("SELECT id, invoice_number FROM stock ORDER BY id LIMIT 10");
      console.log("📋 Available stock IDs:", availableIds);
      
      return NextResponse.json(
        { 
          error: "Stock record not found",
          available_ids: availableIds,
          requested_id: id
        },
        { status: 404 }
      );
    }

    const stockData = stockResult[0];

    console.log("✅ Stock details found:", stockData.id);

    return NextResponse.json({
      success: true,
      data: stockData
    });

  } catch (error) {
    console.error("❌ Error fetching stock details:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock details: " + error.message },
      { status: 500 }
    );
  }
}
