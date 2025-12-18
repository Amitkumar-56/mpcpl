import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // Fetch customer with balance info
    const customerRows = await executeQuery(
      `SELECT c.id, c.name, c.phone, c.client_type, cb.day_limit, cb.amtlimit, cb.balance
       FROM customers c
       LEFT JOIN customer_balances cb ON c.id = cb.com_id
       WHERE c.id = ?`,
      [parseInt(id)]
    );

    if (!customerRows || customerRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const customer = customerRows[0];

    // Pending details: unpaid completed requests grouped by day
    const pendingRows = await executeQuery(
      `SELECT 
         DATE(fr.completed_date) AS day_date,
         COUNT(*) AS transaction_count,
         SUM(COALESCE(fr.totalamt, fr.price * fr.aqty)) AS day_total
       FROM filling_requests fr
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
       GROUP BY DATE(fr.completed_date)
       ORDER BY DATE(fr.completed_date) ASC`,
      [parseInt(id)]
    );

    // Total unpaid amount
    const totalUnpaidRows = await executeQuery(
      `SELECT 
         SUM(COALESCE(fr.totalamt, fr.price * fr.aqty)) AS total_amount
       FROM filling_requests fr
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0`,
      [parseInt(id)]
    );

    const totalUnpaid = parseFloat(totalUnpaidRows[0]?.total_amount || 0);

    // Calculate payment days pending based on oldest unpaid completed_date
    let paymentDaysPending = 0;
    const oldestUnpaidRows = await executeQuery(
      `SELECT MIN(DATE(fr.completed_date)) AS oldest_date
       FROM filling_requests fr
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0`,
      [parseInt(id)]
    );
    const oldestDate = oldestUnpaidRows[0]?.oldest_date;
    if (oldestDate) {
      const start = new Date(oldestDate);
      start.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const diffMs = now.getTime() - start.getTime();
      paymentDaysPending = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
      success: true,
      customer,
      pending: {
        total_amount: totalUnpaid,
        payment_days_pending: paymentDaysPending,
        day_wise_breakdown: pendingRows || []
      }
    });
  } catch (error) {
    console.error("Recharge request API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
