import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch all product codes for the dropdown
    const rows = await executeQuery(
      "SELECT id, pcode FROM product_codes ORDER BY pcode"
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}