import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    console.log('🚀 API CALL STARTED...');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const recordsPerPage = Math.min(parseInt(searchParams.get('records_per_page')) || 10, 100);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const startDate = searchParams.get('start_date') || '';
    const endDate = searchParams.get('end_date') || '';
    const stationId = searchParams.get('station_id') || '';

    console.log('📊 Filters:', { page, recordsPerPage, status, search, startDate, endDate, stationId });

    // ✅ Get current user info for staff/incharge filtering
    let currentUser = null;
    let userRole = null;
    let userFsId = null;
    try {
      currentUser = await getCurrentUser();
      if (currentUser) {
        userRole = currentUser.role;
        // Get fs_id from employee_profile
        const userResult = await executeQuery(
          'SELECT fs_id FROM employee_profile WHERE id = ?',
          [currentUser.userId]
        );
        if (userResult.length > 0 && userResult[0].fs_id) {
          userFsId = userResult[0].fs_id;
        }
        console.log('✅ User info:', { userId: currentUser.userId, role: userRole, fs_id: userFsId });
      }
    } catch (err) {
      console.log('⚠️ Could not get user info:', err);
    }

    // ✅ FIX: Ensure offset and recordsPerPage are valid integers
    const safePage = parseInt(page) || 1;
    const safeRecordsPerPage = Math.max(1, Math.min(parseInt(recordsPerPage) || 10, 100));
    const offset = Math.max(0, (safePage - 1) * safeRecordsPerPage);

    let query = `
      SELECT 
        fr.*, 
        c.name as customer_name, 
        c.phone as customer_phone,
        fs.station_name as loading_station,
        fs.phone as station_phone,
        fs.map_link as station_map_link,
        fs.address as station_address,
        fs.email as station_email,
        fs.manager as station_manager,
        pc.pcode as product_name,
        COALESCE(
          ep_status.name,
          fl_processing.processing_by_name,
          fl_completed.completed_by_name,
          fl_created.created_by_name,
          NULL
        ) as updated_by_name,
        cb.amtlimit as customer_balance,
        cb.day_limit as customer_day_limit,
        fl_processing.processing_by_name,
        fl_processing.processed_date_formatted,
        fl_completed.completed_by_name,
        fl_completed.completed_date_formatted,
        fl_created.created_by_name as created_by_name,
        fl_created.created_date as created_date,
        fl_created.created_date_formatted as created_date_formatted,
        CASE WHEN fr.created IS NOT NULL THEN DATE_FORMAT(fr.created, '%d/%m/%Y %h:%i %p') ELSE NULL END as created_formatted,
        CASE WHEN fr.completed_date IS NOT NULL THEN DATE_FORMAT(fr.completed_date, '%d/%m/%Y %h:%i %p') ELSE NULL END as completed_date_formatted,
        CASE WHEN fr.created IS NOT NULL THEN DATE_FORMAT(fr.created, '%Y-%m-%d %H:%i:%s') ELSE NULL END as created_ist,
        CASE WHEN fr.completed_date IS NOT NULL THEN DATE_FORMAT(fr.completed_date, '%Y-%m-%d %H:%i:%s') ELSE NULL END as completed_date_ist
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN product_codes pc ON pc.id = fr.sub_product_id
      LEFT JOIN employee_profile ep_status ON ep_status.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name as processing_by_name,
          CASE WHEN fl.processed_date IS NOT NULL THEN DATE_FORMAT(fl.processed_date, '%d/%m/%Y %h:%i %p') ELSE NULL END as processed_date_formatted
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.processed_by = ep.id
        WHERE fl.processed_by IS NOT NULL
        AND fl.id = (
          SELECT fl2.id 
          FROM filling_logs fl2 
          WHERE fl2.request_id = fl.request_id 
          AND fl2.processed_by IS NOT NULL
          ORDER BY fl2.processed_date DESC, fl2.id DESC
          LIMIT 1
        )
      ) fl_processing ON fr.rid = fl_processing.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          ep.name as completed_by_name,
          CASE WHEN fl.completed_date IS NOT NULL THEN DATE_FORMAT(fl.completed_date, '%d/%m/%Y %h:%i %p') ELSE NULL END as completed_date_formatted
        FROM filling_logs fl
        LEFT JOIN employee_profile ep ON fl.completed_by = ep.id
        WHERE fl.completed_by IS NOT NULL
        AND fl.id = (
          SELECT fl2.id 
          FROM filling_logs fl2 
          WHERE fl2.request_id = fl.request_id 
          AND fl2.completed_by IS NOT NULL
          ORDER BY fl2.completed_date DESC, fl2.id DESC
          LIMIT 1
        )
      ) fl_completed ON fr.rid = fl_completed.request_id
      LEFT JOIN (
        SELECT 
          fl.request_id,
          fl.created_by,
          fl.created_date,
          -- ✅ FIX: Check employee_profile FIRST (using JOINs for better performance), then customers
          COALESCE(
            CASE WHEN ep_created.role = 5 THEN 'Admin' ELSE NULL END,
            ep_created.name,
            c_created.name,
            CASE 
              WHEN fl.created_by IS NOT NULL AND fl.created_by > 0 
              THEN CONCAT('Employee ID: ', fl.created_by)
              ELSE NULL
            END
          ) as created_by_name,
          -- ✅ Add formatted date/time
          CASE WHEN fl.created_date IS NOT NULL THEN DATE_FORMAT(fl.created_date, '%d/%m/%Y %h:%i %p') ELSE NULL END as created_date_formatted
        FROM filling_logs fl
        LEFT JOIN employee_profile ep_created ON fl.created_by = ep_created.id
        LEFT JOIN customers c_created ON fl.created_by = c_created.id
        WHERE fl.created_by IS NOT NULL
        AND fl.id = (
          SELECT fl2.id 
          FROM filling_logs fl2 
          WHERE fl2.request_id = fl.request_id 
          AND fl2.created_by IS NOT NULL
          ORDER BY fl2.created_date DESC, fl2.id DESC
          LIMIT 1
        )
      ) fl_created ON fr.rid = fl_created.request_id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    // ✅ For staff (role 1) or incharge (role 2): Filter by assigned station and only show pending
    // ✅ Team Leader (role 3) and above: Multi-branch access (no station filter)
    if ((userRole === 1 || userRole === 2) && userFsId) {
      // Parse fs_id (can be comma-separated like "1,2,3")
      const fsIdArray = String(userFsId).split(',').map(id => id.trim()).filter(id => id && id !== '');
      if (fsIdArray.length > 0) {
        // Use FIND_IN_SET or IN clause for multiple stations
        const placeholders = fsIdArray.map(() => '?').join(',');
        query += ` AND (fr.fs_id IN (${placeholders}))`;
        countQuery += ` AND (fr.fs_id IN (${placeholders}))`;
        params.push(...fsIdArray.map(id => parseInt(id)));
        countParams.push(...fsIdArray.map(id => parseInt(id)));
      }
      
      // ✅ Only show pending requests for staff/incharge (ignore status filter from URL)
      query += ' AND fr.status = ?';
      countQuery += ' AND fr.status = ?';
      params.push('Pending');
      countParams.push('Pending');
    } else if (status) {
      // ✅ Team Leader (role 3) and above: Apply status filter from URL if provided
      query += ' AND fr.status = ?';
      countQuery += ' AND fr.status = ?';
      params.push(status);
      countParams.push(status);
    }
    // ✅ Team Leader (role 3) and above: Can see all stations and all statuses (no filter if no status in URL)

    if (stationId) {
      query += ' AND fr.fs_id = ?';
      countQuery += ' AND fr.fs_id = ?';
      params.push(parseInt(stationId));
      countParams.push(parseInt(stationId));
    }

    if (startDate) {
      query += ' AND DATE(fr.created) >= ?';
      countQuery += ' AND DATE(fr.created) >= ?';
      params.push(startDate);
      countParams.push(startDate);
    }

    if (endDate) {
      query += ' AND DATE(fr.created) <= ?';
      countQuery += ' AND DATE(fr.created) <= ?';
      params.push(endDate);
      countParams.push(endDate);
    }

    if (search) {
      const searchParam = `%${search}%`;
      query += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ? OR pc.pcode LIKE ? OR c.phone LIKE ?)';
      countQuery += ' AND (fr.rid LIKE ? OR fr.vehicle_number LIKE ? OR c.name LIKE ? OR fs.station_name LIKE ? OR pc.pcode LIKE ? OR c.phone LIKE ?)';
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
      countParams.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
    }

    // ✅ FIX: Use sanitized values for LIMIT (MySQL may not support placeholders in LIMIT)
    query += ` ORDER BY fr.id DESC LIMIT ${offset}, ${safeRecordsPerPage}`;


    console.log('📋 Executing queries...');

    // Get total records count
    const countResult = await executeQuery(countQuery, countParams);
    const totalRecords = countResult[0]?.total || 0;

    console.log('📈 Total records found:', totalRecords);

    // Get requests data
    const requests = await executeQuery(query, params);

    console.log('✅ Raw requests from database:', requests?.length || 0);

    let processedRequests = []; // define at the top

    if (requests && requests.length > 0) {
  processedRequests = requests.map((request) => {
    const createdName =
      request.created_by_name &&
      typeof request.created_by_name === 'string' &&
      request.created_by_name.toUpperCase() === 'SWIFT'
        ? null
        : request.created_by_name;
    let eligibility = 'N/A';
    let eligibility_reason = '';

    const qty = parseFloat(request.qty) || 0;
    const balance = parseFloat(request.customer_balance) || 0;

    if (request.status === 'Pending') {
      // Check if customer is day_limit type from customer_balances table (com_id = cid)
      const dayLimit = request.customer_day_limit ? parseInt(request.customer_day_limit) || 0 : 0;
      const isDayLimitCustomer = dayLimit > 0;
      
      // Day limit customers should NOT show "Insufficient Balance" error
      // Only check balance for credit_limit customers (amtlimit customers)
      if (!isDayLimitCustomer && (balance === 0 || balance < qty * 100)) {
        eligibility = 'No';
        eligibility_reason = 'Insufficient Balance';
      } else {
        eligibility = 'Yes';
      }
    }

    return {
      ...request,
      created_by_name: createdName,
      eligibility,
      eligibility_reason
    };
  });
}

    console.log('✅ Processed requests:', processedRequests.length);

    // ✅ Fetch edit logs for all requests
    if (processedRequests.length > 0) {
      try {
        const rids = processedRequests.map(r => r.rid).filter(Boolean);
        console.log('📝 Fetching edit logs for RIDs:', rids.slice(0, 5), '... (total:', rids.length, ')');
        
        if (rids.length > 0) {
          // Also get numeric IDs for matching (in case request_id stores numeric id instead of rid)
          const numericIds = processedRequests.map(r => r.id).filter(Boolean);
          const allIds = [...rids, ...numericIds.map(String)].filter(Boolean);
          
          const placeholders = allIds.map(() => '?').join(',');
          const editLogsQuery = `
            SELECT 
              el.*,
              ep.name as edited_by_name,
              ep.emp_code as edited_by_code
            FROM edit_logs el
            LEFT JOIN employee_profile ep ON el.edited_by = ep.id
            WHERE el.request_id IN (${placeholders})
            ORDER BY el.edited_date DESC
          `;
          console.log('📝 Querying edit logs with IDs:', allIds.slice(0, 10), '... (total:', allIds.length, ')');
          const allEditLogs = await executeQuery(editLogsQuery, allIds);
          
          console.log('📝 Raw edit logs fetched:', allEditLogs.length, 'logs');
          
          // Group edit logs by request_id
          const editLogsByRid = {};
          allEditLogs.forEach(log => {
            const rid = String(log.request_id); // Convert to string for consistency
            if (!editLogsByRid[rid]) {
              editLogsByRid[rid] = [];
            }
            // Parse changes JSON and add edited_by_name from changes if needed
            try {
              if (log.changes && typeof log.changes === 'string') {
                const changes = JSON.parse(log.changes);
                if (!log.edited_by_name && changes.edited_by_name) {
                  log.edited_by_name = changes.edited_by_name;
                  console.log('📝 Using edited_by_name from changes JSON:', changes.edited_by_name);
                }
                if (changes.edited_by_id) {
                  log.edited_by_id = changes.edited_by_id;
                }
              }
            } catch (e) {
              console.warn('⚠️ Could not parse changes JSON for log:', log.id, e.message);
            }
            editLogsByRid[rid].push(log);
          });
          
          console.log('📝 Edit logs grouped by RID:', Object.keys(editLogsByRid).length, 'requests have edit logs');
          const sampleLogs = Object.entries(editLogsByRid).slice(0, 3).map(([rid, logs]) => ({
            rid,
            count: logs.length,
            firstLog: logs[0] ? {
              id: logs[0].id,
              edited_by: logs[0].edited_by,
              edited_by_name: logs[0].edited_by_name,
              edited_date: logs[0].edited_date
            } : null
          }));
          console.log('📝 Sample edit logs:', sampleLogs);
          
          // Add edit_logs to each request
          processedRequests = processedRequests.map(request => {
            const rid = String(request.rid); // Convert to string for matching
            const id = String(request.id); // Also check numeric id
            // Match by rid first, then by id (in case request_id stores numeric id)
            const editLogs = editLogsByRid[rid] || editLogsByRid[id] || [];
            
            if (editLogs.length > 0) {
              console.log('✅ Found edit logs for request:', {
                rid: request.rid,
                id: request.id,
                matchedBy: editLogsByRid[rid] ? 'rid' : 'id',
                logCount: editLogs.length
              });
            }
            
            return {
              ...request,
              edit_logs: editLogs
            };
          });
          
          const requestsWithLogs = processedRequests.filter(r => r.edit_logs && r.edit_logs.length > 0).length;
          console.log('✅ Edit logs attached:', requestsWithLogs, 'out of', processedRequests.length, 'requests have edit logs');
        } else {
          console.warn('⚠️ No RIDs found to fetch edit logs');
        }
      } catch (editLogError) {
        console.error('❌ Error fetching edit logs:', editLogError);
        console.error('Error details:', {
          message: editLogError.message,
          sql: editLogError.sql,
          code: editLogError.code
        });
        // Continue without edit logs - set empty array for all requests
        processedRequests = processedRequests.map(request => ({
          ...request,
          edit_logs: []
        }));
      }
    } else {
      console.log('⚠️ No processed requests to fetch edit logs for');
    }

    // Return the full response object that frontend expects
    // const responseData = {
    //   requests: processedRequests,
    //   currentPage: page,
    //   recordsPerPage: recordsPerPage,
    //   totalRecords: totalRecords,
    //   totalPages: Math.ceil(totalRecords / recordsPerPage)
    // };

    const responseData = {
      requests: processedRequests,
      currentPage: safePage,
      recordsPerPage: safeRecordsPerPage,
      totalRecords: totalRecords,
      totalPages: Math.ceil(totalRecords / safeRecordsPerPage)
    };


    console.log('🚀 API CALL COMPLETED.', responseData);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('❌ Database error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      customer, products_codes, station_id, vehicle_no, driver_no, request_type, qty, remarks
    } = body;

    // Validate required fields
    if (!customer || !products_codes || !station_id || !vehicle_no || !driver_no || !qty) {
      return NextResponse.json({ 
        error: "All fields are required" 
      }, { status: 400 });
    }

    if (parseFloat(qty) <= 0) {
      return NextResponse.json({ 
        error: "Quantity must be greater than 0" 
      }, { status: 400 });
    }

    // Generate the next RID
    const ridResult = await executeQuery(
      "SELECT rid FROM filling_requests ORDER BY id DESC LIMIT 1"
    );
    
    let nextRID = "MP000001";
    if (ridResult.length > 0) {
      const lastRID = ridResult[0].rid;
      if (lastRID && lastRID.startsWith('MP')) {
        const lastNumber = parseInt(lastRID.substring(2));
        nextRID = `MP${String(lastNumber + 1).padStart(6, '0')}`;
      }
    }

    // ✅ FIX: Store UTC time in database (MySQL handles timezone, convert on display)
    // ✅ FIX: Get current IST time directly (server timezone should be IST)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    const dayLimitRows = await executeQuery(
      'SELECT day_limit FROM customer_balances WHERE com_id = ?',
      [parseInt(customer)]
    );
    const dayLimitVal = dayLimitRows.length > 0 ? parseInt(dayLimitRows[0].day_limit) || 0 : 0;
    if (dayLimitVal > 0) {
      // For day_limit customers: Check if oldest unpaid day is cleared
      // Get oldest unpaid day's total amount
      const oldestUnpaidDay = await executeQuery(
        `SELECT 
           DATE(completed_date) as day_date,
           SUM(totalamt) as day_total,
           COUNT(*) as transaction_count
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         GROUP BY DATE(completed_date)
         ORDER BY DATE(completed_date) ASC
         LIMIT 1`,
        [parseInt(customer)]
      );
      
      if (oldestUnpaidDay.length > 0 && oldestUnpaidDay[0].day_date) {
        const dayTotal = parseFloat(oldestUnpaidDay[0].day_total) || 0;
        const transactionCount = parseInt(oldestUnpaidDay[0].transaction_count) || 0;
        const dayDate = oldestUnpaidDay[0].day_date;
        
        // Check if this day has unpaid amount - if yes, block new requests
        if (dayTotal > 0 && transactionCount > 0) {
          return NextResponse.json({ 
            error: `Day limit: Please clear the payment for ${dayDate} (₹${dayTotal.toFixed(2)}) before making new requests. Total ${transactionCount} transaction(s) pending for this day.` 
          }, { status: 403 });
        }
      }
      
      // Also check day limit expiry (days elapsed since oldest unpaid transaction)
      const earliestRows = await executeQuery(
        `SELECT completed_date FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         ORDER BY completed_date ASC LIMIT 1`,
        [parseInt(customer)]
      );
      if (earliestRows.length > 0 && earliestRows[0].completed_date) {
        const completed = new Date(earliestRows[0].completed_date);
        const daysUsed = Math.max(0, Math.floor((Date.now() - completed.getTime()) / (1000 * 60 * 60 * 24)));
        if (daysUsed >= dayLimitVal) {
          return NextResponse.json({ 
            error: `Day limit exceeded (${daysUsed}/${dayLimitVal} days). Please pay the oldest day's amount to continue.` 
          }, { status: 403 });
        }
      }
    }

    // Get product name
    const productRow = await executeQuery(
      "SELECT pcode, product_id FROM product_codes WHERE id = ?",
      [products_codes]
    );
    const productName = productRow.length > 0 ? productRow[0].pcode : 'Unknown Product';
    const productId = productRow.length > 0 ? productRow[0].product_id : null;

    // Check customer type from customer_balances table using com_id (same as cid)
    const balanceCheckRows = await executeQuery(
      'SELECT day_limit, amtlimit FROM customer_balances WHERE com_id = ?',
      [parseInt(customer)]
    );
    
    const isDayLimitCustomer = balanceCheckRows.length > 0 && (parseInt(balanceCheckRows[0].day_limit) || 0) > 0;
    
    // Only check balance/amtlimit for credit_limit customers (NOT for day_limit customers)
    if (!isDayLimitCustomer && productId) {
      const clientTypeRows = await executeQuery(
        'SELECT client_type FROM customers WHERE id = ?',
        [parseInt(customer)]
      );
      const clientType = clientTypeRows.length > 0 ? String(clientTypeRows[0].client_type) : '';

      if (clientType === '2') {
        const priceRows = await executeQuery(
          `SELECT price FROM deal_price WHERE com_id = ? AND station_id = ? AND product_id = ? AND is_active = 1 AND status = 'active' ORDER BY updated_date DESC LIMIT 1`,
          [parseInt(customer), parseInt(station_id), productId]
        );
        const price = priceRows.length > 0 ? parseFloat(priceRows[0].price) || 0 : 0;
        const requestedAmount = price * (parseFloat(qty) || 0);
        const amtlimit = balanceCheckRows.length > 0 ? parseFloat(balanceCheckRows[0].amtlimit) || 0 : 0;
        if (requestedAmount > amtlimit) {
          return NextResponse.json({
            error: 'Insufficient credit limit. Please recharge to continue.'
          }, { status: 403 });
        }
      }
    }

    // Insert into filling_requests table
    const result = await executeQuery(
      `INSERT INTO filling_requests (
        rid, fl_id, fs_id, vehicle_number, driver_number, rtype, qty, aqty, 
        created, cid, status, remark, product
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nextRID, parseInt(products_codes), parseInt(station_id),
        vehicle_no, driver_no, request_type, parseFloat(qty), parseFloat(qty),
        currentDate, parseInt(customer), 'Pending', remarks || '', productName
      ]
    );

    if (result.affectedRows > 0) {
      // Create filling_logs entry with created_by
      try {
        // Get user info from cookies
        let userId = null;
        let userName = 'Admin';
        try {
          const cookieStore = await cookies();
          const token = cookieStore.get('token')?.value;
          if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
              userId = decoded.userId || decoded.id;
              const userResult = await executeQuery(
                'SELECT name FROM employee_profile WHERE id = ?',
                [userId]
              );
              if (userResult.length > 0) {
                userName = userResult[0].name || 'Admin';
              } else {
                // Check if it's admin role
                if (decoded.role === 5) {
                  userName = 'Admin';
                }
              }
            }
          }
        } catch (authError) {
          console.error('Error getting user for filling_logs:', authError);
        }

        // Insert into filling_logs with created_by
        await executeQuery(
          `INSERT INTO filling_logs (request_id, created_by, created_date) VALUES (?, ?, ?)`,
          [nextRID, userId || 1, currentDate]
        );
        console.log('✅ Filling logs entry created with created_by:', userId, userName);
      } catch (logError) {
        console.error('⚠️ Error creating filling logs:', logError);
        // Don't fail the request if log creation fails
      }

      // Create Audit Log
      try {
        const { createAuditLog } = await import('@/lib/auditLog');
        await createAuditLog({
          page: 'Filling Requests',
          uniqueCode: nextRID,
          section: 'Request Management',
          userId: userId,
          userName: userName,
          action: 'create',
          remarks: `Filling request created: ${nextRID} for customer ${customer}, product ${productName}, quantity ${qty}L`,
          oldValue: null,
          newValue: {
            rid: nextRID,
            customer_id: customer,
            station_id: station_id,
            product: productName,
            quantity: qty,
            vehicle_number: vehicle_no,
            driver_number: driver_no,
            status: 'Pending'
          },
          recordType: 'filling_request',
          recordId: result.insertId
        });
      } catch (auditError) {
        console.error('Error creating audit log:', auditError);
      }

      return NextResponse.json({ 
        success: true, 
        message: "Request created successfully",
        rid: nextRID 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to create request" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ POST API Error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error.message 
    }, { status: 500 });
  }
}
