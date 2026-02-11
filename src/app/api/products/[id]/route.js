import db from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// GET single product by ID
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Fetch product with codes
    const [rows] = await db.query(`
      SELECT 
        p.id AS product_id, 
        p.pname, 
        GROUP_CONCAT(pc.pcode) AS codes
      FROM products p
      LEFT JOIN product_codes pc ON p.id = pc.product_id
      WHERE p.id = ?
      GROUP BY p.id, p.pname
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = {
      id: rows[0].product_id,
      pname: rows[0].pname,
      pcodes: rows[0].codes ? rows[0].codes.split(",") : []
    };

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT update product by ID
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { pname, pcodes } = body;

    if (!id || !pname || !Array.isArray(pcodes)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Get current user for audit log
    const currentUser = await getCurrentUser();
    
    // Start transaction
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Get old product data for audit
      const [oldProductRows] = await connection.query(
        "SELECT pname FROM products WHERE id = ?",
        [id]
      );
      
      if (oldProductRows.length === 0) {
        await connection.rollback();
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      }

      const [oldCodes] = await connection.query(
        "SELECT pcode FROM product_codes WHERE product_id = ?",
        [id]
      );
      const oldPcodes = oldCodes.map(c => c.pcode);
      const oldPname = oldProductRows[0].pname;

      // Update product name
      await connection.query(
        "UPDATE products SET pname = ? WHERE id = ?",
        [pname, id]
      );

      // Delete old codes
      await connection.query(
        "DELETE FROM product_codes WHERE product_id = ?",
        [id]
      );

      // Insert new codes
      if (pcodes.length > 0) {
        const codeValues = pcodes.filter(code => code.trim() !== '').map(code => [id, code.trim()]);
        if (codeValues.length > 0) {
          await connection.query(
            "INSERT INTO product_codes (product_id, pcode) VALUES ?",
            [codeValues]
          );
        }
      }

      await connection.commit();

      // Create audit log (if audit function exists)
      try {
        const { createAuditLog } = await import("@/lib/auditLog");
        await createAuditLog({
          page: 'Products Management',
          uniqueCode: `PRODUCT-${id}`,
          section: 'Edit Product',
          userId: currentUser?.id || null,
          userName: currentUser?.name || null,
          action: 'edit',
          remarks: `Product updated: ${oldPname} → ${pname}`,
          oldValue: { pname: oldPname, pcodes: oldPcodes },
          newValue: { pname: pname, pcodes: pcodes },
          fieldName: 'product_details',
          recordType: 'product',
          recordId: parseInt(id)
        });
      } catch (auditError) {
        console.error('Audit log error:', auditError);
      }

      return NextResponse.json({ 
        message: "Product updated successfully",
        product: { id, pname, pcodes }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
