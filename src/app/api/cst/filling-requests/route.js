// src/app/api/cst/filling-requests/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

async function getFuelPrice(station_id, product_id, sub_product_id, com_id, defaultPrice = 0) {
  if (sub_product_id) {
    const exactRows = await executeQuery(
      "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND sub_product_id = ? AND com_id = ? AND is_active = 1 LIMIT 1",
      [station_id, product_id, sub_product_id, com_id]
    );
    if (Array.isArray(exactRows) && exactRows.length > 0) {
      return parseFloat(exactRows[0].price);
    }
  }
  if (sub_product_id) {
    const stationRows = await executeQuery(
      "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND sub_product_id = ? AND is_active = 1 LIMIT 1",
      [station_id, product_id, sub_product_id]
    );
    if (Array.isArray(stationRows) && stationRows.length > 0) {
      return parseFloat(stationRows[0].price);
    }
  }
  const customerRows = await executeQuery(
    "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND com_id = ? AND is_active = 1 LIMIT 1",
    [station_id, product_id, com_id]
  );
  if (Array.isArray(customerRows) && customerRows.length > 0) {
    return parseFloat(customerRows[0].price);
  }
  const productRows = await executeQuery(
    "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND is_active = 1 LIMIT 1",
    [station_id, product_id]
  );
  if (Array.isArray(productRows) && productRows.length > 0) {
    return parseFloat(productRows[0].price);
  }
  return defaultPrice;
}

