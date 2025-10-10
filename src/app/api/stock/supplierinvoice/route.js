import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// Handles GET and POST
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const from_date = url.searchParams.get("from_date");
    const to_date = url.searchParams.get("to_date");

    if (!id) return NextResponse.json({ error: "ID is required." }, { status: 400 });

    let query = `SELECT * FROM stock WHERE supplier_id = ?`;
    const params = [id];

    if (from_date) {
      query += " AND invoice_date >= ?";
      params.push(from_date);
    }
    if (to_date) {
      query += " AND invoice_date <= ?";
      params.push(to_date);
    }

    query += " ORDER BY id DESC";

    const rows = await executeQuery({ query, values: params });

    // Fetch product name and station name for each row
    for (let row of rows) {
      const product = await executeQuery({
        query: "SELECT pname FROM product WHERE id = ?",
        values: [row.product_id],
      });
      row.product_name = product[0]?.pname || "N/A";

      const station = await executeQuery({
        query: "SELECT station_name FROM filling_stations WHERE id = ?",
        values: [row.fs_id],
      });
      row.station_name = station[0]?.station_name || "N/A";
    }

    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { id, amount, pay_date, remarks, v_invoice } = data;

    if (!id || !amount || !pay_date) {
      return NextResponse.json({ error: "All required fields are missing." }, { status: 400 });
    }

    // Update stock
    await executeQuery({
      query: "UPDATE stock SET payment = payment + ?, pay_date = ?, payable = payable - ? WHERE id = ?",
      values: [amount, pay_date, amount, id],
    });

    // Insert into update_invoice
    await executeQuery({
      query: `INSERT INTO update_invoice 
        (supply_id, v_invoice, payment, date, remarks, type) 
        VALUES (?, ?, ?, ?, ?, 1)`,
      values: [id, v_invoice, amount, pay_date, remarks],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
