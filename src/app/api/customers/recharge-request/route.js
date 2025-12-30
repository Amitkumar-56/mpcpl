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

    // ✅ ADD: Check if day_remaining_amount column exists
    try {
      // Check if column exists
      const columns = await executeQuery(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'customer_balances' 
        AND COLUMN_NAME = 'day_remaining_amount'
      `);
      
      if (columns.length === 0) {
        // Column doesn't exist, add it
        await executeQuery(`
          ALTER TABLE customer_balances 
          ADD COLUMN day_remaining_amount DECIMAL(10,2) DEFAULT 0.00
        `);
        console.log('Added day_remaining_amount column to customer_balances');
      }
    } catch (alterError) {
      // Column might already exist or other error, ignore
      console.log('day_remaining_amount column check:', alterError.message);
    }

    // Fetch customer with balance info
    const customerRows = await executeQuery(
      `SELECT c.id, c.name, c.phone, c.client_type, 
              cb.day_limit, cb.amtlimit, cb.balance, 
              COALESCE(cb.total_day_amount, 0) as total_day_amount, 
              COALESCE(cb.day_remaining_amount, 0) as day_remaining_amount,
              cb.is_active
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

    // ✅ Get individual pending requests with completed_date for day limit calculation
    const pendingRequests = await executeQuery(
      `SELECT 
         fr.id,
         fr.rid,
         fr.vehicle_number,
         fr.completed_date,
         DATE(fr.completed_date) AS day_date,
         COALESCE(fr.totalamt, fr.price * fr.aqty) AS amount,
         fr.aqty,
         fr.price,
         p.pname AS product_name,
         fs.station_name
       FROM filling_requests fr
       LEFT JOIN products p ON fr.product = p.id
       LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
       WHERE fr.cid = ? AND fr.status = 'Completed' AND fr.payment_status = 0
       ORDER BY fr.completed_date ASC`,
      [parseInt(id)]
    );

    // Group by day for day-wise breakdown
    const dayWiseMap = {};
    pendingRequests.forEach(req => {
      const dayDate = req.day_date;
      if (!dayWiseMap[dayDate]) {
        dayWiseMap[dayDate] = {
          day_date: dayDate,
          transaction_count: 0,
          day_total: 0,
          requests: []
        };
      }
      dayWiseMap[dayDate].transaction_count++;
      dayWiseMap[dayDate].day_total += parseFloat(req.amount || 0);
      dayWiseMap[dayDate].requests.push({
        id: req.id,
        rid: req.rid,
        vehicle_number: req.vehicle_number,
        completed_date: req.completed_date,
        amount: parseFloat(req.amount || 0),
        product_name: req.product_name,
        station_name: req.station_name
      });
    });
    
    const pendingRows = Object.values(dayWiseMap).sort((a, b) => 
      new Date(a.day_date) - new Date(b.day_date)
    );

    // Total unpaid amount
    const totalUnpaid = pendingRequests.reduce((sum, req) => sum + parseFloat(req.amount || 0), 0);

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
      customer: {
        ...customer,
        balance: customer.balance || 0,
        total_day_amount: customer.total_day_amount || 0,
        day_remaining_amount: customer.day_remaining_amount || 0 // ✅ NEW: Extra payment amount
      },
      balance: {
        current_balance: customer.balance || 0,
        total_day_amount: customer.total_day_amount || 0,
        day_remaining_amount: customer.day_remaining_amount || 0
      },
      pending: {
        total_amount: totalUnpaid,
        payment_days_pending: paymentDaysPending,
        day_wise_breakdown: pendingRows || [],
        request_count: pendingRequests.length, // Total pending requests
        individual_requests: pendingRequests || [] // Individual requests with details
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