export async function GET(request) {
  try {
    console.log("🔍 CST API: Fetching filling requests...");
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const cid = searchParams.get('cid'); 
    
    console.log("📊 CST API: Status filter:", status);
    console.log("👤 CST API: Customer ID:", cid); 
    
    // Validate customer ID
    if (!cid) {
      console.log("❌ CST API: Customer ID is missing");
      return NextResponse.json(
        { success: false, message: 'Customer ID is required', requests: [] },
        { status: 400 }
      );
    }

    // ✅ Convert customer ID to integer for proper matching
    const customerIdInt = parseInt(cid, 10);
    if (isNaN(customerIdInt) || customerIdInt <= 0) {
      console.log("❌ CST API: Invalid Customer ID:", cid);
      return NextResponse.json(
        { success: false, message: 'Invalid Customer ID', requests: [] },
        { status: 400 }
      );
    }

    // ✅ First, check if customer exists
    try {
      const customerCheck = await executeQuery(
        'SELECT id, name FROM customers WHERE id = ?',
        [customerIdInt]
      );
      
      if (customerCheck.length === 0) {
        console.log("⚠️ CST API: Customer not found with ID:", customerIdInt);
        return NextResponse.json(
          { success: false, message: 'Customer not found', requests: [] },
          { status: 404 }
        );
      }
      console.log("✅ CST API: Customer found:", customerCheck[0].name);
    } catch (checkError) {
      console.error("⚠️ CST API: Error checking customer:", checkError);
    }

    // Build query based on filters - SIMPLIFIED FOR CST
    let query = `
      SELECT 
        fr.*, 
        p.pname AS product_name, 
        pc.pcode AS product_code,
        pc.product_id AS product_id,
        fs.station_name,
        c.name AS customer_name,
        cb.amtlimit as credit_limit,
        cb.balance,
        cb.day_limit,
        fl_cancelled.cancelled_by_name,
        fl_cancelled.cancelled_date,
        fl_created.created_by_name,
        fl_created.created_date,
        fl_processing.processing_by_name,
        fl_processing.processed_date,
        fl_completed.completed_by_name,
        fl_completed.completed_date
      FROM filling_requests fr
      LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name AS cancelled_by_name,
          fl.cancelled_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.cancelled_by = ep.id
        WHERE fl.cancelled_by IS NOT NULL
      ) fl_cancelled ON fr.rid = fl_cancelled.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          COALESCE(
            CASE WHEN ep.role = 5 THEN 'Admin' ELSE NULL END,
            ep.name,
            c.name,
            CASE 
              WHEN fl.created_by IS NOT NULL AND fl.created_by > 0 
              THEN CONCAT('Employee ID: ', fl.created_by)
              ELSE NULL
            END
          ) as created_by_name,
          fl.created_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.created_by = ep.id
        LEFT JOIN customers c ON fl.created_by = c.id
        WHERE fl.created_by IS NOT NULL
      ) fl_created ON fr.rid = fl_created.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name AS processing_by_name,
          fl.processed_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.processed_by = ep.id
        WHERE fl.processed_by IS NOT NULL
      ) fl_processing ON fr.rid = fl_processing.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name AS completed_by_name,
          fl.completed_date
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.completed_by = ep.id
        WHERE fl.completed_by IS NOT NULL
      ) fl_completed ON fr.rid = fl_completed.request_id
      WHERE fr.cid = ?
    `;
    
    let params = [customerIdInt];
    let conditions = [];

    // Add status filter if provided and not 'All'
    if (status && status !== 'All') {
      conditions.push(`LOWER(fr.status) = ?`);
      params.push(status.toLowerCase());
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ` AND ` + conditions.join(' AND ');
    }
    
    // Add ordering
    query += ` ORDER BY fr.created DESC, fr.id DESC`;

    console.log("📝 CST API: Executing query");
    
    // Execute query with error handling
    let rows = [];
    try {
      rows = await executeQuery(query, params);
      console.log("✅ CST API: Query executed successfully");
      
      // ✅ Ensure rows is an array
      if (!Array.isArray(rows)) {
        console.error("❌ CST API: Query did not return an array:", typeof rows);
        rows = [];
      }
      
      console.log("✅ CST API: Found requests:", rows.length);
      
      // ✅ Process requests WITH eligibility check (Admin वाली तरह)
      const processedRequests = await Promise.all(rows.map(async (request) => {
        const createdName =
          request.created_by_name &&
          typeof request.created_by_name === 'string' &&
          request.created_by_name.toUpperCase() === 'SWIFT'
            ? null
            : request.created_by_name;
        let eligibility = 'N/A';
        let eligibility_reason = '';

        const qty = parseFloat(request.qty) || 0;
        const balance = parseFloat(request.balance) || 0;

        if (request.status === 'Pending' || request.status === 'pending') {
          // Check eligibility based on customer type and limits
          const dayLimit = request.day_limit ? parseInt(request.day_limit) || 0 : 0;
          const amtLimit = request.credit_limit ? parseFloat(request.credit_limit) || 0 : 0;
          const isDayLimitCustomer = dayLimit > 0;
          
          console.log('🔍 Eligibility Check for Request:', {
            requestId: request.rid,
            status: request.status,
            dayLimit,
            amtLimit,
            balance,
            isDayLimitCustomer,
            qty
          });
          
          // For day limit customers, check day limit eligibility
          if (isDayLimitCustomer) {
            // Get unpaid days count for this customer
            try {
              const unpaidDaysQuery = `
                SELECT COUNT(DISTINCT DATE(completed_date)) as unpaid_days
                FROM filling_requests 
                WHERE cid = ? 
                  AND status = 'Completed' 
                  AND payment_status = 0
              `;
              const unpaidDaysResult = await executeQuery(unpaidDaysQuery, [request.cid]);
              const unpaidDays = unpaidDaysResult[0]?.unpaid_days || 0;
              
              console.log('📊 Day Limit Check:', {
                unpaidDays,
                dayLimit
              });
              
              if (unpaidDays >= dayLimit) {
                eligibility = 'No';
                eligibility_reason = `Day limit reached (${unpaidDays}/${dayLimit} days)`;
              } else {
                eligibility = 'Yes';
              }
            } catch (error) {
              console.error('Error checking day limit:', error);
              eligibility = 'Yes'; // Default to Yes if error
            }
          } 
          // For amount limit customers, check against Quantity × Price ≤ Limit
          else if (amtLimit > 0) {
            try {
              const price = await getFuelPrice(request.fs_id, request.product_id, request.sub_product_id, request.cid, 0);
              const totalAmount = (parseFloat(qty) || 0) * (parseFloat(price) || 0);
              if (totalAmount <= amtLimit) {
                eligibility = 'Yes';
              } else {
                eligibility = 'No';
                eligibility_reason = `Insufficient balance (Total: ₹${totalAmount.toFixed(2)}, Limit: ₹${amtLimit.toFixed(2)}, Price: ₹${price.toFixed(2)})`;
              }
            } catch (error) {
              eligibility = 'Yes';
            }
          }
          // No limits set - eligible by default
          else {
            eligibility = 'Yes';
          }
        }

        // Format dates
        const createdDate = new Date(request.created);
        const formattedDate = createdDate.toLocaleDateString('en-GB');
        const formattedTime = createdDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        
        return {
          ...request,
          created_by_name: createdName,
          eligibility,
          eligibility_reason,
          formatted_date: formattedDate,
          formatted_time: formattedTime,
          can_edit: (request.status === 'Pending' || request.status === 'pending') && eligibility === 'Yes'
        };
      }));

      return NextResponse.json({ 
        success: true, 
        requests: processedRequests || [],
        count: processedRequests?.length || 0 
      });
      
    } catch (queryError) {
      console.error("❌ CST API: Query execution error:", queryError);
      console.error("❌ CST API: Error message:", queryError.message);
      
      return NextResponse.json(
        { 
          success: false, 
          message: `Database error: ${queryError.message}`, 
          requests: [],
          error: queryError.message
        }, 
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error("❌ CST API GET error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message, 
        requests: [] 
      }, 
      { status: 500 }
    );
  }
}
