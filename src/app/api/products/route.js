import db from "@/lib/db";
import { NextResponse } from "next/server";

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

// DELETE product and its codes
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Delete product codes first
    await db.query("DELETE FROM product_codes WHERE product_id = ?", [id]);
    // Then delete product
    await db.query("DELETE FROM products WHERE id = ?", [id]);

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
