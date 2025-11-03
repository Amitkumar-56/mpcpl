// src/app/api/customers/add/route.js
import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const client_name = formData.get("client_name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const password = crypto.createHash("sha256").update(formData.get("password")).digest("hex");
    const role = formData.get("role");
    const billing_type = formData.get("billing_type");
    const client_type = formData.get("client_type");

    // Address & GST details
    const address = formData.get("address") || "";
    const city = formData.get("city") || "";
    const region = formData.get("region") || "";
    const country = formData.get("country") || "";
    const postbox = formData.get("postbox") || "";
    const gst_name = formData.get("gst_name") || "";
    const gst_number = formData.get("gst_number") || "";

    // Handle multiple product IDs and locations
    const productsArray = formData.getAll("products[]");
    const product = productsArray.length > 0 ? productsArray.join(",") : ""; 
    const blocklocationsArray = formData.getAll("block_location[]");
    const blocklocation = blocklocationsArray.length > 0 ? blocklocationsArray.join(",") : "";
    
    // Handle Conditional Fields
    const day_limit = client_type === "3" ? parseInt(formData.get("day_limit")) : 0;
    const amtlimit = client_type === "2" ? parseFloat(formData.get("amtlimit")) : 0.00;
    
    const auth_token = crypto.randomBytes(32).toString("hex");

    // Insert into customers table
    const insertCustomerQuery = `
      INSERT INTO customers
        (name, phone, email, password, roleid, billing_type,
         address, city, region, country, postbox,
         gst_name, gst_number, product, blocklocation,
         day_limit, auth_token, status, amtlimit, client_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `;

    const result = await executeQuery(insertCustomerQuery, [
      client_name, phone, email, password, role, billing_type,
      address, city, region, country, postbox, 
      gst_name, gst_number, product, blocklocation,
      day_limit, auth_token, amtlimit, client_type
    ]);

    const newCustomerId = result.insertId;

    // For day limit clients: set day_limit and calculate expiry
    let day_limit_expiry = null;
    if (client_type === "3" && day_limit > 0) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + day_limit);
      expiryDate.setHours(23, 59, 59, 999);
      day_limit_expiry = expiryDate.toISOString().slice(0, 19).replace('T', ' ');
    }

    // Insert into customer_balances
    const insertBalanceQuery = `
      INSERT INTO customer_balances
        (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit, day_amount, day_limit_expiry, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const balance_amtlimit = client_type === "2" ? amtlimit : 0.00;
    const balance_day_limit = client_type === "3" ? day_limit : 0;
    const initial_day_amount = 0.00;
    const is_active = 1;

    await executeQuery(insertBalanceQuery, [
      0.00, 0.00, balance_amtlimit, balance_amtlimit,
      newCustomerId, balance_day_limit, initial_day_amount, 
      day_limit_expiry, is_active
    ]);

    return NextResponse.json({ 
      success: true, 
      message: "Customer added successfully",
      customer_id: newCustomerId,
      client_type: client_type
    });
  } catch (error) {
    console.error("❌ Error inserting customer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}