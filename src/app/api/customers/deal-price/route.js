import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json();
    const { priceUpdates } = body;

    if (!priceUpdates || !priceUpdates.length) {
      return NextResponse.json({ success: false, message: "No price updates provided" }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;

    for (const update of priceUpdates) {
      const { type, data } = update;
      const { com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time } = data;

      if (!com_id || !station_id || !product_id || !sub_product_id || price === undefined) continue;

      if (type === "INSERT") {
        await executeQuery(
          `INSERT INTO deal_price 
           (com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time, updated_date, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 1)`,
          [com_id, station_id, product_id, sub_product_id, price, Schedule_Date, Schedule_Time]
        );
        inserted++;
      } else if (type === "UPDATE") {
        const result = await executeQuery(
          `UPDATE deal_price 
           SET price=?, Schedule_Date=?, Schedule_Time=?, updated_date=NOW()
           WHERE com_id=? AND station_id=? AND product_id=? AND sub_product_id=?`,
          [price, Schedule_Date, Schedule_Time, com_id, station_id, product_id, sub_product_id]
        );
        if (result.affectedRows > 0) updated++;
      }
    }

    // Get current user for audit log
    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || currentUser?.id || null;
      const empResult = await executeQuery(
        `SELECT name FROM employee_profile WHERE id = ?`,
        [userId]
      );
      if (empResult.length > 0 && empResult[0].name) {
        userName = empResult[0].name;
      }
    } catch (authError) {
      console.warn('Auth check failed:', authError.message);
    }

    // Create audit log for each update
    try {
      for (const update of priceUpdates) {
        const { type, data } = update;
        const { com_id, station_id, product_id, sub_product_id, price } = data;

        // Get customer, station, and product names
        const customerInfo = await executeQuery(`SELECT name FROM customers WHERE id = ?`, [com_id]);
        const stationInfo = await executeQuery(`SELECT station_name FROM filling_stations WHERE id = ?`, [station_id]);
        const productInfo = await executeQuery(`SELECT pname FROM products WHERE id = ?`, [product_id]);
        const subProductInfo = await executeQuery(`SELECT pcode FROM product_codes WHERE id = ?`, [sub_product_id]);

        const customerName = customerInfo.length > 0 ? customerInfo[0].name : `Customer ID: ${com_id}`;
        const stationName = stationInfo.length > 0 ? stationInfo[0].station_name : `Station ID: ${station_id}`;
        const productName = productInfo.length > 0 ? productInfo[0].pname : `Product ID: ${product_id}`;
        const subProductName = subProductInfo.length > 0 ? subProductInfo[0].pcode : `Sub-Product ID: ${sub_product_id}`;

        await createAuditLog({
          page: 'Customer Management',
          uniqueCode: `DEAL-PRICE-${com_id}-${station_id}-${product_id}-${sub_product_id}`,
          section: 'Deal Price',
          userId: userId,
          userName: userName || (userId ? `Employee ID: ${userId}` : null),
          action: type === "INSERT" ? 'add' : 'edit',
          remarks: `Deal price ${type === "INSERT" ? 'created' : 'updated'} for ${customerName} at ${stationName}: ${productName} - ${subProductName} = ₹${price}`,
          oldValue: type === "UPDATE" ? { price: null } : null,
          newValue: { com_id, station_id, product_id, sub_product_id, price },
          recordType: 'deal_price',
          recordId: com_id
        });
      }
    } catch (auditError) {
      console.error('❌ Audit log creation failed (non-critical):', auditError);
    }

    return NextResponse.json({
      success: true,
      message: `Processed successfully: ${inserted} inserted, ${updated} updated`,
      counts: { inserted, updated },
    });
  } catch (error) {
    console.error("Error saving deal prices:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// ✅ GET - Fetch existing prices
export async function GET(req) {
  try {
    const customerId = req.nextUrl.searchParams.get("customer_id");
    if (!customerId) return NextResponse.json([]);

    const data = await executeQuery(
      `SELECT dp.*, 
              p.pname AS product_name, 
              pc.pcode AS sub_product_code, 
              s.station_name
       FROM deal_price dp
       LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
       LEFT JOIN products p ON dp.product_id = p.id
       LEFT JOIN filling_stations s ON dp.station_id = s.id
       WHERE dp.com_id = ? AND dp.is_active = 1`,
      [customerId]
    );

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error fetching prices:", error);
    return NextResponse.json([], { status: 500 });
  }
}