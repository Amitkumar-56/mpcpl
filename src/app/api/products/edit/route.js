import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

// ----------------- GET PRODUCT -----------------
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const conn = await executeQuery();

    // Fetch product
    const [productRows] = await conn.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );
    if (!productRows.length) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch product codes
    const [codes] = await conn.query(
      "SELECT pcode FROM product_codes WHERE product_id = ?",
      [id]
    );
    const pcodes = codes.map((c) => c.pcode);

    return NextResponse.json({ ...productRows[0], pcodes });
  } catch (err) {
    console.error("GET Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ----------------- UPDATE PRODUCT -----------------
export async function PUT(req) {
  try {
    const body = await req.json();
    const { id, pname, pcodes } = body;

    if (!id || !pname || !Array.isArray(pcodes)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Get user info for audit log
    let userId = null;
    let userName = 'System';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    const conn = await executeQuery();

    // Get old product data for audit log
    const [oldProductRows] = await conn.query(
      "SELECT pname FROM products WHERE id = ?",
      [id]
    );
    const oldPname = oldProductRows.length > 0 ? oldProductRows[0].pname : '';

    const [oldCodes] = await conn.query(
      "SELECT pcode FROM product_codes WHERE product_id = ?",
      [id]
    );
    const oldPcodes = oldCodes.map(c => c.pcode);

    // Update product name
    await conn.query("UPDATE products SET pname = ? WHERE id = ?", [pname, id]);

    // Delete old codes
    await conn.query("DELETE FROM product_codes WHERE product_id = ?", [id]);

    // Insert new codes
    for (const code of pcodes) {
      if (code.trim() !== "") {
        await conn.query(
          "INSERT INTO product_codes (product_id, pcode) VALUES (?, ?)",
          [id, code]
        );
      }
    }

    // Create audit log
    await createAuditLog({
      page: 'Products Management',
      uniqueCode: `PRODUCT-${id}`,
      section: 'Edit Product',
      userId: userId,
      userName: userName,
      action: 'edit',
      remarks: `Product updated: ${oldPname} → ${pname}`,
      oldValue: { pname: oldPname, pcodes: oldPcodes },
      newValue: { pname: pname, pcodes: pcodes },
      fieldName: 'product_details',
      recordType: 'product',
      recordId: parseInt(id)
    });

    return NextResponse.json({ message: "Product updated successfully" });
  } catch (err) {
    console.error("PUT Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
