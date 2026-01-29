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

function getStatusClass(status) {
  switch (status) {
    case 'Pending':
      return "text-yellow-600";
    case 'Cancelled':
      return "text-red-600";
    case 'Processing':
      return "text-blue-600";
    case 'Completed':
      return "text-green-600";
    default:
      return "text-gray-600";
  }
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

      if (!Array.isArray(customerCheck) || customerCheck.length === 0) {
        console.log("⚠️ CST API: Customer not found with ID:", customerIdInt);
        return NextResponse.json(
          { success: false, message: 'Customer not found', requests: [] },
          { status: 404 }
        );
      }
      console.log("✅ CST API: Customer found:", customerCheck[0]?.name);
    } catch (checkError) {
      console.error("⚠️ CST API: Error checking customer:", checkError);
    }

    // Build query based on filters
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
        ep_cancelled.name AS cancelled_by_name,
        fl_cancelled_log.cancelled_date,
        COALESCE(
          CASE WHEN ep_created.role = 5 THEN 'Admin' ELSE NULL END,
          ep_created.name,
          c_created.name,
          CASE 
            WHEN fl_created_log.created_by IS NOT NULL AND fl_created_log.created_by > 0 
            THEN CONCAT('Employee ID: ', fl_created_log.created_by)
            ELSE NULL
          END
        ) as created_by_name,
        fl_created_log.created_date,
        ep_processing.name AS processing_by_name,
        fl_processing_log.processed_date,
        ep_completed.name AS completed_by_name,
        fl_completed_log.completed_date
      FROM filling_requests fr
      LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
      LEFT JOIN customers c ON fr.cid = c.id
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      LEFT JOIN (
        SELECT request_id, MAX(cancelled_date) as cancelled_date, MAX(cancelled_by) as cancelled_by
        FROM filling_logs
        WHERE cancelled_by IS NOT NULL
        GROUP BY request_id
      ) fl_cancelled_log ON fr.rid = fl_cancelled_log.request_id
      LEFT JOIN employee_profile ep_cancelled ON fl_cancelled_log.cancelled_by = ep_cancelled.id
      LEFT JOIN (
        SELECT request_id, MAX(created_date) as created_date, MAX(created_by) as created_by
        FROM filling_logs
        WHERE created_by IS NOT NULL
        GROUP BY request_id
      ) fl_created_log ON fr.rid = fl_created_log.request_id
      LEFT JOIN employee_profile ep_created ON fl_created_log.created_by = ep_created.id
      LEFT JOIN customers c_created ON fl_created_log.created_by = c_created.id
      LEFT JOIN (
        SELECT request_id, MAX(processed_date) as processed_date, MAX(processed_by) as processed_by
        FROM filling_logs
        WHERE processed_by IS NOT NULL
        GROUP BY request_id
      ) fl_processing_log ON fr.rid = fl_processing_log.request_id
      LEFT JOIN employee_profile ep_processing ON fl_processing_log.processed_by = ep_processing.id
      LEFT JOIN (
        SELECT request_id, MAX(completed_date) as completed_date, MAX(completed_by) as completed_by
        FROM filling_logs
        WHERE completed_by IS NOT NULL
        GROUP BY request_id
      ) fl_completed_log ON fr.rid = fl_completed_log.request_id
      LEFT JOIN employee_profile ep_completed ON fl_completed_log.completed_by = ep_completed.id
      WHERE fr.cid = ?
    `;

    let queryParams = [customerIdInt];

    // Add status filter if provided
    if (status) {
      query += " AND fr.status = ?";
      queryParams.push(status);
    }

    // Add ORDER BY to show latest requests first
    query += " ORDER BY fr.rid DESC";

    console.log("📝 CST API: Executing query with params:", queryParams);

    // Execute the main query
    const requests = await executeQuery(query, queryParams);

    if (!Array.isArray(requests)) {
      console.log("⚠️ CST API: No requests found or query returned invalid data");
      return NextResponse.json(
        {
          success: true,
          message: 'No requests found',
          requests: []
        },
        { status: 200 }
      );
    }

    console.log(`✅ CST API: Found ${requests.length} requests`);

    // Calculate eligibility and fetch prices for each request
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        try {
          // Get price for this request
          const price = await getFuelPrice(
            request.fs_id,
            request.product_id,
            request.sub_product_id,
            customerIdInt,
            request.price || 0
          );

          const totalPrice = request.qty * price;
          const isEligible = totalPrice <= (request.credit_limit || 0);

          let imagesObj = {};
          if (request.images) {
            try {
              imagesObj = typeof request.images === 'string' ? JSON.parse(request.images) : request.images;
            } catch { }
          }
          if (!imagesObj.image1 && request.doc1) imagesObj.image1 = request.doc1;
          if (!imagesObj.image2 && request.doc2) imagesObj.image2 = request.doc2;
          if (!imagesObj.image3 && request.doc3) imagesObj.image3 = request.doc3;
          const images = JSON.stringify(imagesObj);

          return {
            ...request,
            price: price,
            totalPrice,
            isEligible,
            eligibility: isEligible ? "Yes" : "No",
            eligibilityClass: isEligible ? "text-green-600" : "text-red-600",
            statusClass: getStatusClass(request.status),
            images
          };
        } catch (priceError) {
          console.error("Error fetching price for request:", request.rid, priceError);
          return {
            ...request,
            price: request.price || 0,
            totalPrice: request.qty * (request.price || 0),
            isEligible: false,
            eligibility: "Error",
            eligibilityClass: "text-red-600",
            statusClass: getStatusClass(request.status),
            images: (() => {
              let imagesObj = {};
              if (request.images) {
                try {
                  imagesObj = typeof request.images === 'string' ? JSON.parse(request.images) : request.images;
                } catch { }
              }
              if (!imagesObj.image1 && request.doc1) imagesObj.image1 = request.doc1;
              if (!imagesObj.image2 && request.doc2) imagesObj.image2 = request.doc2;
              if (!imagesObj.image3 && request.doc3) imagesObj.image3 = request.doc3;
              return JSON.stringify(imagesObj);
            })()
          };
        }
      })
    );

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        message: `Found ${enrichedRequests.length} requests`,
        requests: enrichedRequests
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("❌ CST API GET error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Internal server error',
        requests: []
      },
      { status: 500 }
    );
  }
}
