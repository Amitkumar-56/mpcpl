import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 Fetching stock transfers...");

    // Detect optional tables safely
    let hasProducts = false;
    let hasVehicles = false;
    let hasEmployees = false;
    try {
      const productsTable = await executeQuery("SHOW TABLES LIKE 'products'");
      hasProducts = Array.isArray(productsTable) && productsTable.length > 0;
    } catch {}
    try {
      const vehiclesTable = await executeQuery("SHOW TABLES LIKE 'vehicles'");
      hasVehicles = Array.isArray(vehiclesTable) && vehiclesTable.length > 0;
    } catch {}
    try {
      const employeesTable = await executeQuery("SHOW TABLES LIKE 'employee_profile'");
      hasEmployees = Array.isArray(employeesTable) && employeesTable.length > 0;
    } catch {}

    // Build dynamic SELECT fields and JOINs
    const selectFields = [
      "st.id",
      "st.station_from",
      "st.station_to",
      "st.driver_id",
      "st.vehicle_id",
      "st.transfer_quantity",
      "st.status",
      "st.created_at",
      "st.product",
      "fs_from.station_name as station_from_name",
      "fs_to.station_name as station_to_name",
    ];
    if (hasProducts) {
      selectFields.push("p.pname as product_name");
    } else {
      selectFields.push("NULL as product_name");
    }
    if (hasEmployees) {
      selectFields.push("ep.name as driver_name");
    } else {
      selectFields.push("NULL as driver_name");
    }
    if (hasVehicles) {
      selectFields.push("v.licence_plate as vehicle_no", "v.vehicle_name as vehicle_name");
    } else {
      selectFields.push("NULL as vehicle_no", "NULL as vehicle_name");
    }

    const joins = [
      "LEFT JOIN filling_stations fs_from ON st.station_from = fs_from.id",
      "LEFT JOIN filling_stations fs_to ON st.station_to = fs_to.id",
    ];
    if (hasProducts) {
      joins.push("LEFT JOIN products p ON st.product = p.id");
    }
    if (hasEmployees) {
      joins.push("LEFT JOIN employee_profile ep ON st.driver_id = ep.id");
    }
    if (hasVehicles) {
      joins.push("LEFT JOIN vehicles v ON st.vehicle_id = v.id");
    }

    const query = `
      SELECT 
        ${selectFields.join(",\n        ")}
      FROM stock_transfers st
      ${joins.join("\n      ")}
      ORDER BY st.id DESC
    `;

    const transfers = await executeQuery(query);
    console.log("📊 Transfers fetched:", transfers?.length);

    return NextResponse.json({ transfers: transfers || [] });
  } catch (error) {
    console.error("❌ Error fetching stock transfers:", error);
    // Fallback to minimal query (stations only)
    try {
      const fallbackQuery = `
        SELECT 
          st.id, 
          st.station_from, 
          st.station_to, 
          st.driver_id, 
          st.vehicle_id, 
          st.transfer_quantity, 
          st.status,
          st.created_at,
          st.product,
          fs_from.station_name as station_from_name,
          fs_to.station_name as station_to_name
        FROM stock_transfers st
        LEFT JOIN filling_stations fs_from ON st.station_from = fs_from.id
        LEFT JOIN filling_stations fs_to ON st.station_to = fs_to.id
        ORDER BY st.id DESC
      `;
      const transfers = await executeQuery(fallbackQuery);
      return NextResponse.json({ transfers: transfers || [] });
    } catch (fallbackErr) {
      console.error("❌ Fallback also failed:", fallbackErr);
      return NextResponse.json(
        { error: "Failed to fetch stock transfers: " + fallbackErr.message },
        { status: 500 }
      );
    }
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      station_from,
      station_to,
      driver_id,
      vehicle_id,
      transfer_quantity,
      product,
      status = 1
    } = body;

    const query = `
      INSERT INTO stock_transfers 
      (station_from, station_to, driver_id, vehicle_id, transfer_quantity, product, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const result = await executeQuery(query, [
      station_from,
      station_to,
      driver_id,
      vehicle_id,
      transfer_quantity,
      product,
      status
    ]);

    // Get current user for audit log
    const currentUser = await getCurrentUser();
    const userId = currentUser?.userId || null;
    // Ensure userName is fetched from employee_profile
    let userName = currentUser?.userName;
    if (!userName && currentUser?.userId) {
      const users = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [currentUser.userId]
      );
      if (users.length > 0 && users[0].name) {
        userName = users[0].name;
      }
    }

    // Create audit log
    await createAuditLog({
      page: 'Stock Transfers',
      uniqueCode: `TRANSFER-${result.insertId}`,
      section: 'Stock Transfer',
      userId: userId,
      userName: userName,
      action: 'create',
      remarks: `Stock transfer record created (Quantity: ${transfer_quantity})`,
      oldValue: null,
      newValue: {
        station_from,
        station_to,
        driver_id,
        vehicle_id,
        transfer_quantity,
        product,
        status
      },
      recordType: 'stock_transfer',
      recordId: result.insertId
    });

    return NextResponse.json({ 
      message: "Stock transfer created successfully",
      id: result.insertId 
    });
  } catch (error) {
    console.error("Error creating stock transfer:", error);
    return NextResponse.json(
      { error: "Failed to create stock transfer" },
      { status: 500 }
    );
  }
}
