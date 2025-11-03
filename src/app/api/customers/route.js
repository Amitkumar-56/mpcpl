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
        cb.amtlimit,
        cb.balance,
        cb.cst_limit  
      FROM customers c 
      LEFT JOIN customer_balances cb ON c.id = cb.com_id 
      WHERE c.roleid IN (1, 3) 
      ORDER BY c.id DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}