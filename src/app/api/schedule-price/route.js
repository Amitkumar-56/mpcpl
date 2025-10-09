//src/app/api/schedule-price/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET: Fetch setup data or scheduled prices
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const customerIds = url.searchParams.get('customer_ids');
    const date = url.searchParams.get('date');
    
    if (customerIds) {
      const customerIdArray = customerIds.split(',').map(id => parseInt(id));
      const placeholders = customerIdArray.map(() => '?').join(',');
      
      let query = `
        SELECT 
          dp.*,
          s.station_name,
          pc.pcode as product_code,
          p.pname as product_name,
          c.name as customer_name,
          c.id as customer_id
        FROM deal_price dp
        LEFT JOIN filling_stations s ON dp.station_id = s.id
        LEFT JOIN product_codes pc ON dp.sub_product_id = pc.id
        LEFT JOIN products p ON pc.product_id = p.id
        LEFT JOIN customers c ON dp.com_id = c.id
        WHERE dp.com_id IN (${placeholders})
      `;
      
      const params = [...customerIdArray];
      
      if (date) {
        query += ` AND dp.Schedule_Date = ? AND dp.is_active = 1`;
        params.push(date);
      }
      
      query += ` ORDER BY c.name, dp.Schedule_Date DESC, dp.Schedule_Time DESC`;
      
      const scheduledPrices = await executeQuery(query, params);
      return NextResponse.json(scheduledPrices);
    } else {
      // Fetch all setup data
      const products = await executeQuery(`
        SELECT 
          pc.id AS code_id, 
          p.id AS product_id, 
          p.pname AS product_name, 
          pc.pcode
        FROM products p
        JOIN product_codes pc ON p.id = pc.product_id
        ORDER BY p.id, pc.id
      `);

      const stations = await executeQuery(`
        SELECT id, station_name FROM filling_stations
        WHERE status = 1
        ORDER BY id
      `);

      const customers = await executeQuery(`
        SELECT id, name FROM customers
        WHERE status = 1
        ORDER BY name
      `);

      return NextResponse.json({
        success: true,
        products,
        stations,
        customers
      });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// POST: Handle price scheduling
export async function POST(req) {
  try {
    const body = await req.json();
    const { customerIds, updates, requireApproval = true } = body;

    if (!customerIds || !customerIds.length) {
      return NextResponse.json({ success: false, message: "Customer IDs are required" }, { status: 400 });
    }

    if (!updates || updates.length === 0) {
      return NextResponse.json({ success: false, message: "No updates provided" }, { status: 400 });
    }

    let totalInserted = 0;
    let totalUpdated = 0;

    for (const customerId of customerIds) {
      for (const u of updates) {
        // Check if record already exists for same schedule
        const existingRecord = await executeQuery(
          `SELECT id, is_applied FROM deal_price 
           WHERE com_id = ? AND station_id = ? AND sub_product_id = ? 
           AND Schedule_Date = ? AND Schedule_Time = ? AND is_active = 1`,
          [customerId, u.station_id, u.sub_product_id, u.schedule_date, u.schedule_time]
        );

        if (existingRecord.length > 0) {
          const record = existingRecord[0];
          
          if (record.is_applied) {
            // If already applied, create new record
            await executeQuery(`
              INSERT INTO deal_price 
              (com_id, station_id, product_id, sub_product_id, price, 
               Schedule_Date, Schedule_Time, updated_date, is_active, status, applied_at, is_applied)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 1, 'scheduled', NULL, ?)
            `, [
              customerId,
              u.station_id,
              u.product_id,
              u.sub_product_id,
              u.price,
              u.schedule_date,
              u.schedule_time,
              requireApproval ? 0 : 1
            ]);
            totalInserted++;
          } else {
            // UPDATE pending record
            await executeQuery(`
              UPDATE deal_price 
              SET price = ?, updated_date = CURDATE()
              WHERE id = ?
            `, [u.price, record.id]);
            totalUpdated++;
          }
        } else {
          // INSERT new record
          await executeQuery(`
            INSERT INTO deal_price 
            (com_id, station_id, product_id, sub_product_id, price, 
             Schedule_Date, Schedule_Time, updated_date, is_active, status, applied_at, is_applied)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), 1, 'scheduled', NULL, ?)
          `, [
            customerId,
            u.station_id,
            u.product_id,
            u.sub_product_id,
            u.price,
            u.schedule_date,
            u.schedule_time,
            requireApproval ? 0 : 1
          ]);
          totalInserted++;
        }
      }
    }

    const approvalStatus = requireApproval ? " (Pending Approval)" : " (Auto-Applied)";
    
    return NextResponse.json({ 
      success: true, 
      totalInserted,
      totalUpdated,
      requireApproval,
      message: `Success: ${totalInserted} inserted, ${totalUpdated} updated${approvalStatus}`
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PUT: Apply scheduled prices
export async function PUT(req) {
  try {
    const body = await req.json();
    const { priceIds } = body;

    if (!priceIds || !priceIds.length) {
      return NextResponse.json({ success: false, message: "Price IDs are required" }, { status: 400 });
    }

    const placeholders = priceIds.map(() => '?').join(',');
    const now = new Date();
    
    const result = await executeQuery(`
      UPDATE deal_price 
      SET is_applied = 1, status = 'active', applied_at = ?
      WHERE id IN (${placeholders}) AND is_applied = 0
    `, [now, ...priceIds]);

    return NextResponse.json({ 
      success: true, 
      message: `Successfully applied ${result.affectedRows} price schedules` 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// PATCH: Auto-update price status based on schedule
export async function PATCH(req) {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    
    // Activate scheduled prices whose time has come
    const activated = await executeQuery(`
      UPDATE deal_price 
      SET status = 'active', is_applied = 1, applied_at = ?
      WHERE Schedule_Date = ? AND Schedule_Time <= ? 
      AND status = 'scheduled' AND is_applied = 0
      AND is_active = 1
    `, [now, currentDate, currentTime]);
    
    // Expire old prices (previous day prices)
    const expired = await executeQuery(`
      UPDATE deal_price 
      SET status = 'expired'
      WHERE Schedule_Date < ? 
      AND status = 'active' 
      AND is_active = 1
    `, [currentDate]);

    return NextResponse.json({ 
      success: true, 
      activated: activated.affectedRows,
      expired: expired.affectedRows,
      message: `Auto-updated: ${activated.affectedRows} activated, ${expired.affectedRows} expired` 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE: Remove scheduled price
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const priceId = url.searchParams.get('price_id');
    
    if (!priceId) {
      return NextResponse.json({ success: false, message: "Price ID is required" }, { status: 400 });
    }

    await executeQuery(`
      UPDATE deal_price SET is_active = 0 WHERE id = ?
    `, [priceId]);

    return NextResponse.json({ 
      success: true, 
      message: 'Price schedule deleted successfully' 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}