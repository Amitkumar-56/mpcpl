// app/api/customers/route.js
import { executeQuery } from "@/lib/db"; // your DB helper
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await executeQuery(`
      SELECT 
        id,
        name,
        phone,
        auth_token,
        address,
        city,
        region,
        country,
        postbox,
        email,
        password,
        picture,
        gid,
        billing_type,
        company,
        taxid,
        name_s,
        phone_s,
        email_s,
        address_s,
        city_s,
        region_s,
        country_s,
        postbox_s,
        balance,
        hold_balance,
        amtlimit,
        roleid,
        sp_id,
        com_id,
        subcom_id,
        gst_name,
        gst_number,
        deal_price,
        deal_price1,
        deal_price_urea,
        doc1,
        doc2,
        doc3,
        status,
        product,
        location_id,
        blocklocation,
        device_token
      FROM customers
      ORDER BY id DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}
