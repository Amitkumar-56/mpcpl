
// src/app/api/asign-tools/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// POST → Assign Toolbox Items
export async function POST(request) {
  try {
    const body = await request.json();
    const { vehicle_no, driver_name, items } = body;

    // ---------- UPDATE DRIVER ----------
    if (driver_name && driver_name !== "") {
      const driver = await executeQuery(
        "SELECT id FROM employee_profile WHERE name = ?",
        [driver_name]
      );

      if (driver.length > 0) {
        const driver_id = driver[0].id;
        await executeQuery(
          "UPDATE vehicles SET driver_id = ? WHERE licence_plate = ?",
          [driver_id, vehicle_no]
        );
      }
    }

    // ---------- ASSIGN ITEMS ----------
    for (const key in items) {
      const item = items[key].name;
      const qty = items[key].qty;
      const status = items[key].status;
      const created_at = new Date();

      // Check if already exists
      const check = await executeQuery(
        "SELECT * FROM toolbox_asign WHERE licence_plate = ? AND item = ?",
        [vehicle_no, item]
      );

      if (check.length > 0) {
        // Update qty
        await executeQuery(
          "UPDATE toolbox_asign SET qty = qty + ?, status = ?, created_at = ? WHERE licence_plate = ? AND item = ?",
          [qty, status, created_at, vehicle_no, item]
        );
      } else {
        // Insert new
        await executeQuery(
          "INSERT INTO toolbox_asign (licence_plate, item, qty, status, created_at) VALUES (?, ?, ?, ?, ?)",
          [vehicle_no, item, qty, status, created_at]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Items assigned successfully",
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
