// app/api/customers/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await executeQuery(`
      SELECT 
        c.id,
        c.name,
        c.phone,
        c.address,
        c.region,
        c.email,
        c.billing_type,
        c.client_type,
        cb.amtlimit,
        cb.balance,
        cb.cst_limit,
        cb.day_amount,
        cb.total_day_amount,
        cb.day_limit,
        cb.day_limit_expiry,
        cb.is_active
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.roleid IN (1, 3) 
      ORDER BY c.id DESC
    `);

    // Transform the data to match the expected format
    const transformedRows = rows.map(row => ({
      ...row,
      // Ensure all required fields are present
      is_active: row.is_active || 1,
      day_limit: row.day_limit || null,
      day_limit_expiry: row.day_limit_expiry || null,
      day_amount: row.day_amount || 0,
      total_day_amount: row.total_day_amount || 0
    }));

    return NextResponse.json(transformedRows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}