import db from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";

// GET all products with their codes
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id AS product_id, 
        p.pname, 
        GROUP_CONCAT(pc.pcode) AS codes
      FROM products p
      LEFT JOIN product_codes pc ON p.id = pc.product_id
      GROUP BY p.id, p.pname
      ORDER BY p.id DESC
    `);

    const products = rows.map(row => ({
      id: row.product_id,
      pname: row.pname,
      pcodes: row.codes ? row.codes.split(",") : []
    }));

    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ DELETE functionality removed - products cannot be deleted
