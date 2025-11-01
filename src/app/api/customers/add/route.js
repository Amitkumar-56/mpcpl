import { executeQuery } from "@/lib/db";
import crypto from "crypto";
import { NextResponse } from "next/server";

// Import modules for file handling (You must have these files/folders for file saving to work)

export async function POST(req) {
  try {
    // We must disable automatic body parsing to handle FormData, 
    // but Next.js Route Handlers (App Router) handle this automatically.
    // We can proceed directly with req.formData().
    const formData = await req.formData();

    const client_name = formData.get("client_name");
    const phone = formData.get("phone");
    const email = formData.get("email");
    const password = crypto.createHash("sha256").update(formData.get("password")).digest("hex");
    const role = formData.get("role");
    const billing_type = formData.get("billing_type");
    
    // Get the client type to handle conditional fields
    const client_type = formData.get("client_type");

    // Address & GST details
    const address = formData.get("address") || "";
    const city = formData.get("city") || "";
    const region = formData.get("region") || "";
    const country = formData.get("country") || "";
    const postbox = formData.get("postbox") || ""; // ⬅️ Must match the form name attribute
    const gst_name = formData.get("gst_name") || "";
    const gst_number = formData.get("gst_number") || "";

    // ✅ CORRECTION 1: Handle multiple product IDs (checkboxes)
    const productsArray = formData.getAll("products[]");
    const product = productsArray.length > 0 ? productsArray.join(",") : ""; 

    // ✅ CORRECTION 2: Handle multiple block location IDs (checkboxes)
    const blocklocationsArray = formData.getAll("block_location[]");
    const blocklocation = blocklocationsArray.length > 0 ? blocklocationsArray.join(",") : "";
    
    // ✅ Handle Conditional Fields (amtlimit for Postpaid, day_limit for Day Limit)
    // Note: Database columns are used to store these values directly.
    const day_limit = client_type === "3" ? parseInt(formData.get("day_limit")) : 0;
    const amtlimit = client_type === "2" ? parseFloat(formData.get("amtlimit")) : 0.00;
    
    const auth_token = crypto.randomBytes(32).toString("hex");

    // --- File Handling (Conceptual - you need a storage folder) ---
    const docs = {};
    for (let i = 1; i <= 3; i++) {
        const file = formData.get(`doc${i}`);
        if (file instanceof File && file.size > 0) {
            // NOTE: For a real app, you would save the file to a secure location (e.g., S3 or a specific server folder)
            // For now, we'll simulate saving a path.
            // Replace this with your actual file saving logic (using fs/promises or a service)
            const filePath = `/uploads/customers/${newCustomerId}_doc${i}_${file.name}`;
            
            // Example of saving the file to the local disk (requires 'fs/promises' import)
            // const buffer = Buffer.from(await file.arrayBuffer());
            // await writeFile(path.join(process.cwd(), 'public', filePath), buffer); 
            
            docs[`doc${i}`] = filePath;
        } else {
            docs[`doc${i}`] = "";
        }
    }
    // -------------------------------------------------------------

    // ✅ Insert into `customers` table
    const insertCustomerQuery = `
      INSERT INTO customers
        (name, phone, email, password, roleid, billing_type,
         address, city, region, country, postbox,
         gst_name, gst_number, product, blocklocation,
         day_limit, auth_token, status, amtlimit, doc1, doc2, doc3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `;

    const result = await executeQuery(insertCustomerQuery, [
      client_name,
      phone,
      email,
      password,
      role,
      billing_type,
      address,
      city,
      region,
      country,
      postbox, 
      gst_name,
      gst_number,
      product, // Comma-separated product IDs
      blocklocation, // Comma-separated location IDs
      day_limit,
      auth_token,
      amtlimit, // amtlimit for customers table
      docs.doc1, docs.doc2, docs.doc3 // File paths
    ]);

    const newCustomerId = result.insertId;

    // ✅ CORRECTION 3: Insert into `customer_balances` with correct conditional values
    const insertBalanceQuery = `
      INSERT INTO customer_balances
        (balance, hold_balance, amtlimit, cst_limit, com_id, day_limit) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    // Balance table logic: 
    // amtlimit is used for credit limit (Postpaid/2), day_limit is for day limit client (Day Limit/3)
    const balance_amtlimit = client_type === "2" ? amtlimit : 0.00; 
    const balance_day_limit = client_type === "3" ? day_limit : 0; 
    // The amount the Day Limit Client can use is typically unlimited (0.00) if a daily limit is not set
    // You mentioned "unlimited use", so we keep day_amount and balance to 0.00 initially.

    await executeQuery(insertBalanceQuery, [
      0.00, // balance (initial)
      0.00, // hold_balance (initial)
      balance_amtlimit, // amtlimit (Credit Limit for Postpaid)
      balance_amtlimit,
      newCustomerId, // com_id (customer ID)
      balance_day_limit // day_limit (Days for Day Limit Client)
    ]);

    return NextResponse.json({ success: true, message: "Customer added successfully" });
  } catch (error) {
    console.error("❌ Error inserting customer:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}