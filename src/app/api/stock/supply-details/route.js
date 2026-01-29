import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: Fetch supply details by ID
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { success: false, error: "Invalid ID format" },
        { status: 400 }
      );
    }

    // Fetch stock details
    const stockQuery = `
      SELECT s.*, 
             fs.station_name as fs_name,
             p.pname as product_name,
             t.transporter_name,
             sup.name as supplier_name
      FROM stock s
      LEFT JOIN filling_stations fs ON s.fs_id = fs.id
      LEFT JOIN products p ON s.product_id = p.id
      LEFT JOIN transporters t ON s.transporter_id = t.id
      LEFT JOIN suppliers sup ON s.supplier_id = sup.id
      WHERE s.id = ?
    `;

    const stockResult = await executeQuery(stockQuery, [parseInt(id)]);

    if (!stockResult || stockResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Supply record not found" },
        { status: 404 }
      );
    }

    const supplyDetails = stockResult[0];

    // Fetch payment history
    const paymentQuery = `
      SELECT * FROM update_invoice 
      WHERE supply_id = ? 
      ORDER BY date DESC
    `;

    const paymentHistory = await executeQuery(paymentQuery, [parseInt(id)]);

    // Format dates for display
    const formatDate = (dateString) => {
      if (!dateString) return null;
      const date = new Date(dateString);
      return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    };

    // Prepare response data
    const responseData = {
      ...supplyDetails,
      invoice_date: formatDate(supplyDetails.invoice_date),
      pay_date: formatDate(supplyDetails.pay_date),
      paymentHistory: paymentHistory || [],
    };

    return NextResponse.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error("Error in GET /api/stock/supply-details:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to fetch supply details";
    if (error.message.includes("connect")) {
      errorMessage = "Database connection failed";
    } else if (error.message.includes("ER_NO_SUCH_TABLE")) {
      errorMessage = "Table does not exist";
    }

    return NextResponse.json(
      { success: false, error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}

// POST: Update payment
export async function POST(request) {
  try {
    const body = await request.json();
    const { id, amount, pay_date, remarks, v_invoice } = body;

    // Validate required fields
    if (!id || !amount || !pay_date) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Update stock payment
    const updateStockQuery = `
      UPDATE stock 
      SET payment = payment + ?, 
          payable = payable - ?,
          pay_date = COALESCE(?, pay_date)
      WHERE id = ?
    `;

    const updateResult = await executeQuery(updateStockQuery, [
      amountNum,
      amountNum,
      pay_date,
      parseInt(id),
    ]);

    // Insert payment record
    const insertPaymentQuery = `
      INSERT INTO update_invoice 
      (supply_id, v_invoice, payment, date, remarks, type) 
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    await executeQuery(insertPaymentQuery, [
      parseInt(id),
      v_invoice || null,
      amountNum,
      pay_date,
      remarks || "",
    ]);

    return NextResponse.json({
      success: true,
      message: "Payment updated successfully",
    });

  } catch (error) {
    console.error("Error in POST /api/stock/supply-details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

// PATCH: Update GST status
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, gstr1, gstr3b } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    // Build update query based on provided fields
    const updates = [];
    const params = [];

    if (gstr1 !== undefined) {
      updates.push("gstr1 = ?");
      params.push(gstr1 ? 1 : 0);
    }

    if (gstr3b !== undefined) {
      updates.push("gstr3b = ?");
      params.push(gstr3b ? 1 : 0);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No updates provided" },
        { status: 400 }
      );
    }

    params.push(parseInt(id));

    const updateQuery = `
      UPDATE stock 
      SET ${updates.join(", ")} 
      WHERE id = ?
    `;

    await executeQuery(updateQuery, params);

    return NextResponse.json({
      success: true,
      message: "GST status updated successfully",
    });

  } catch (error) {
    console.error("Error in PATCH /api/stock/supply-details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update GST status" },
      { status: 500 }
    );
  }
}