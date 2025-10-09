// src/app/api/customers/valid-products/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await executeQuery(`
      SELECT 
        product_id as id,
        pcode as code,
        product_name as label
      FROM product_codes 
      WHERE is_active = true
    `);

    return NextResponse.json(products);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}