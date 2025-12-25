// src/app/api/retailers/add/route.js
import pool from "@/lib/db";
import { writeFile } from "fs/promises";
import path from "path";
import { createAuditLog } from "@/lib/auditLog";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req) {
  try {
    const formData = await req.formData();

    const retailer_name = formData.get("retailer_name");
    const role = formData.get("role");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const password = formData.get("password"); // ⚠️ hash this before production
    const retailer_type = formData.get("retailer_type");
    const credit_limit = formData.get("credit_limit") || 0;

    const permissions = JSON.parse(formData.get("permissions") || "{}");
    const products = formData.getAll("products[]");
    const locations = formData.getAll("block_location[]");

    // Save retailer
    const [result] = await pool.query(
      `INSERT INTO retailers 
       (retailer_name, role, phone, email, password, retailer_type, credit_limit) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [retailer_name, role, phone, email, password, retailer_type, credit_limit]
    );

    const retailerId = result.insertId;

    // Save products
    if (products.length > 0) {
      const productValues = products.map((pid) => [retailerId, pid]);
      await pool.query(
        "INSERT INTO retailer_products (retailer_id, product_id) VALUES ?",
        [productValues]
      );
    }

    // Save locations
    if (locations.length > 0) {
      const locationValues = locations.map((sid) => [retailerId, sid]);
      await pool.query(
        "INSERT INTO retailer_locations (retailer_id, station_id) VALUES ?",
        [locationValues]
      );
    }

    // Save documents (doc1, doc2, doc3)
    for (let i = 1; i <= 3; i++) {
      const file = formData.get(`doc${i}`);
      if (file && typeof file === "object" && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "public", "uploads");
        const filename = `retailer_${retailerId}_doc${i}_${Date.now()}_${file.name}`;
        const filepath = path.join(uploadDir, filename);

        await writeFile(filepath, buffer);

        await pool.query(
          "INSERT INTO retailer_documents (retailer_id, doc_type, file_path) VALUES (?, ?, ?)",
          [retailerId, `doc${i}`, `/uploads/${filename}`]
        );
      }
    }

    // Save permissions
    for (const [module, perms] of Object.entries(permissions)) {
      await pool.query(
        `INSERT INTO retailer_permissions (retailer_id, module_name, can_view, can_edit) 
         VALUES (?, ?, ?, ?)`,
        [retailerId, module, perms.can_view ? 1 : 0, perms.can_edit ? 1 : 0]
      );
    }

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || null;
      userName = currentUser?.userName || null;
      
      if (!userName && userId) {
        const [users] = await pool.query(
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
        page: 'Retailers',
        uniqueCode: retailerId.toString(),
        section: 'Retailer Management',
        userId: userId,
        userName: userName,
        action: 'create',
        remarks: `New retailer created: ${retailer_name} (Type: ${retailer_type}, Credit Limit: ₹${credit_limit})`,
        oldValue: null,
        newValue: {
          retailer_id: retailerId,
          retailer_name,
          role,
          phone,
          email,
          retailer_type,
          credit_limit
        },
        recordType: 'retailer',
        recordId: retailerId
      });
    } catch (auditError) {
      console.error('Error creating audit log:', auditError);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Retailer added successfully!" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Error in /api/retailers/add:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Server error", error: err.message }),
      { status: 500 }
    );
  }
}
