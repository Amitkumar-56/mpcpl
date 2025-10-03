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
    const productsString = products.join(',');
    const blockLocationString = block_location.join(',');
    
    const permissions = JSON.parse(formData.get("permissions") || "{}");

    // Hash password with SHA-256
    let hashedPassword = null;
    if (password) {
      const hash = crypto.createHash("sha256");
      hash.update(password);
      hashedPassword = hash.digest("hex");
    }

    // Insert customer
    const [customerResult] = await db.execute(
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
        blockLocationString
      ]
    );

    const customerId = customerResult.insertId;

    // Insert into customer_balances table with account_id as 0
    await db.execute(
      `INSERT INTO customer_balances 
      (balance, hold_balance, amtlimit, cst_limit, com_id, account_id) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        0.00,    // balance
        0.00,    // hold_balance
        amtlimit, // amtlimit from form
        amtlimit, // cst_limit (same as amtlimit)
        customerId, // com_id (customer id)
        0         // account_id as 0
      ]
    );

    // Insert permissions
    const permValues = [];
    Object.keys(permissions).forEach((module) => {
      permValues.push([
        customerId,
        module,
        permissions[module].can_view ? 1 : 0,
        permissions[module].can_edit ? 1 : 0,
        permissions[module].can_delete ? 1 : 0,
      ]);
    });

    if (permValues.length > 0) {
      await db.query(
        `INSERT INTO customer_permissions (customer_id, module_name, can_view, can_edit, can_delete) VALUES ?`,
        [permValues]
      );
    }

    return NextResponse.json({ 
      message: "Customer added successfully",
      customerId: customerId
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Something went wrong", error }, { status: 500 });
  }
}