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

// DELETE product and its codes
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    // Get product details before deletion for audit log
    const [productRows] = await db.query("SELECT pname FROM products WHERE id = ?", [id]);
    const productName = productRows.length > 0 ? productRows[0].pname : 'Unknown';

    // Delete product codes first
    await db.query("DELETE FROM product_codes WHERE product_id = ?", [id]);
    // Then delete product
    await db.query("DELETE FROM products WHERE id = ?", [id]);

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || null;
      userName = currentUser?.userName || null;
      
      if (!userName && userId) {
        const [users] = await db.query(
          `SELECT name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (users.length > 0) {
          userName = users[0].name;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    // Create audit log
    try {
      await createAuditLog({
        page: 'Products Management',
        uniqueCode: `PRODUCT-${id}`,
        section: 'Delete Product',
        userId: userId,
        userName: userName,
        action: 'delete',
        remarks: `Product deleted: ${productName}`,
        oldValue: { id, pname: productName },
        newValue: null,
        recordType: 'product',
        recordId: parseInt(id)
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
