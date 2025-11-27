// src/app/api/nb-stock/create-nb-expense/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch all non-billing stocks with station and product names
    // Show all records (even if stock is 0 or negative) for dropdown
    const data = await executeQuery(
      `SELECT 
        n.station_id, 
        f.station_name, 
        n.product_id, 
        p.pname, 
        COALESCE(SUM(n.stock), 0) as stock
       FROM non_billing_stocks n
       LEFT JOIN filling_stations f ON n.station_id = f.id
       LEFT JOIN products p ON n.product_id = p.id
       GROUP BY n.station_id, n.product_id, f.station_name, p.pname
       ORDER BY f.station_name, p.pname`
    );
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching non-billing stocks for dropdown:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData();
    
    const payment_date = formData.get('payment_date');
    const title = formData.get('title');
    const reason = formData.get('reason');
    const paid_to = formData.get('paid_to');
    const amount = parseFloat(formData.get('amount'));
    const station_product = formData.get('station_product');
    
    const [station_id, product_id] = station_product.split('-').map(Number);

    // Validation
    if (!payment_date || !title || !paid_to || !amount || !station_id || !product_id) {
      return NextResponse.json(
        { success: false, error: "All required fields must be filled" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Check stock availability
    const stockCheck = await executeQuery(
      `SELECT stock FROM non_billing_stocks 
       WHERE station_id = ? AND product_id = ?`,
      [station_id, product_id]
    );

    if (stockCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "Selected stock item not found" },
        { status: 404 }
      );
    }

    const currentStock = parseFloat(stockCheck[0].stock);
    if (currentStock < amount) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient stock! Available: ${currentStock}, Requested: ${amount}` 
        },
        { status: 400 }
      );
    }

    // Insert expense record
    await executeQuery(
      `INSERT INTO nb_expense 
       (payment_date, title, reason, paid_to, amount, station_id, product_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [payment_date, title, reason, paid_to, amount, station_id, product_id]
    );

    // Update stock
    await executeQuery(
      `UPDATE non_billing_stocks 
       SET stock = stock - ?, updated_at = NOW()
       WHERE station_id = ? AND product_id = ?`,
      [amount, station_id, product_id]
    );

    return NextResponse.json({
      success: true,
      message: "Expense created successfully! Stock has been updated.",
    });

  } catch (err) {
    console.error('Error creating expense:', err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}