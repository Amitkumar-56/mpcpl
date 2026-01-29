// app/api/filling-details-admin/route.js
import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import { mkdir, writeFile } from 'fs/promises';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import path from 'path';

export async function GET(req) {
  try {
    console.log('🚀 /filling-details-admin GET called');

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    console.log('🔹 Received ID:', id);

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    let data;
    try {
      const query = `
        SELECT 
          fr.*,
          p.pname as product_name,
          p.id as product_id,
          fs.station_name,
          c.name as client_name,
          c.phone as client_phone,
          c.billing_type,
          c.client_type,
          cb.id as balance_id,
          cb.balance as used_amount,
          cb.hold_balance,
          cb.amtlimit as raw_available_balance,
          cb.cst_limit as credit_limit,
          cb.com_id,
          cb.last_reset_date,
          cb.created_at,
          cb.updated_at,
          cb.day_limit,
          cb.is_active,
          fss.stock as station_stock,
          pc.pcode as sub_product_code,
          ep_processing.name as processing_by_name,
          ep_completed.name as completed_by_name,
          ep_status.name as status_updated_by_name
        FROM filling_requests fr
        LEFT JOIN products p ON fr.product = p.id
        LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
        LEFT JOIN customers c ON fr.cid = c.id
        LEFT JOIN customer_balances cb ON c.id = cb.com_id
        LEFT JOIN filling_station_stocks fss ON (fr.fs_id = fss.fs_id AND fr.product = fss.product)
        LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
        LEFT JOIN filling_logs fl_processing ON fr.rid = fl_processing.request_id
        LEFT JOIN employee_profile ep_processing ON fl_processing.processed_by = ep_processing.id
        LEFT JOIN filling_logs fl_completed ON fr.rid = fl_completed.request_id
        LEFT JOIN employee_profile ep_completed ON fl_completed.completed_by = ep_completed.id
        LEFT JOIN employee_profile ep_status ON fr.status_updated_by = ep_status.id
        WHERE fr.id = ?
      `;

      console.log('🔍 Executing main query for ID:', id);
      const rows = await executeQuery(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }

      data = rows[0];

      // Calculate available balance
      const rawAvailableBalance = parseFloat(data.raw_available_balance) || 0;
      const holdBalance = parseFloat(data.hold_balance) || 0;
      data.available_balance = rawAvailableBalance + holdBalance;

      // Get available sub-products for this product
      const availableSubProductsQuery = `
        SELECT id, pcode 
        FROM product_codes 
        WHERE product_id = ?
      `;
      const availableSubProducts = await executeQuery(availableSubProductsQuery, [data.product_id]);
      data.available_sub_products = availableSubProducts;

      console.log('📦 Available sub-products:', availableSubProducts);

      // Get price from deal_price table
      let sub_product_id = data.sub_product_id;

      console.log('🔍 Sub-product details:', {
        from_request: data.sub_product_id,
        product_id: data.product_id
      });

      // Get fuel price with proper fallback logic
      data.fuel_price = await getFuelPrice(data.fs_id, data.product_id, sub_product_id, data.cid, 0);

      // Handle null stock
      if (data.station_stock === null || data.station_stock === undefined) {
        const altQuery = `
          SELECT stock as station_stock 
          FROM filling_station_stocks 
          WHERE fs_id = ? AND product = ?
        `;

        const stockRows = await executeQuery(altQuery, [data.fs_id, data.product_id]);
        data.station_stock = stockRows.length > 0 ? stockRows[0].station_stock : 0;
      }

      // Calculate remaining days based on DISTINCT DATES of unpaid completed transactions
      if (data.client_type === "3" && data.day_limit && data.day_limit > 0) {
        // Count distinct dates for unpaid completed requests
        const usedDaysResult = await executeQuery(
          `SELECT COUNT(DISTINCT DATE(completed_date)) as used_days 
            FROM filling_requests 
            WHERE cid = ? AND status = 'Completed' AND payment_status = 0`,
          [data.cid]
        );

        const usedDays = usedDaysResult.length > 0 ? usedDaysResult[0].used_days : 0;

        data.days_elapsed = usedDays;
        data.remaining_days = Math.max(0, data.day_limit - usedDays);
        data.is_overdue = usedDays >= data.day_limit;

        // Get oldest unpaid date for reference
        const oldestUnpaidCompleted = await executeQuery(
          `SELECT completed_date 
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0
           ORDER BY completed_date ASC 
           LIMIT 1`,
          [data.cid]
        );

        if (oldestUnpaidCompleted.length > 0) {
          data.oldest_unpaid_date = oldestUnpaidCompleted[0].completed_date;
        } else {
          data.oldest_unpaid_date = null;
        }

        console.log('📅 Day Limit Calculation (Distinct Dates):', {
          usedDays,
          dayLimit: data.day_limit,
          remainingDays: data.remaining_days,
          isOverdue: data.is_overdue
        });
      } else {
        // For non-day limit customers, no day limit calculation
        data.days_elapsed = 0;
        data.remaining_days = 0;
        data.oldest_unpaid_date = null;
        data.is_overdue = false;
      }

      console.log('✅ Final data prepared:', {
        client_type: data.client_type,
        day_limit: data.day_limit,
        days_elapsed: data.days_elapsed,
        remaining_days: data.remaining_days,
        oldest_unpaid_date: data.oldest_unpaid_date,
        is_day_limit_customer: data.client_type === "3",
        raw_available_balance: data.raw_available_balance,
        hold_balance: data.hold_balance,
        available_balance: data.available_balance,
        credit_limit: data.credit_limit
      });

      // Fetch complete logs from filling_logs table
      const logsQuery = `
        SELECT 
          fl.*,
          COALESCE(
            (SELECT c.name FROM customers c WHERE c.id = fl.created_by LIMIT 1),
            (SELECT ep.name FROM employee_profile ep WHERE ep.id = fl.created_by LIMIT 1),
            'System'
          ) as created_by_name,
          COALESCE(
            (SELECT c.email FROM customers c WHERE c.id = fl.created_by LIMIT 1),
            (SELECT ep.emp_code FROM employee_profile ep WHERE ep.id = fl.created_by LIMIT 1),
            ''
          ) as created_by_code,
          CASE 
            WHEN EXISTS(SELECT 1 FROM customers c WHERE c.id = fl.created_by) THEN 'customer'
            WHEN EXISTS(SELECT 1 FROM employee_profile ep WHERE ep.id = fl.created_by) THEN 'employee'
            ELSE 'system'
          END as created_by_type,
          COALESCE(ep_processed.name, '') as processed_by_name,
          COALESCE(ep_processed.emp_code, '') as processed_by_code,
          COALESCE(ep_completed.name, '') as completed_by_name,
          COALESCE(ep_completed.emp_code, '') as completed_by_code,
          COALESCE(ep_cancelled.name, '') as cancelled_by_name,
          COALESCE(ep_cancelled.emp_code, '') as cancelled_by_code,
          DATE_FORMAT(fl.created_date, '%d/%m/%Y %h:%i %p') as created_date_formatted,
          DATE_FORMAT(fl.processed_date, '%d/%m/%Y %h:%i %p') as processed_date_formatted,
          DATE_FORMAT(fl.completed_date, '%d/%m/%Y %h:%i %p') as completed_date_formatted,
          DATE_FORMAT(fl.cancelled_date, '%d/%m/%Y %h:%i %p') as cancelled_date_formatted
        FROM filling_logs fl
        LEFT JOIN employee_profile ep_processed ON fl.processed_by = ep_processed.id
        LEFT JOIN employee_profile ep_completed ON fl.completed_by = ep_completed.id
        LEFT JOIN employee_profile ep_cancelled ON fl.cancelled_by = ep_cancelled.id
        WHERE fl.request_id = ?
        ORDER BY fl.id DESC
        LIMIT 1
      `;
      const logs = await executeQuery(logsQuery, [data.rid]);
      data.logs = logs.length > 0 ? logs[0] : null;

      if (data.logs && data.logs.created_by_name && data.logs.created_by_name.toUpperCase() === 'SWIFT') {
        data.logs.created_by_name = null;
        data.logs.created_by_code = null;
      }

      if (!data.logs || !data.logs.created_by_name || data.logs.created_by_name === 'System') {
        const fallbackQuery = `
          SELECT 
            fr.cid,
            COALESCE(
              (SELECT c.name FROM customers c WHERE c.id = fr.cid LIMIT 1),
              (SELECT ep.name FROM employee_profile ep WHERE ep.id = fr.cid LIMIT 1),
              'System'
            ) as created_by_name,
            CASE 
              WHEN EXISTS(SELECT 1 FROM customers c WHERE c.id = fr.cid) THEN 'customer'
              WHEN EXISTS(SELECT 1 FROM employee_profile ep WHERE ep.id = fr.cid) THEN 'employee'
              ELSE 'system'
            END as created_by_type
          FROM filling_requests fr
          LEFT JOIN filling_logs fl ON fr.rid = fl.request_id
          LEFT JOIN employee_profile ep ON fl.created_by = ep.id
          WHERE fr.rid = ?
          LIMIT 1
        `;
        const fallbackResult = await executeQuery(fallbackQuery, [data.rid]);
        if (fallbackResult.length > 0 &&
          fallbackResult[0].created_by_name !== 'System' &&
          fallbackResult[0].created_by_name.toUpperCase() !== 'SWIFT') {
          if (!data.logs) {
            data.logs = {};
          }
          data.logs.created_by_name = fallbackResult[0].created_by_name;
          data.logs.created_by_type = fallbackResult[0].created_by_type;
        }
      }

      // Fetch edit logs if table exists
      try {
        const editLogsQuery = `
          SELECT 
            el.*,
            ep.name as edited_by_name
          FROM edit_logs el
          LEFT JOIN employee_profile ep ON el.edited_by = ep.id
          WHERE el.request_id = ?
          ORDER BY el.edited_date DESC
        `;
        const editLogs = await executeQuery(editLogsQuery, [data.rid]);
        data.edit_logs = editLogs || [];
      } catch (editLogError) {
        console.log('⚠️ Edit logs table may not exist, skipping:', editLogError.message);
        data.edit_logs = [];
      }

    } catch (dbErr) {
      console.error('❌ DB error:', dbErr);
      return NextResponse.json({ success: false, error: 'Database error: ' + dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('❌ GET API error:', err);
    return NextResponse.json({ success: false, error: 'Server error: ' + err.message }, { status: 500 });
  }
}

// POST - Update request
export async function POST(request) {
  let userId = 1;

  try {
    console.log('🚀 /filling-details-admin POST called');

    // Get user info from cookies/token
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id || 1;
        }
      }
    } catch (userError) {
      console.error('Error getting user info:', userError);
    }

    const formData = await request.formData();
    console.log('✅ Form data parsed successfully');

    // Extract all fields
    const id = formData.get('id');
    const rid = formData.get('rid');
    const fs_id = formData.get('fs_id');
    const cl_id = formData.get('cl_id');
    const product_id = formData.get('product_id');
    const sub_product_id = formData.get('sub_product_id');
    const billing_type = formData.get('billing_type');
    const oldstock = parseFloat(formData.get('oldstock')) || 0;
    const credit_limit = parseFloat(formData.get('credit_limit')) || 0;
    const available_balance = parseFloat(formData.get('available_balance')) || 0;
    const day_limit = parseFloat(formData.get('day_limit')) || 0;
    const price = parseFloat(formData.get('price')) || 0;
    const aqty = parseFloat(formData.get('aqty')) || 0;
    const status = formData.get('status');
    const remarks = formData.get('remarks');

    console.log('🎯 CRITICAL FIELDS FOR PROCESSING:', {
      id, rid, status, aqty, cl_id
    });

    // Validate required fields
    if (!id || !rid) {
      console.error('❌ Missing required fields');
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    // ✅ Check balance for Completed status
    if (status === 'Completed') {
      const balanceCheck = await checkBalanceLimit(cl_id, aqty, price, fs_id, product_id, sub_product_id);

      if (!balanceCheck.sufficient) {
        return NextResponse.json({
          success: true,
          limitOverdue: true,
          limitTitle: balanceCheck.title || 'Credit Limit Overdue',
          isDayLimitExpired: balanceCheck.isDayLimitExpired || false,
          totalUnpaidAmount: balanceCheck.totalUnpaidAmount || 0,
          message: balanceCheck.message || 'Balance/limit check failed.'
        });
      }
    }

    // Handle file uploads
    let doc1Path = null, doc2Path = null, doc3Path = null;

    const doc1File = formData.get('doc1');
    const doc2File = formData.get('doc2');
    const doc3File = formData.get('doc3');

    console.log('📁 File uploads:', {
      doc1: doc1File ? `${doc1File.name} (${doc1File.size} bytes)` : 'No file',
      doc2: doc2File ? `${doc2File.name} (${doc2File.size} bytes)` : 'No file',
      doc3: doc3File ? `${doc3File.name} (${doc3File.size} bytes)` : 'No file'
    });

    if (doc1File && doc1File.size > 0) {
      doc1Path = await handleFileUpload(doc1File, rid, 'doc1');
    }
    if (doc2File && doc2File.size > 0) {
      doc2Path = await handleFileUpload(doc2File, rid, 'doc2');
    }
    if (doc3File && doc3File.size > 0) {
      doc3Path = await handleFileUpload(doc3File, rid, 'doc3');
    }

    console.log('🔁 Starting database operations...');

    let resultMessage = '';

    // Track edit operation - create edit log entry
    const now = getIndianTime();
    try {
      const oldDataQuery = `SELECT * FROM filling_requests WHERE id = ?`;
      const oldData = await executeQuery(oldDataQuery, [id]);

      if (oldData.length > 0) {
        const oldRecord = oldData[0];
        const editLogQuery = `
          INSERT INTO edit_logs 
          (request_id, edited_by, edited_date, old_status, new_status, old_aqty, new_aqty, changes) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const changes = JSON.stringify({
          status: oldRecord.status !== status ? { from: oldRecord.status, to: status } : null,
          aqty: oldRecord.aqty !== aqty ? { from: oldRecord.aqty, to: aqty } : null,
          remarks: oldRecord.remark !== remarks ? { from: oldRecord.remark, to: remarks } : null
        });
        await executeQuery(editLogQuery, [
          rid,
          userId,
          now,
          oldRecord.status,
          status,
          oldRecord.aqty || 0,
          aqty || 0,
          changes
        ]);
      }
    } catch (editLogError) {
      console.error('⚠️ Error creating edit log (non-critical):', editLogError);
    }

    // First, update or create filling_logs entry
    await updateFillingLogs(rid, status, userId);

    if (status === 'Processing') {
      console.log('🔄 Handling Processing status...');
      resultMessage = await handleProcessingStatus({
        id, rid, cl_id, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id
      });
    } else if (status === 'Completed') {
      console.log('🔄 Handling Completed status...');

      // Get customer type for balance update logic
      const customerTypeResult = await executeQuery(
        'SELECT client_type FROM customers WHERE id = ?',
        [cl_id]
      );

      const isDayLimitCustomer = customerTypeResult.length > 0 && customerTypeResult[0].client_type === "3";

      resultMessage = await handleCompletedStatus({
        id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
        oldstock, credit_limit, available_balance, day_limit,
        price, aqty, doc1Path, doc2Path, doc3Path, remarks, userId,
        isDayLimitCustomer
      });

      try {
        const userRows = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ? LIMIT 1`,
          [userId]
        );
        const userNameForLog = userRows.length > 0 ? userRows[0].name : 'System';
        const oldDataForAudit = await executeQuery(`SELECT aqty, price FROM filling_requests WHERE id = ?`, [id]);
        const oldQty = oldDataForAudit.length > 0 ? parseFloat(oldDataForAudit[0].aqty || 0) : 0;
        const oldPrice = oldDataForAudit.length > 0 ? parseFloat(oldDataForAudit[0].price || 0) : 0;
        const newQty = parseFloat(aqty || 0);
        const newPrice = parseFloat(price || 0);
        const oldAmount = (oldPrice || newPrice) * oldQty;
        const newAmount = newPrice * newQty;
        const deltaQty = newQty - oldQty;
        const deltaAmount = newAmount - oldAmount;
        await createAuditLog({
          page: 'Filling Details Admin',
          uniqueCode: `REQ-EDIT-${rid}`,
          section: 'Edit Completed Request',
          userId: userId,
          userName: userNameForLog,
          action: 'update',
          remarks: `Quantity updated on completed request. ΔQty: ${deltaQty.toFixed(2)}L, ΔAmount: ₹${deltaAmount.toFixed(2)}.`,
          oldValue: { qty: oldQty, amount: oldAmount, price: oldPrice || newPrice },
          newValue: { qty: newQty, amount: newAmount, price: newPrice },
          recordType: 'filling_request',
          recordId: parseInt(id)
        });
      } catch (auditErr) { }
    } else if (status === 'Cancel') {
      console.log('🔄 Handling Cancel status...');
      resultMessage = await handleCancelStatus({
        id, rid, remarks, doc1Path, doc2Path, doc3Path, userId
      });
      try {
        const userRows = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ? LIMIT 1`,
          [userId]
        );
        const userNameForLog = userRows.length > 0 ? userRows[0].name : 'System';
        await createAuditLog({
          page: 'Filling Details Admin',
          uniqueCode: `REQ-${rid}`,
          section: 'Cancel Filling Request',
          userId: userId,
          userName: userNameForLog,
          action: 'cancel',
          remarks: `Request cancelled. Remarks: ${remarks || ''}`,
          oldValue: { id, rid },
          newValue: { status: 'Cancel' },
          recordType: 'filling_request',
          recordId: parseInt(id)
        });
      } catch (auditErr) { }
    } else {
      console.log('🔄 Handling generic status update...');
      resultMessage = await updateFillingRequest({
        id, aqty, status, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id
      });
      try {
        const userRows = await executeQuery(
          `SELECT name FROM employee_profile WHERE id = ? LIMIT 1`,
          [userId]
        );
        const userNameForLog = userRows.length > 0 ? userRows[0].name : 'System';
        const oldDataForAudit = await executeQuery(`SELECT aqty, price FROM filling_requests WHERE id = ?`, [id]);
        const oldQty = oldDataForAudit.length > 0 ? parseFloat(oldDataForAudit[0].aqty || 0) : 0;
        const oldPrice = oldDataForAudit.length > 0 ? parseFloat(oldDataForAudit[0].price || 0) : 0;
        const newQty = parseFloat(aqty || 0);
        const newPrice = parseFloat(price || 0);
        const oldAmount = (oldPrice || newPrice) * oldQty;
        const newAmount = newPrice * newQty;
        const deltaQty = newQty - oldQty;
        const deltaAmount = newAmount - oldAmount;
        await createAuditLog({
          page: 'Filling Details Admin',
          uniqueCode: `REQ-EDIT-${rid}`,
          section: 'Edit Request',
          userId: userId,
          userName: userNameForLog,
          action: 'update',
          remarks: `Request edited. ΔQty: ${deltaQty.toFixed(2)}L, ΔAmount: ₹${deltaAmount.toFixed(2)}.`,
          oldValue: { qty: oldQty, amount: oldAmount, price: oldPrice || newPrice },
          newValue: { qty: newQty, amount: newAmount, price: newPrice },
          recordType: 'filling_request',
          recordId: parseInt(id)
        });
      } catch (auditErr) { }
    }

    console.log('✅ Update successful:', resultMessage);
    return NextResponse.json({
      success: true,
      message: resultMessage,
      status: status
    });

  } catch (error) {
    console.error('❌ POST Error:', error);

    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

async function checkBalanceLimit(cl_id, aqty, defaultPrice, fs_id, product_id, sub_product_id) {
  try {
    console.log('🔍 Checking balance for customer:', cl_id);

    if (!cl_id) {
      return {
        sufficient: false,
        message: 'Customer ID is required'
      };
    }

    const customerQuery = `
      SELECT 
        c.client_type,
        cb.amtlimit as raw_available_balance,
        cb.hold_balance,
        cb.cst_limit as credit_limit,
        cb.day_limit,
        cb.is_active
      FROM customers c
      LEFT JOIN customer_balances cb ON c.id = cb.com_id
      WHERE c.id = ?
    `;

    const customerRows = await executeQuery(customerQuery, [cl_id]);

    if (customerRows.length === 0) {
      return {
        sufficient: false,
        message: 'Customer balance record not found.'
      };
    }

    const customerData = customerRows[0];
    const clientType = customerData.client_type;
    const rawAvailableBalance = parseFloat(customerData.raw_available_balance) || 0;
    const holdBalance = parseFloat(customerData.hold_balance) || 0;
    
    // ✅ Calculate available balance = raw_available_balance + hold_balance
    const availableBalance = rawAvailableBalance + holdBalance;
    
    const creditLimit = parseFloat(customerData.credit_limit) || 0;
    const dayLimit = parseInt(customerData.day_limit) || 0;

    console.log('📊 Customer Balance Details:', {
      client_type: clientType,
      raw_available_balance: rawAvailableBalance,
      hold_balance: holdBalance,
      available_balance: availableBalance,
      credit_limit: creditLimit,
      day_limit: dayLimit,
      is_active: customerData.is_active
    });

    const actualPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, defaultPrice);

    if (actualPrice <= 0) {
      return {
        sufficient: false,
        title: 'Deal Price Alert',
        message: 'Deal price not updated. Please contact Admin to update price then complete.'
      };
    }

    const requestedAmount = actualPrice * aqty;

    console.log('💰 Amount Calculation:', {
      actualPrice,
      aqty,
      requestedAmount
    });

    if (customerData.is_active === 0) {
      return {
        sufficient: false,
        message: 'Your account is inactive. Please contact administrator.'
      };
    }

    if (dayLimit > 0) {
      console.log('📅 Checking day limit for customer...');

      const distinctDaysResult = await executeQuery(
        `SELECT COUNT(DISTINCT DATE(completed_date)) as distinct_days
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0`,
        [cl_id]
      );

      const distinctDays = distinctDaysResult.length > 0 ? parseInt(distinctDaysResult[0].distinct_days) || 0 : 0;

      const todayDateStr = getIndianTime().slice(0, 10);
      const todayCheck = await executeQuery(
        `SELECT 1 FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0 
         AND DATE(completed_date) = ?
         LIMIT 1`,
        [cl_id, todayDateStr]
      );

      const isTodayAlreadyCounted = todayCheck.length > 0;

      let projectedDays = distinctDays;
      if (!isTodayAlreadyCounted) {
        projectedDays += 1;
      }

      console.log('📅 Day Limit Check (Distinct Dates):', {
        distinctDays,
        isTodayAlreadyCounted,
        projectedDays,
        dayLimit,
        isExceeded: projectedDays > dayLimit
      });

      if (projectedDays > dayLimit) {
        console.log('❌ Day limit exceeded based on distinct dates count');

        const totalUnpaidQuery = `
          SELECT SUM(COALESCE(totalamt, price * aqty)) as total_unpaid
          FROM filling_requests 
          WHERE cid = ? AND status = 'Completed' AND payment_status = 0
        `;
        const unpaidResult = await executeQuery(totalUnpaidQuery, [cl_id]);
        const totalUnpaid = unpaidResult.length > 0 ? parseFloat(unpaidResult[0].total_unpaid) || 0 : 0;

        return {
          sufficient: false,
          message: `Day limit exceeded. You have used ${distinctDays} distinct days of credit (limit: ${dayLimit} days). Total unpaid amount: ₹${totalUnpaid.toFixed(2)}. Please clear the payment to continue.`,
          isDayLimitExpired: true,
          totalUnpaidAmount: totalUnpaid
        };
      }
    }

    if (clientType === "1" || clientType === "2") {
      console.log('💰 Customer Type 1/2 - Checking available balance...');

      // Check against available_balance (raw + hold)
      if (availableBalance <= 0 || availableBalance < requestedAmount) {
        return {
          sufficient: false,
          message: `Insufficient balance. Required: ₹${requestedAmount.toFixed(2)}, Available: ₹${availableBalance.toFixed(2)}. Please contact Admin to update your limit.`
        };
      }

      console.log('✅ Customer Type 1/2 - Sufficient available balance');
      return {
        sufficient: true,
        mode: 'credit_limit',
        clientType: clientType
      };
    }

    if (clientType === "3") {
      console.log('✅ Customer Type 3 - Day limit check passed, no balance check');
      return {
        sufficient: true,
        mode: 'day_limit',
        isDayLimitClient: true
      };
    }

    console.log('❌ Unknown customer type:', clientType);
    return {
      sufficient: false,
      message: 'Unknown customer type. Please contact administrator.'
    };

  } catch (error) {
    console.error('❌ Error checking balance limit:', error);
    return {
      sufficient: false,
      message: 'Error checking balance: ' + error.message
    };
  }
}

function getIndianTime() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + offset);
  return istTime.toISOString().slice(0, 19).replace('T', ' ');
}

async function updateFillingLogs(request_id, status, userId) {
  try {
    console.log('📝 Updating filling logs:', { request_id, status, userId });

    const checkQuery = `SELECT id, created_by FROM filling_logs WHERE request_id = ?`;
    const existingLogs = await executeQuery(checkQuery, [request_id]);

    const now = getIndianTime();

    if (existingLogs.length > 0) {
      let updateQuery = '';
      let queryParams = [];

      switch (status) {
        case 'Processing':
          updateQuery = `UPDATE filling_logs SET processed_by = ?, processed_date = ? WHERE request_id = ?`;
          queryParams = [userId, now, request_id];
          console.log('✅ Updating processed_by log:', { userId, now });
          break;
        case 'Completed':
          updateQuery = `UPDATE filling_logs SET completed_by = ?, completed_date = ? WHERE request_id = ?`;
          queryParams = [userId, now, request_id];
          console.log('✅ Updating completed_by log:', { userId, now });
          break;
        case 'Cancel':
          updateQuery = `UPDATE filling_logs SET cancelled_by = ?, cancelled_date = ? WHERE request_id = ?`;
          queryParams = [userId, now, request_id];
          console.log('✅ Updating cancelled_by log:', { userId, now });
          break;
        default:
          console.log('⚠️ No log update needed for status:', status);
          return;
      }

      if (updateQuery) {
        await executeQuery(updateQuery, queryParams);
        console.log('✅ Filling log updated successfully');
      }
    } else {
      const requestQuery = `SELECT cid FROM filling_requests WHERE rid = ?`;
      const requestResult = await executeQuery(requestQuery, [request_id]);

      let createdById = null;

      if (requestResult.length > 0 && requestResult[0].cid) {
        const customerId = requestResult[0].cid;
        const customerCheck = await executeQuery(
          `SELECT id FROM customers WHERE id = ?`,
          [customerId]
        );

        if (customerCheck.length > 0) {
          createdById = customerId;
          console.log('✅ Request created by customer (original creator):', customerId);
        } else {
          const existingLogCheck = await executeQuery(
            `SELECT created_by FROM filling_logs WHERE request_id = ? ORDER BY created_date ASC, id ASC LIMIT 1`,
            [request_id]
          );
          if (existingLogCheck.length > 0 && existingLogCheck[0].created_by) {
            createdById = existingLogCheck[0].created_by;
            console.log('✅ Found existing log with original creator:', createdById);
          } else {
            createdById = customerId;
            console.log('⚠️ Using customer ID from request (customer may not exist):', customerId);
          }
        }
      } else {
        const existingLogCheck = await executeQuery(
          `SELECT created_by FROM filling_logs WHERE request_id = ? ORDER BY created_date ASC, id ASC LIMIT 1`,
          [request_id]
        );
        if (existingLogCheck.length > 0 && existingLogCheck[0].created_by) {
          createdById = existingLogCheck[0].created_by;
          console.log('✅ Using existing log creator:', createdById);
        } else {
          createdById = userId;
          console.log('⚠️ No customer found, using current user as created_by (last resort):', userId);
        }
      }

      if (createdById) {
        const insertQuery = `INSERT INTO filling_logs (request_id, created_by, created_date) VALUES (?, ?, ?)`;
        await executeQuery(insertQuery, [request_id, createdById, now]);
        console.log('✅ New filling log created with original creator:', { request_id, created_by: createdById, created_date: now });
      } else {
        console.error('❌ Could not determine created_by for request:', request_id);
      }

      if (status === 'Processing' || status === 'Completed' || status === 'Cancel') {
        let updateQuery = '';
        let queryParams = [];

        switch (status) {
          case 'Processing':
            updateQuery = `UPDATE filling_logs SET processed_by = ?, processed_date = ? WHERE request_id = ?`;
            queryParams = [userId, now, request_id];
            break;
          case 'Completed':
            updateQuery = `UPDATE filling_logs SET completed_by = ?, completed_date = ? WHERE request_id = ?`;
            queryParams = [userId, now, request_id];
            break;
          case 'Cancel':
            updateQuery = `UPDATE filling_logs SET cancelled_by = ?, cancelled_date = ? WHERE request_id = ?`;
            queryParams = [userId, now, request_id];
            break;
        }

        if (updateQuery) {
          await executeQuery(updateQuery, queryParams);
          console.log('✅ Status field updated in new log');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error updating filling_logs:', error);
    console.error('Error stack:', error.stack);
  }
}

async function handleProcessingStatus(data) {
  const { id, rid, cl_id, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id } = data;

  const now = getIndianTime();

  console.log('🔄 Processing Status Update Details:', {
    id, rid, cl_id, remarks,
    doc1Path, doc2Path, doc3Path,
    userId, sub_product_id, now
  });

  try {
    // Check concurrent processing for same customer
    const [activeProcessingRows] = await Promise.all([
      executeQuery(
        `SELECT COUNT(*) as cnt FROM filling_requests WHERE cid = ? AND status = 'Processing' AND rid <> ?`,
        [cl_id, rid]
      ),
      executeQuery(
        `SELECT amtlimit as raw_available_balance, hold_balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
        [cl_id]
      )
    ]);
    const processingCount = parseInt(activeProcessingRows?.cnt || 0);
    const balanceInfoRows = Array.isArray(activeProcessingRows) ? [] : [];
    const balanceInfo = (await executeQuery(
      `SELECT amtlimit as raw_available_balance, hold_balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
      [cl_id]
    ))[0] || { raw_available_balance: 0, hold_balance: 0 };
    const currentRawBalance = parseFloat(balanceInfo.raw_available_balance) || 0;
    const currentHold = parseFloat(balanceInfo.hold_balance) || 0;

    if (processingCount > 0 || currentHold > 0) {
      throw new Error('CONCURRENT_REQUEST_BLOCKED');
    }

    // Get current request details to compute hold amount
    const reqRows = await executeQuery(
      `SELECT fs_id, product, sub_product_id, aqty, price FROM filling_requests WHERE id = ? AND rid = ? LIMIT 1`,
      [id, rid]
    );
    if (!reqRows || reqRows.length === 0) {
      throw new Error('REQUEST_NOT_FOUND');
    }
    const req = reqRows[0];
    const aqtyNum = parseFloat(req.aqty) || 0;

    // Resolve price from deal_price
    let finalPrice = await getFuelPrice(req.fs_id, req.product, req.sub_product_id, cl_id, req.price || 0);

    const holdAmount = (finalPrice || 0) * aqtyNum;
    if (holdAmount <= 0) {
      throw new Error('INVALID_HOLD_AMOUNT');
    }

    // Calculate available balance = raw_available_balance + hold_balance
    const availableBalance = currentRawBalance + currentHold;
    
    if (availableBalance < holdAmount) {
      throw new Error('INSUFFICIENT_LIMIT');
    }

    // Move amount from raw_available_balance to hold_balance
    await executeQuery(
      `UPDATE customer_balances 
       SET amtlimit = amtlimit - ?, hold_balance = hold_balance + ?, updated_at = ? 
       WHERE com_id = ?`,
      [holdAmount, holdAmount, now, cl_id]
    );

    const updateRequestQuery = `
      UPDATE filling_requests 
      SET status = 'Processing', 
          pdate = ?,
          pcid = ?,
          remark = ?,
          doc1 = ?,
          doc2 = ?,
          doc3 = ?,
          status_updated_by = ?,
          sub_product_id = ?
      WHERE id = ? AND rid = ?
    `;

    console.log('🔧 Executing Processing Update Query:', updateRequestQuery);
    console.log('📋 Query Parameters:', [
      now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id, id, rid
    ]);

    const result = await executeQuery(updateRequestQuery, [
      now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id, id, rid
    ]);

    console.log('✅ Processing status update result:', {
      affectedRows: result.affectedRows,
      message: result.message,
      changedRows: result.changedRows
    });

    if (result.affectedRows === 0) {
      throw new Error('No rows updated - request not found or already processed');
    }

    return 'Status updated to Processing successfully';

  } catch (error) {
    console.error('❌ Error in handleProcessingStatus:', error);
    if (error?.message === 'CONCURRENT_REQUEST_BLOCKED') {
      throw new Error('Another request is already processing or hold balance is active for this customer. Please complete or cancel existing process.');
    }
    if (error?.message === 'INSUFFICIENT_LIMIT') {
      throw new Error('Insufficient limit. Only Admin can increase limit. Please contact Admin to update your limit.');
    }
    throw new Error('Failed to update status to Processing: ' + error.message);
  }
}

async function handleCompletedStatus(data) {
  const {
    id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
    oldstock, credit_limit, available_balance, day_limit,
    price, aqty, doc1Path, doc2Path, doc3Path, remarks, userId,
    isDayLimitCustomer = false
  } = data;

  // Re-select sub_product based on actual qty thresholds
  let chosenSubProduct = sub_product_id;
  try {
    const codes = await executeQuery(
      `SELECT id, pcode FROM product_codes WHERE product_id = ?`,
      [product_id]
    );
    const codeList = Array.isArray(codes) ? codes : [];
    const classify = (pcode) => {
      const code = (pcode || '').toUpperCase().replace(/\s+/g, '');
      if (product_id === 4) {
        return (code.includes('BULK') || code.includes('DEFLB')) ? 'bulk' : 'retail';
      }
      if (product_id === 5) {
        return code.includes('BUCKET') ? 'bulk' : 'retail';
      }
      return (code.endsWith('R') || code.includes('-R') || code.includes('RTL') || code.includes('RETAIL')) ? 'retail' : 'bulk';
    };
    const threshold = (product_id === 4 || product_id === 5) ? 3000 : 5000;
    const desired = (parseFloat(aqty) || 0) >= threshold ? 'bulk' : 'retail';
    const match = codeList.find(r => classify(r.pcode) === desired);
    if (match) {
      chosenSubProduct = match.id;
    }
  } catch { }

  // Get final price
  let finalPrice = await getFuelPrice(fs_id, product_id, chosenSubProduct, cl_id, price);
  const calculatedAmount = finalPrice * aqty;
  const newStock = oldstock - aqty;

  // Get current balance data BEFORE any update
  const getLatestAmountQuery = `
    SELECT 
      amtlimit as raw_available_balance,
      balance as used_amount,
      hold_balance,
      cst_limit as credit_limit,
      day_limit, 
      is_active
    FROM customer_balances 
    WHERE com_id = ?
  `;
  const latestAmountRows = await executeQuery(getLatestAmountQuery, [cl_id]);

  let initial_raw_available_balance = 0;
  let initial_hold_balance = 0;
  let old_used_amount = 0;
  let customerDayLimit = 0;

  if (latestAmountRows.length > 0) {
    initial_raw_available_balance = parseFloat(latestAmountRows[0].raw_available_balance) || 0;
    initial_hold_balance = parseFloat(latestAmountRows[0].hold_balance) || 0;
    old_used_amount = parseFloat(latestAmountRows[0].used_amount) || 0;
    customerDayLimit = parseInt(latestAmountRows[0].day_limit) || 0;
  }

  console.log('💰 INITIAL BALANCES BEFORE COMPLETION:', {
    initial_raw_available_balance,
    initial_hold_balance,
    old_used_amount,
    total_available_before: initial_raw_available_balance + initial_hold_balance,
    calculatedAmount,
    isDayLimitCustomer
  });

  const now = getIndianTime();

  // Calculate new values based on the logic
  let new_raw_available_balance = 0;
  let new_hold_balance = 0;
  let new_used_amount = old_used_amount + calculatedAmount;

  if (isDayLimitCustomer) {
    // Day limit customer logic
    console.log('📅 Processing Day Limit Customer...');
    
    // For day limit customers, just move from hold_balance to balance
    // Use from hold_balance if available
    const amountFromHold = Math.min(calculatedAmount, initial_hold_balance);
    
    // Update customer balances
    await executeQuery(
      `UPDATE customer_balances 
       SET balance = balance + ?,
           hold_balance = hold_balance - ?,
           updated_at = ? 
       WHERE com_id = ?`,
      [calculatedAmount, amountFromHold, now, cl_id]
    );
    
    // Get updated values for logging
    const updatedBalances = await executeQuery(
      `SELECT amtlimit as raw_available_balance, hold_balance, balance FROM customer_balances WHERE com_id = ?`,
      [cl_id]
    );
    
    if (updatedBalances.length > 0) {
      new_raw_available_balance = parseFloat(updatedBalances[0].raw_available_balance) || 0;
      new_hold_balance = parseFloat(updatedBalances[0].hold_balance) || 0;
      new_used_amount = parseFloat(updatedBalances[0].balance) || 0;
    }
    
    console.log('✅ Day limit customer - Hold balance settled:', {
      amountFromHold,
      calculatedAmount,
      new_raw_available_balance,
      new_hold_balance,
      new_used_amount
    });
    
  } else {
    // Credit limit customer logic - Your 3 conditions logic
    console.log('💰 Processing Credit Limit Customer...');
    
    // Calculate total available before (raw + hold)
    const total_available_before = initial_raw_available_balance + initial_hold_balance;
    
    // Check if sufficient balance exists
    if (total_available_before < calculatedAmount) {
      throw new Error('INSUFFICIENT_LIMIT_ON_COMPLETE');
    }
    
    // Calculate new raw_available_balance and hold_balance
    // Formula: new_raw_available_balance = total_available_before - calculatedAmount
    // Formula: new_hold_balance = 0 (all hold balance is cleared)
    new_raw_available_balance = total_available_before - calculatedAmount;
    new_hold_balance = 0;
    
    console.log('🧮 CALCULATION FOR CREDIT LIMIT CUSTOMER:', {
      total_available_before,
      calculatedAmount,
      new_raw_available_balance,
      new_hold_balance
    });
    
    // Update customer balances
    await executeQuery(
      `UPDATE customer_balances 
       SET amtlimit = ?,
           hold_balance = ?,
           balance = balance + ?,
           updated_at = ? 
       WHERE com_id = ?`,
      [new_raw_available_balance, new_hold_balance, calculatedAmount, now, cl_id]
    );
    
    console.log('✅ Credit limit customer - Updated balances:', {
      new_raw_available_balance,
      new_hold_balance,
      calculatedAmount
    });
  }

  // ✅ Update filling request with payment_status
  const updateRequestQuery = `
    UPDATE filling_requests 
    SET status = 'Completed', 
        aqty = ?,
        completed_date = ?,
        ccid = ?,
        remark = ?,
        doc1 = ?,
        doc2 = ?,
        doc3 = ?,
        status_updated_by = ?,
        sub_product_id = ?,
        price = ?,
        totalamt = ?,
        payment_status = ?
    WHERE id = ? AND rid = ?
  `;

  const paymentStatus = isDayLimitCustomer ? 0 : 1;

  await executeQuery(updateRequestQuery, [
    aqty, now, userId, remarks, doc1Path, doc2Path, doc3Path, userId,
    chosenSubProduct, finalPrice, calculatedAmount, paymentStatus, id, rid
  ]);

  // Get last new_amount from filling_history for this customer
  const getLastNewAmountQuery = `
    SELECT new_amount 
    FROM filling_history 
    WHERE cl_id = ? 
    ORDER BY filling_date DESC, id DESC 
    LIMIT 1
  `;
  const lastNewAmountRows = await executeQuery(getLastNewAmountQuery, [cl_id]);
  const previous_new_amount = lastNewAmountRows.length > 0 ? parseFloat(lastNewAmountRows[0].new_amount) || 0 : 0;

  try {
    const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
    const colSet = new Set(colsInfo.map(r => r.Field));

    const baseCols = [
      'rid', 'fs_id', 'product_id', 'sub_product_id', 'trans_type', 'current_stock', 'filling_qty', 'amount',
      'available_stock', 'filling_date', 'cl_id', 'created_by', 'old_amount', 'new_amount', 'remaining_limit',
      'payment_status'
    ];
    const baseVals = [
      rid, fs_id, product_id, chosenSubProduct || null, 'Outward', oldstock, aqty, calculatedAmount,
      newStock, now, cl_id, userId,
      old_used_amount,
      new_used_amount,
      isDayLimitCustomer ? null : (new_raw_available_balance + new_hold_balance), // total available
      paymentStatus
    ];

    // Only add day limit columns for day limit customers
    if (isDayLimitCustomer) {
      const elapsedDays = 0;
      const remainingDayLimit = customerDayLimit > 0 ? Math.max(0, customerDayLimit - elapsedDays) : null;
      const dayValidityDays = customerDayLimit > 0 ? customerDayLimit : null;

      if (colSet.has('remaining_day_limit')) {
        baseCols.push('remaining_day_limit');
        baseVals.push(remainingDayLimit);
      }
      if (colSet.has('day_limit_validity_days')) {
        baseCols.push('day_limit_validity_days');
        baseVals.push(dayValidityDays);
      }
    }

    const placeholders = baseCols.map(() => '?').join(', ');
    const insertSql = `INSERT INTO filling_history (${baseCols.join(',')}) VALUES (${placeholders})`;
    await executeQuery(insertSql, baseVals);
  } catch (e) {
    console.log('Using fallback filling_history insert');
    const insertHistoryQuery = `
      INSERT INTO filling_history 
      (rid, fs_id, product_id, sub_product_id, trans_type, current_stock, filling_qty, amount, 
       available_stock, filling_date, cl_id, created_by, old_amount, new_amount, remaining_limit,
       payment_status) 
      VALUES (?, ?, ?, ?, 'Outward', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executeQuery(insertHistoryQuery, [
      rid, fs_id, product_id, chosenSubProduct || null, oldstock, aqty, calculatedAmount,
      newStock, now, cl_id, userId,
      old_used_amount,
      new_used_amount,
      isDayLimitCustomer ? null : (new_raw_available_balance + new_hold_balance),
      paymentStatus
    ]);
  }

  // Get user info for audit log
  let userName = 'System';
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const userResult = await executeQuery(
          `SELECT id, name FROM employee_profile WHERE id = ?`,
          [userId]
        );
        if (userResult.length > 0) {
          userName = userResult[0].name;
        }
      }
    }
  } catch (userError) {
    console.error('Error getting user info:', userError);
  }

  // Update station stock
  const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`;
  await executeQuery(updateStockQuery, [newStock, fs_id, product_id]);

  // Handle non-billing stocks if needed
  if (billing_type == 2) {
    await handleNonBillingStocks(fs_id, product_id, aqty, userId);
  }

  // Update wallet history
  await updateWalletHistory(cl_id, rid, calculatedAmount,
    previous_new_amount || 0,
    previous_new_amount + calculatedAmount
  );

  console.log('✅ FINAL BALANCES AFTER COMPLETION:', {
    new_raw_available_balance,
    new_hold_balance,
    new_used_amount,
    total_available_after: new_raw_available_balance + new_hold_balance,
    calculatedAmount
  });

  return 'Request Completed Successfully';
}

async function getFuelPrice(station_id, product_id, sub_product_id, com_id, defaultPrice = 0) {
  let finalPrice = defaultPrice;
  
  const sId = parseInt(sub_product_id);
  const hasSubProduct = !isNaN(sId) && sId > 0;

  console.log('💲 getFuelPrice Check:', { station_id, product_id, sub_product_id, com_id, hasSubProduct });

  // 1. Exact Match: Customer + Station + Product + SubProduct
  if (hasSubProduct) {
    const exactPriceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE station_id = ? 
        AND product_id = ? 
        AND sub_product_id = ? 
        AND com_id = ? 
        AND is_active = 1 
      ORDER BY updated_date DESC 
      LIMIT 1
    `;
    const exactPriceRows = await executeQuery(exactPriceQuery, [station_id, product_id, sub_product_id, com_id]);

    if (exactPriceRows.length > 0) {
      console.log('💲 Found Exact Price:', exactPriceRows[0].price);
      return parseFloat(exactPriceRows[0].price);
    }
  }

  // 2. Station Default for SubProduct
  if (hasSubProduct) {
    const stationPriceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE station_id = ? 
        AND product_id = ? 
        AND sub_product_id = ? 
        AND (com_id IS NULL OR com_id = 0)
        AND is_active = 1 
      ORDER BY updated_date DESC 
      LIMIT 1
    `;
    const stationPriceRows = await executeQuery(stationPriceQuery, [station_id, product_id, sub_product_id]);

    if (stationPriceRows.length > 0) {
      console.log('💲 Found Station SubProduct Price:', stationPriceRows[0].price);
      return parseFloat(stationPriceRows[0].price);
    }
  }

  // 3. General Customer Price
  const customerGeneralQuery = `
    SELECT price 
    FROM deal_price 
    WHERE station_id = ? 
      AND product_id = ? 
      AND com_id = ? 
      AND (sub_product_id IS NULL OR sub_product_id = 0 OR sub_product_id = '')
      AND is_active = 1 
    ORDER BY updated_date DESC 
    LIMIT 1
  `;
  const customerGeneralRows = await executeQuery(customerGeneralQuery, [station_id, product_id, com_id]);

  if (customerGeneralRows.length > 0) {
    console.log('💲 Found Customer General Price:', customerGeneralRows[0].price);
    return parseFloat(customerGeneralRows[0].price);
  }

  // 4. General Station Price
  const productGeneralQuery = `
    SELECT price 
    FROM deal_price 
    WHERE station_id = ? 
      AND product_id = ? 
      AND (com_id IS NULL OR com_id = 0)
      AND (sub_product_id IS NULL OR sub_product_id = 0 OR sub_product_id = '')
      AND is_active = 1 
    ORDER BY updated_date DESC 
    LIMIT 1
  `;
  const productGeneralRows = await executeQuery(productGeneralQuery, [station_id, product_id]);

  if (productGeneralRows.length > 0) {
    console.log('💲 Found Station General Price:', productGeneralRows[0].price);
    return parseFloat(productGeneralRows[0].price);
  }

  console.log('💲 No price found, returning default:', defaultPrice);
  return defaultPrice;
}

async function handleCancelStatus(data) {
  const { id, rid, remarks, doc1Path, doc2Path, doc3Path, userId } = data;

  const now = getIndianTime();
  
  // First, get the request details including customer ID
  const reqRows = await executeQuery(
    `SELECT cid, status, fs_id, product, aqty, price, totalamt, payment_status 
     FROM filling_requests 
     WHERE id = ? AND rid = ? 
     LIMIT 1`,
    [id, rid]
  );
  
  if (!reqRows || reqRows.length === 0) {
    throw new Error('Request not found');
  }
  
  const req = reqRows[0];
  const customerId = req.cid;
  
  console.log('🔄 Cancelling request:', {
    rid,
    customerId,
    currentStatus: req.status,
    payment_status: req.payment_status
  });

  // ✅ Check if request was in Processing status
  if (req.status === 'Processing') {
    console.log('✅ Request was in Processing status - checking hold_balance...');
    
    // Get current customer balance including hold_balance
    const balanceRows = await executeQuery(
      `SELECT amtlimit as raw_available_balance, hold_balance 
       FROM customer_balances 
       WHERE com_id = ? 
       LIMIT 1`,
      [customerId]
    );
    
    if (balanceRows.length > 0) {
      const currentRawBalance = parseFloat(balanceRows[0].raw_available_balance) || 0;
      const currentHoldBalance = parseFloat(balanceRows[0].hold_balance) || 0;
      
      console.log('💰 Current balances:', {
        customerId,
        raw_available_balance: currentRawBalance,
        hold_balance: currentHoldBalance
      });
      
      if (currentHoldBalance > 0) {
        // ✅ RESTORE hold_balance to raw_available_balance
        const restoreQuery = `
          UPDATE customer_balances 
          SET amtlimit = amtlimit + ?, 
              hold_balance = 0,
              updated_at = ? 
          WHERE com_id = ?
        `;
        
        await executeQuery(restoreQuery, [currentHoldBalance, now, customerId]);
        
        console.log(`✅ Restored hold_balance: ₹${currentHoldBalance} to raw_available_balance for customer: ${customerId}`);
      } else {
        console.log(`ℹ️ No hold_balance to restore for customer: ${customerId}`);
      }
    } else {
      console.log(`⚠️ No customer balance record found for customer: ${customerId}`);
    }
  }
  
  // If request was completed, we need to handle stock and balance reversal differently
  if (req.status === 'Completed') {
    const amount = parseFloat(req.totalamt || (req.price * req.aqty)) || 0;
    
    console.log('🔄 Reverting completed request:', { amount });
    
    // Revert stock
    try {
      const stockRows = await executeQuery(
        `SELECT stock FROM filling_station_stocks WHERE fs_id = ? AND product = ?`,
        [req.fs_id, req.product]
      );
      
      if (stockRows && stockRows.length > 0) {
        const currentStock = parseFloat(stockRows[0].stock) || 0;
        const returnedQty = parseFloat(req.aqty) || 0;
        
        await executeQuery(
          `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`,
          [currentStock + returnedQty, req.fs_id, req.product]
        );
        
        console.log(`✅ Stock reverted: Added ${returnedQty}L back to station`);
      }
    } catch (stockError) {
      console.error('❌ Error reverting stock:', stockError);
    }
    
    // For credit limit customers (payment_status = 1), revert the deduction
    if (parseInt(req.payment_status) === 1 && amount > 0) {
      await executeQuery(
        `UPDATE customer_balances 
         SET amtlimit = amtlimit + ?, 
             balance = GREATEST(0, balance - ?), 
             updated_at = ? 
         WHERE com_id = ?`,
        [amount, amount, now, customerId]
      );
      
      console.log(`✅ Balance reverted for completed request: Added ₹${amount} to raw_available_balance`);
    }
  }
  
  // Now update the request status to Cancel
  const updateRequestQuery = `
    UPDATE filling_requests 
    SET status = 'Cancelled', 
        cdate = ?, 
        ccid = ?, 
        cancel_remark = ?, 
        doc1 = ?, 
        doc2 = ?, 
        doc3 = ?, 
        status_updated_by = ?,
        updated_at = ?
    WHERE id = ? AND rid = ?
  `;
  
  await executeQuery(updateRequestQuery, [
    now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, now, id, rid
  ]);
  
  console.log(`✅ Request ${rid} cancelled successfully`);
  
  return 'Request Cancelled Successfully';
}

async function updateFillingRequest(data) {
  const {
    id, aqty, status, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id
  } = data;

  const now = getIndianTime();

  let updateQuery = '';
  let queryParams = [];

  if (status === 'Processing') {
    updateQuery = `
      UPDATE filling_requests 
      SET doc1 = ?, 
          doc2 = ?, 
          doc3 = ?, 
          aqty = ?, 
          status = ?, 
          remark = ?, 
          sub_product_id = ?,
          pdate = ?,
          pcid = ?,
          status_updated_by = ?
      WHERE id = ?
    `;
    queryParams = [doc1Path, doc2Path, doc3Path, aqty, status, remarks, sub_product_id, now, userId, userId, id];
  } else {
    updateQuery = `
      UPDATE filling_requests 
      SET doc1 = ?, 
          doc2 = ?, 
          doc3 = ?, 
          aqty = ?, 
          status = ?, 
          remark = ?, 
          sub_product_id = ?,
          status_updated_by = ?
      WHERE id = ?
    `;
    queryParams = [doc1Path, doc2Path, doc3Path, aqty, status, remarks, sub_product_id, userId, id];
  }

  await executeQuery(updateQuery, queryParams);
  return 'Request updated successfully';
}

async function updateWalletHistory(cl_id, rid, deductedAmount, oldBalance, newBalance) {
  try {
    const description = 'Fuel Purchase';

    console.log('💰 Wallet History Update:', {
      oldBalance,
      deductedAmount,
      newBalance,
      description
    });

    const checkQuery = `SELECT id FROM wallet_history WHERE rid = ? LIMIT 1`;
    const existingRecord = await executeQuery(checkQuery, [rid]);

    if (existingRecord.length > 0) {
      await executeQuery(
        `UPDATE wallet_history 
         SET old_balance = ?, deducted = ?, c_balance = ?, d_date = NOW(), description = ?
         WHERE rid = ?`,
        [oldBalance, deductedAmount, newBalance, description, rid]
      );
      console.log('✅ Wallet history updated for rid:', rid);
    } else {
      await executeQuery(
        `INSERT INTO wallet_history (cl_id, rid, old_balance, deducted, c_balance, d_date, type, description) 
         VALUES (?, ?, ?, ?, ?, NOW(), 4, ?)`,
        [cl_id, rid, oldBalance, deductedAmount, newBalance, description]
      );
      console.log('✅ Wallet history inserted for rid:', rid);
    }
  } catch (error) {
    console.error('❌ Error in updateWalletHistory:', error);
  }
}

async function handleNonBillingStocks(station_id, product_id, aqty, userId = 1) {
  try {
    console.log('📦 Processing non-billing stock for station:', station_id, 'product:', product_id, 'aqty:', aqty);

    const checkQuery = `SELECT COUNT(*) as count FROM non_billing_stocks WHERE station_id = ? AND product_id = ?`;
    const checkResult = await executeQuery(checkQuery, [station_id, product_id]);
    const exists = checkResult[0].count > 0;

    console.log('Record exists?', exists);

    if (exists) {
      const updateQuery = `UPDATE non_billing_stocks SET stock = stock + ?, updated_at = NOW(), updated_by = ? WHERE station_id = ? AND product_id = ?`;
      await executeQuery(updateQuery, [aqty, userId, station_id, product_id]);
      console.log('✅ Updated existing record, added:', aqty);
    } else {
      const insertQuery = `INSERT INTO non_billing_stocks (station_id, product_id, stock, created_at, created_by) VALUES (?, ?, ?, NOW(), ?)`;
      await executeQuery(insertQuery, [station_id, product_id, aqty, userId]);
      console.log('✅ Inserted new record with stock:', aqty);
    }

    return true;

  } catch (error) {
    console.error('❌ SIMPLEST method error:', error);

    try {
      const directInsert = `
        INSERT IGNORE INTO non_billing_stocks 
        (station_id, product_id, stock, created_at, created_by)
        VALUES (?, ?, ?, NOW(), ?)
      `;
      await executeQuery(directInsert, [station_id, product_id, aqty, userId]);
      console.log('✅ Direct INSERT attempted');
    } catch (finalError) {
      console.error('❌ Everything failed:', finalError);
    }

    return false;
  }
}

async function handleFileUpload(file, rid, docKey) {
  if (!file || file.size === 0) return null;
  const maxSize = 5 * 1024 * 1000;
  if (file.size > maxSize) return null;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'filling-requests');
  await mkdir(uploadDir, { recursive: true });
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const filename = `${rid}_${docKey}_${Date.now()}.${ext}`;
  const filepath = path.join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);
  return `/uploads/filling-requests/${filename}`;
}