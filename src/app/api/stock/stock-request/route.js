import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const query = `
      SELECT 
        id,
        invoice_number,
        invoice_date,
        transport_number,
        fs_id,
        product_id,
        product_name,
        transporter_id,
        supplier_id,
        tanker_no,
        weight_type,
        kg,
        ltr,
        density,
        driver_no,
        v_invoice_value,
        t_invoice_value,
        dncn,
        t_dncn,
        payable,
        t_payable,
        payment,
        t_payment,
        t_paydate,
        pay_date,
        slip_image,
        status,
        supply_type,
        gstr1,
        gstr3b,
        staff_id
      FROM stock
      ORDER BY id DESC
    `;

    const stockRequests = await executeQuery(query);

    return NextResponse.json({ success: true, data: stockRequests });
  } catch (error) {
    console.error("Error fetching stock requests:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
