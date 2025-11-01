//src/app/api/customers/add/route.js
import db from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();

    // Extract fields
    const client_name = formData.get("client_name");
    const role = formData.get("role");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const password = formData.get("password");
    const client_type = formData.get("client_type");
    const billing_type = formData.get("billing_type");
    const amtlimit = formData.get("amtlimit") || 0;
    const credit_days = formData.get("credit_days") || 7;
    const address = formData.get("address");
    const city = formData.get("city");
    const region = formData.get("region");
    const country = formData.get("country");
    const zip = formData.get("zip");
    const gst_name = formData.get("gst_name");
    const gst_number = formData.get("gst_number");

    // Extract arrays for products and block_location
    const products = formData.getAll("products[]");
    const block_location = formData.getAll("block_location[]");

    // Convert arrays to comma-separated strings
    const productsString = products.join(",");
    const blockLocationString = block_location.join(",");

    const permissions = JSON.parse(formData.get("permissions") || "{}");

    // Hash password with SHA-256
    let hashedPassword = null;
    if (password) {
      const hash = crypto.createHash("sha256");
      hash.update(password);
      hashedPassword = hash.digest("hex");
    }

    // Insert customer - use basic insert that works with current database structure
    let customerResult;

    // First, let's try the basic insert without credit_days to avoid column issues
    try {
      [customerResult] = await db.execute(
        `INSERT INTO customers 
        (name, phone, email, password, roleid, billing_type, amtlimit, address, city, region, country, postbox, gst_name, gst_number, product, blocklocation) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          client_name,
          phone,
          email,
          hashedPassword,
          role,
          billing_type,
          amtlimit,
          address,
          city,
          region,
          country,
          zip,
          gst_name,
          gst_number,
          productsString,
          blockLocationString,
        ]
      );

      // If we have credit_days and the customer was created successfully, try to update it
      if (credit_days && credit_days !== 7 && customerResult.insertId) {
        try {
          await db.execute(
            `UPDATE customers SET credit_days = ? WHERE id = ?`,
            [credit_days, customerResult.insertId]
          );
        } catch (updateError) {
          console.log(
            "⚠️ Could not update credit_days, column may not exist. Customer created without credit_days."
          );
        }
      }
    } catch (error) {
      console.error("Database insert error:", error);
      throw error;
    }

    const customerId = customerResult.insertId;

    // Insert into customer_balances table - use basic structure that exists
    try {
      // Try basic insert first
      await db.execute(
        `INSERT INTO customer_balances 
        (balance, hold_balance, amtlimit, cst_limit, com_id) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          0.0, // balance
          0.0, // hold_balance
          amtlimit, // amtlimit from form
          amtlimit, // cst_limit (same as amtlimit)
          customerId, // com_id (customer id)
        ]
      );

      // If credit days customer, try to add additional fields
      if (client_type === "3" && credit_days) {
        try {
          const limitExpiry = new Date(
            Date.now() + credit_days * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0];

          await db.execute(
            `UPDATE customer_balances 
             SET validity_days = ?, limit_expiry = ? 
             WHERE com_id = ?`,
            [credit_days, limitExpiry, customerId]
          );
        } catch (updateError) {
          console.log(
            "⚠️ Could not update credit days fields, columns may not exist. Customer created with basic balance record."
          );
        }
      }
    } catch (error) {
      console.error("Customer balances insert error:", error);
      throw error;
    }

    // Insert permissions - handle each one individually to avoid bulk insert issues
    try {
      for (const [module, perms] of Object.entries(permissions)) {
        await db.execute(
          `INSERT INTO customer_permissions (customer_id, module_name, can_view, can_edit, can_delete) VALUES (?, ?, ?, ?, ?)`,
          [
            customerId,
            module,
            perms.can_view ? 1 : 0,
            perms.can_edit ? 1 : 0,
            perms.can_delete ? 1 : 0,
          ]
        );
      }
    } catch (permError) {
      console.log("⚠️ Could not insert permissions:", permError.message);
      // Don't fail the entire customer creation for permissions
    }

    return NextResponse.json({
      message: "Customer added successfully",
      customerId: customerId,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Something went wrong", error },
      { status: 500 }
    );
  }
}
