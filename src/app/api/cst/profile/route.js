import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customer_id");

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "customer_id is required" },
        { status: 400 }
      );
    }

    const idNum = parseInt(customerId, 10);
    if (isNaN(idNum) || idNum <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid customer_id" },
        { status: 400 }
      );
    }

    const rows = await executeQuery(
      `SELECT id, name, email, phone, status, product, blocklocation, roleid, com_id, client_type, day_limit
       FROM customers 
       WHERE id = ? 
       LIMIT 1`,
      [idNum]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err.message || "Server error" },
      { status: 500 }
    );
  }
}
