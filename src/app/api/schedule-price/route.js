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

// POST: Handle price scheduling with bulk update support (only for selected customers)
export async function POST(req) {
  try {
    const body = await req.json();
    const { customerIds, updates, requireApproval = true, bulkUpdateSamePrice = false } = body;

    if (!customerIds || !customerIds.length) {
      return NextResponse.json({ success: false, message: "Customer IDs are required" }, { status: 400 });
    }

    if (!updates || updates.length === 0) {
      return NextResponse.json({ success: false, message: "No updates provided" }, { status: 400 });
    }

    let totalInserted = 0;
    let totalUpdated = 0;
    let bulkUpdated = 0;

    // If bulkUpdateSamePrice is true, update only SELECTED customers with same price
    // This ensures we only update the customers that were explicitly selected
    if (bulkUpdateSamePrice) {
      for (const u of updates) {
        // Find selected customers with same price for this station/product combination
        const placeholders = customerIds.map(() => '?').join(',');
        const samePriceCustomers = await executeQuery(
          `SELECT DISTINCT com_id FROM deal_price 
           WHERE com_id IN (${placeholders})
           AND station_id = ? AND product_id = ? AND sub_product_id = ? 
           AND price = ? AND Schedule_Date = ? AND Schedule_Time = ? 
           AND is_active = 1 AND status = 'scheduled' AND is_applied = 0`,
          [...customerIds, u.station_id, u.product_id, u.sub_product_id, u.price, u.schedule_date, u.schedule_time]
        );

        const customerIdsToUpdate = samePriceCustomers.map(row => row.com_id);
        
        // Update only selected customers with same price
        for (const customerId of customerIdsToUpdate) {
          // Only update if this customer is in the selected list
          if (!customerIds.includes(customerId)) continue;
          
          const existingRecord = await executeQuery(
            `SELECT id, is_applied FROM deal_price 
             WHERE com_id = ? AND station_id = ? AND sub_product_id = ? 
             AND Schedule_Date = ? AND Schedule_Time = ? AND is_active = 1`,
            [customerId, u.station_id, u.sub_product_id, u.schedule_date, u.schedule_time]
          );

          if (existingRecord.length > 0) {
            const record = existingRecord[0];
            if (!record.is_applied) {
              await executeQuery(`
                UPDATE deal_price 
                SET price = ?, updated_date = CURDATE()
                WHERE id = ?
              `, [u.price, record.id]);
              bulkUpdated++;
            }
          }
        }
      }
    }

    // Process updates for selected customers only
    for (const customerId of customerIds) {
      for (const u of updates) {
        // ✅ FIX: Normalize time format (HH:MM -> HH:MM:SS)
        let normalizedTime = u.schedule_time;
        if (normalizedTime && normalizedTime.length === 5 && normalizedTime.indexOf(':') === 2) {
          // Convert HH:MM to HH:MM:SS
          normalizedTime = `${normalizedTime}:00`;
        }
        
        // Check if record already exists for same schedule (date + time)
        const existingRecord = await executeQuery(
          `SELECT id, is_applied FROM deal_price 
           WHERE com_id = ? AND station_id = ? AND sub_product_id = ? 
           AND Schedule_Date = ? AND (Schedule_Time = ? OR Schedule_Time = ?) AND is_active = 1`,
          [customerId, u.station_id, u.sub_product_id, u.schedule_date, u.schedule_time, normalizedTime]
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
              normalizedTime || u.schedule_time,
              requireApproval ? 0 : 1
            ]);
            totalInserted++;
          } else {
            // UPDATE pending record - Update price and ensure Schedule_Date/Time are correct
            await executeQuery(`
              UPDATE deal_price 
              SET price = ?, Schedule_Date = ?, Schedule_Time = ?, updated_date = CURDATE()
              WHERE id = ?
            `, [u.price, u.schedule_date, normalizedTime || u.schedule_time, record.id]);
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
            normalizedTime || u.schedule_time,
            requireApproval ? 0 : 1
          ]);
          totalInserted++;
        }
      }
    }

    // Get user info for audit log
    let userId = null;
    let userName = null;
    try {
      const { cookies } = await import('next/headers');
      const { verifyToken } = await import('@/lib/auth');
      const { createAuditLog } = await import('@/lib/auditLog');
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            userName = users[0].name;
          }
        }
      }

      // Create audit log for schedule price
      await createAuditLog({
        page: 'Schedule Price',
        uniqueCode: `SCHEDULE-${customerIds.join('-')}-${Date.now()}`,
        section: 'Schedule Price',
        userId: userId,
        userName: userName,
        action: 'add',
        remarks: `Price scheduled for ${customerIds.length} customers: ${totalInserted} inserted, ${totalUpdated} updated${bulkUpdated > 0 ? `, ${bulkUpdated} bulk updated` : ''}`,
        oldValue: null,
        newValue: { customerIds, updates, totalInserted, totalUpdated, bulkUpdated, requireApproval },
        recordType: 'schedule_price',
        recordId: null
      });
    } catch (userError) {
      console.error('Error getting user info or creating audit log:', userError);
    }

    const approvalStatus = requireApproval ? " (Pending Approval)" : " (Auto-Applied)";
    const bulkStatus = bulkUpdated > 0 ? `, ${bulkUpdated} bulk updated within selected customers` : "";
    
    return NextResponse.json({ 
      success: true, 
      totalInserted,
      totalUpdated,
      bulkUpdated,
      requireApproval,
      message: `Success: ${totalInserted} inserted, ${totalUpdated} updated${bulkStatus}${approvalStatus}`
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

// PATCH: Auto-update price status based on schedule (Cron job endpoint)
export async function PATCH(req) {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    
    console.log(`🕐 Running scheduled price update at ${currentDate} ${currentTime}`);
    
    // Activate scheduled prices whose time has come (at midnight 12:00 AM)
    // Check for prices scheduled for today at 00:00:00 or earlier
    const activated = await executeQuery(`
      UPDATE deal_price 
      SET status = 'active', is_applied = 1, applied_at = ?, updated_date = CURDATE()
      WHERE Schedule_Date = ? 
      AND (Schedule_Time = '00:00:00' OR Schedule_Time <= ?)
      AND status = 'scheduled' 
      AND is_applied = 0
      AND is_active = 1
    `, [now, currentDate, currentTime]);
    
    console.log(`✅ Activated ${activated.affectedRows} scheduled prices`);
    
    // Deactivate old active prices for the same station/product/customer combination
    // when new scheduled price is activated
    const deactivated = await executeQuery(`
      UPDATE deal_price dp1
      INNER JOIN deal_price dp2 ON 
        dp1.com_id = dp2.com_id 
        AND dp1.station_id = dp2.station_id 
        AND dp1.product_id = dp2.product_id 
        AND dp1.sub_product_id = dp2.sub_product_id
      SET dp1.status = 'expired', dp1.is_active = 0
      WHERE dp2.status = 'active' 
        AND dp2.is_applied = 1
        AND dp2.Schedule_Date = ?
        AND dp1.id != dp2.id
        AND dp1.status = 'active'
        AND dp1.is_active = 1
    `, [currentDate]);
    
    console.log(`🔄 Deactivated ${deactivated.affectedRows} old active prices`);
    
    // Expire old prices (previous day prices that are still active)
    const expired = await executeQuery(`
      UPDATE deal_price 
      SET status = 'expired', is_active = 0
      WHERE Schedule_Date < ? 
      AND status IN ('active', 'scheduled')
      AND is_active = 1
    `, [currentDate]);
    
    console.log(`⏰ Expired ${expired.affectedRows} old prices`);

    return NextResponse.json({ 
      success: true, 
      activated: activated.affectedRows,
      deactivated: deactivated.affectedRows,
      expired: expired.affectedRows,
      message: `Auto-updated: ${activated.affectedRows} activated, ${deactivated.affectedRows} deactivated, ${expired.affectedRows} expired` 
    });
  } catch (err) {
    console.error('❌ Error in scheduled price update:', err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// DELETE: Remove scheduled price
// ✅ DELETE functionality removed - price schedules cannot be deleted