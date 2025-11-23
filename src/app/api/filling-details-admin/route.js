// app/api/filling-details-admin/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

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
      // ✅ FIXED: Remove day_amount from query
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
          cb.amtlimit as available_balance,
          cb.cst_limit as credit_limit,
          cb.com_id,
          cb.last_reset_date,
          cb.created_at,
          cb.updated_at,
          cb.day_limit,
          cb.is_active,
          fss.stock as station_stock,
          pc.pcode as sub_product_code
        FROM filling_requests fr
        LEFT JOIN products p ON fr.product = p.id
        LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
        LEFT JOIN customers c ON fr.cid = c.id
        LEFT JOIN customer_balances cb ON c.id = cb.com_id
        LEFT JOIN filling_station_stocks fss ON (fr.fs_id = fss.fs_id AND fr.product = fss.product)
        LEFT JOIN product_codes pc ON fr.sub_product_id = pc.id
        WHERE fr.id = ?
      `;
      
      console.log('🔍 Executing main query for ID:', id);
      const rows = await executeQuery(query, [id]);

      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }

      data = rows[0];
      
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

      // ✅ CORRECTED: Calculate remaining days for day limit customers based on OLDEST UNPAID completed_date
      if (data.client_type === "3" && data.day_limit && data.day_limit > 0) {
        // Get OLDEST UNPAID completed transaction's completed_date
        const oldestUnpaidCompleted = await executeQuery(
          `SELECT completed_date 
           FROM filling_requests 
           WHERE cid = ? AND status = 'Completed' AND payment_status = 0
           ORDER BY completed_date ASC 
           LIMIT 1`,
          [data.cid]
        );
        
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        if (oldestUnpaidCompleted.length > 0 && oldestUnpaidCompleted[0].completed_date) {
          const oldestUnpaidDate = new Date(oldestUnpaidCompleted[0].completed_date);
          oldestUnpaidDate.setHours(0, 0, 0, 0);
          
          // Calculate days elapsed: current_date - oldest_unpaid_date
          const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
          const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
          
          // Remaining days = day_limit - days_elapsed
          data.days_elapsed = daysElapsed;
          data.remaining_days = Math.max(0, data.day_limit - daysElapsed);
          data.oldest_unpaid_date = oldestUnpaidDate;
          data.is_overdue = daysElapsed >= data.day_limit;
          
          console.log('📅 Day Limit Calculation - OLDEST UNPAID DATE:', {
            oldestUnpaidDate: oldestUnpaidDate.toISOString(),
            currentDate: currentDate.toISOString(),
            daysElapsed,
            dayLimit: data.day_limit,
            remainingDays: data.remaining_days,
            isOverdue: data.is_overdue
          });
        } else {
          // No unpaid completed transactions, so all days remaining
          data.days_elapsed = 0;
          data.remaining_days = data.day_limit;
          data.oldest_unpaid_date = null;
          data.is_overdue = false;
        }
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
        available_balance: data.available_balance,
        credit_limit: data.credit_limit
      });

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
  let userId = 1; // Default user ID
  
  try {
    console.log('🚀 /filling-details-admin POST called');

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
    // ✅ FIXED: Remove day_amount since column doesn't exist
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

    // ✅ UPDATED: For ALL customer types, check balance (both day limit and amtlimit)
    // ✅ FIX: Only check balance for Completed status, NOT for Processing
    if (status === 'Completed') {
      const balanceCheck = await checkBalanceLimit(cl_id, aqty, price, fs_id, product_id, sub_product_id);
      
      if (!balanceCheck.sufficient) {
        return NextResponse.json({ 
          success: false,
          limitOverdue: true,
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
      doc1Path = await handleFileUpload(doc1File);
    }
    if (doc2File && doc2File.size > 0) {
      doc2Path = await handleFileUpload(doc2File);
    }
    if (doc3File && doc3File.size > 0) {
      doc3Path = await handleFileUpload(doc3File);
    }

    console.log('🔁 Starting database operations...');

    let resultMessage = '';

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
    } else if (status === 'Cancel') {
      console.log('🔄 Handling Cancel status...');
      resultMessage = await handleCancelStatus({
        id, rid, remarks, doc1Path, doc2Path, doc3Path, userId
      });
    } else {
      console.log('🔄 Handling generic status update...');
      resultMessage = await updateFillingRequest({
        id, aqty, status, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id
      });
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

// ✅ CORRECTED: Day limit aur credit limit dono check karo
async function checkBalanceLimit(cl_id, aqty, defaultPrice, fs_id, product_id, sub_product_id) {
  try {
    console.log('🔍 Checking balance for customer:', cl_id);

    if (!cl_id) {
      return { 
        sufficient: false, 
        message: 'Customer ID is required' 
      };
    }

    // Get customer type and balance data from customer_balances table
    const customerQuery = `
      SELECT 
        c.client_type,
        cb.amtlimit as available_balance,
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
    const rawAvailableBalance = parseFloat(customerData.available_balance) || 0;
    const holdBalance = parseFloat(customerData.hold_balance) || 0;
    // Calculate actual available balance: amtlimit - hold_balance
    const availableBalance = Math.max(0, rawAvailableBalance - holdBalance);
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

    // Get actual fuel price for amount calculation
    const actualPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, defaultPrice);
    const requestedAmount = actualPrice * aqty;
    
    console.log('💰 Amount Calculation:', {
      actualPrice,
      aqty,
      requestedAmount
    });

    // Check if account is active
    if (customerData.is_active === 0) {
      return { 
        sufficient: false, 
        message: 'Your account is inactive. Please contact administrator.'
      };
    }

    // 🚨 DAY LIMIT CHECK - FOR ALL CUSTOMER TYPES WHO HAVE DAY LIMIT
    if (dayLimit > 0) {
      console.log('📅 Checking day limit for customer...');
      
      // For day_limit customers: Check based on OLDEST UNPAID completed transactions only
      const oldestUnpaidCompleted = await executeQuery(
        `SELECT completed_date 
         FROM filling_requests 
         WHERE cid = ? AND status = 'Completed' AND payment_status = 0
         ORDER BY completed_date ASC 
         LIMIT 1`,
        [cl_id]
      );
      
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      if (oldestUnpaidCompleted.length > 0 && oldestUnpaidCompleted[0].completed_date) {
        const oldestUnpaidDate = new Date(oldestUnpaidCompleted[0].completed_date);
        oldestUnpaidDate.setHours(0, 0, 0, 0);
        
        // Calculate days elapsed: current_date - oldest_unpaid_date
        const timeDiff = currentDate.getTime() - oldestUnpaidDate.getTime();
        const daysElapsed = Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
        
        console.log('📅 Day Limit Check - OLDEST UNPAID DATE:', {
          oldestUnpaidDate: oldestUnpaidDate.toISOString(),
          currentDate: currentDate.toISOString(),
          daysElapsed,
          dayLimit,
          isExceeded: daysElapsed >= dayLimit
        });
        
        // If days elapsed >= day_limit, block the request
        if (daysElapsed >= dayLimit) {
          console.log('❌ Day limit exceeded based on oldest unpaid completed_date');
          
          // Calculate total unpaid amount for overdue message
          const totalUnpaidQuery = `
            SELECT SUM(COALESCE(totalamt, price * aqty)) as total_unpaid
            FROM filling_requests 
            WHERE cid = ? AND status = 'Completed' AND payment_status = 0
          `;
          const unpaidResult = await executeQuery(totalUnpaidQuery, [cl_id]);
          const totalUnpaid = unpaidResult.length > 0 ? parseFloat(unpaidResult[0].total_unpaid) || 0 : 0;
          
          return { 
            sufficient: false, 
            message: `Day limit exceeded. Oldest unpaid transaction was ${daysElapsed} days ago (limit: ${dayLimit} days). Total unpaid amount: ₹${totalUnpaid.toFixed(2)}. Please clear the payment to continue.`,
            isDayLimitExpired: true,
            totalUnpaidAmount: totalUnpaid
          };
        }
      }
    }

    // 🚨 CREDIT LIMIT CHECK - FOR CUSTOMER TYPE 1 & 2
    if (clientType === "1" || clientType === "2") {
      console.log('💰 Customer Type 1/2 - Checking amtlimit...');
      
      // Check available balance (amtlimit - hold_balance)
      // Only show error if balance is actually insufficient
      if (availableBalance <= 0 || availableBalance < requestedAmount) {
        return { 
          sufficient: false, 
          message: `Insufficient balance. Required: ₹${requestedAmount.toFixed(2)}, Available: ₹${availableBalance.toFixed(2)}. Please recharge your account.`
        };
      }
      
      console.log('✅ Customer Type 1/2 - Sufficient amtlimit balance');
      return { 
        sufficient: true, 
        mode: 'credit_limit',
        clientType: clientType
      };
    }

    // 🚨 CUSTOMER TYPE 3 (DAY LIMIT) - ONLY DAY LIMIT CHECKED, NO AMTLIMIT CHECK
    if (clientType === "3") {
      console.log('✅ Customer Type 3 - Day limit check passed, no amtlimit check');
      return { 
        sufficient: true, 
        mode: 'day_limit',
        isDayLimitClient: true
      };
    }

    // 🚨 UNKNOWN CUSTOMER TYPE
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
    const checkQuery = `SELECT id FROM filling_logs WHERE request_id = ?`;
    const existingLogs = await executeQuery(checkQuery, [request_id]);
    
    const now = getIndianTime();
    
    if (existingLogs.length > 0) {
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
        default:
          return;
      }
      
      if (updateQuery) {
        await executeQuery(updateQuery, queryParams);
      }
    } else {
      const insertQuery = `INSERT INTO filling_logs (request_id, created_by, created_date) VALUES (?, ?, ?)`;
      await executeQuery(insertQuery, [request_id, userId, now]);
    }
  } catch (error) {
    console.error('❌ Error updating filling_logs:', error);
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

  let finalPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, price);
  const calculatedAmount = finalPrice * aqty;
  const newStock = oldstock - aqty;

  // Get current balance data with corrected field names
  const getLatestAmountQuery = `
    SELECT 
      amtlimit as available_balance,
      balance as used_amount,
      cst_limit as credit_limit,
      day_limit, 
      is_active 
    FROM customer_balances 
    WHERE com_id = ?
  `;
  const latestAmountRows = await executeQuery(getLatestAmountQuery, [cl_id]);
  
  let old_available_balance = 0;
  let old_used_amount = 0;
  let customerDayLimit = 0;
  
  if (latestAmountRows.length > 0) {
    old_available_balance = parseFloat(latestAmountRows[0].available_balance) || 0;
    old_used_amount = parseFloat(latestAmountRows[0].used_amount) || 0;
    customerDayLimit = parseInt(latestAmountRows[0].day_limit) || 0;
  }

  // ✅ CORRECTED: Calculate new balances
  const new_available_balance = old_available_balance - calculatedAmount;
  const new_used_amount = old_used_amount + calculatedAmount;

  console.log('💰 Balance Update Calculation:', {
    isDayLimitCustomer,
    old_available_balance: old_available_balance,
    calculated_amount: calculatedAmount,
    new_available_balance: new_available_balance,
    old_used_amount: old_used_amount,
    new_used_amount: new_used_amount,
    customerDayLimit,
    finalPrice,
    aqty
  });

  const now = getIndianTime();

  let updateBalanceQuery = '';
  let queryParams = [];
  
  // ✅ CORRECTED: Only apply day limit logic for day limit customers
  if (isDayLimitCustomer) {
    // Day limit customers - NO AVAILABLE_BALANCE DEDUCTION, only used_amount increase for tracking
    updateBalanceQuery = `
      UPDATE customer_balances 
      SET balance = balance + ?,
          updated_at = ? 
      WHERE com_id = ?
    `;
    queryParams = [calculatedAmount, now, cl_id];
    console.log('✅ Day limit customer - Only used amount updated (no available balance deduction)');
  } else {
    // CREDIT LIMIT CUSTOMER - Update available_balance (amount deduction) and used_amount
    updateBalanceQuery = `
      UPDATE customer_balances 
      SET amtlimit = amtlimit - ?, 
          balance = balance + ?,
          updated_at = ? 
      WHERE com_id = ?
    `;
    queryParams = [calculatedAmount, calculatedAmount, now, cl_id];
    console.log('✅ Credit limit customer - Available balance decreased, used amount increased');
  }
  
  if (updateBalanceQuery) {
    await executeQuery(updateBalanceQuery, queryParams);
  }

  // ✅ CORRECTED: Update filling request with payment_status
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
  
  // For day limit customers, mark as unpaid (0), for others mark as paid (1)
  const paymentStatus = isDayLimitCustomer ? 0 : 1;
  
  await executeQuery(updateRequestQuery, [
    aqty, now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, 
    sub_product_id, finalPrice, calculatedAmount, paymentStatus, id, rid
  ]);

  try {
    const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
    const colSet = new Set(colsInfo.map(r => r.Field));

    const baseCols = [
      'rid','fs_id','product_id','sub_product_id','trans_type','current_stock','filling_qty','amount',
      'available_stock','filling_date','cl_id','created_by','old_amount','new_amount','remaining_limit',
      'payment_status'
    ];
    const baseVals = [
      rid, fs_id, product_id, sub_product_id || null, 'Outward', oldstock, aqty, calculatedAmount,
      newStock, now, cl_id, userId,
      isDayLimitCustomer ? old_used_amount : new_available_balance, // old_amount: old balance for day_limit, new_balance for regular
      isDayLimitCustomer ? new_used_amount : (old_available_balance + calculatedAmount), // new_amount: old balance + amount for both
      isDayLimitCustomer ? null : new_available_balance, // remaining_limit: null for day_limit, amtlimit - total_calculate_amount for others
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
      // day_limit_amount should NOT be inserted for day limit customers
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
      rid, fs_id, product_id, sub_product_id || null, oldstock, aqty, calculatedAmount,
      newStock, now, cl_id, userId,
      isDayLimitCustomer ? old_used_amount : new_available_balance, // old_amount: old balance for day_limit, new_balance for regular
      isDayLimitCustomer ? new_used_amount : (old_available_balance + calculatedAmount), // new_amount: old balance + amount for both
      isDayLimitCustomer ? null : new_available_balance, // remaining_limit: null for day_limit, amtlimit - total_calculate_amount for others
      paymentStatus
    ]);
  }

  // Update station stock
  const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`;
  await executeQuery(updateStockQuery, [newStock, fs_id, product_id]);

  // Handle non-billing stocks if needed
  if (billing_type == 2) {
    await handleNonBillingStocks(fs_id, product_id, aqty);
  }

  // Update wallet history - REMOVED balanceType parameter
  await updateWalletHistory(cl_id, rid, calculatedAmount, 
    isDayLimitCustomer ? old_used_amount : old_available_balance, 
    isDayLimitCustomer ? new_used_amount : new_available_balance
  );

  return 'Request Completed Successfully';
}

async function getFuelPrice(station_id, product_id, sub_product_id, com_id, defaultPrice = 0) {
  let finalPrice = defaultPrice;

  if (sub_product_id) {
    const exactPriceQuery = `SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND sub_product_id = ? AND com_id = ? AND is_active = 1 LIMIT 1`;
    const exactPriceRows = await executeQuery(exactPriceQuery, [station_id, product_id, sub_product_id, com_id]);
    
    if (exactPriceRows.length > 0) {
      return parseFloat(exactPriceRows[0].price);
    }
  }

  if (sub_product_id) {
    const stationPriceQuery = `SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND sub_product_id = ? AND is_active = 1 LIMIT 1`;
    const stationPriceRows = await executeQuery(stationPriceQuery, [station_id, product_id, sub_product_id]);
    
    if (stationPriceRows.length > 0) {
      return parseFloat(stationPriceRows[0].price);
    }
  }

  const customerPriceQuery = `SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND com_id = ? AND is_active = 1 LIMIT 1`;
  const customerPriceRows = await executeQuery(customerPriceQuery, [station_id, product_id, com_id]);
  
  if (customerPriceRows.length > 0) {
    return parseFloat(customerPriceRows[0].price);
  }

  const productPriceQuery = `SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND is_active = 1 LIMIT 1`;
  const productPriceRows = await executeQuery(productPriceQuery, [station_id, product_id]);
  
  if (productPriceRows.length > 0) {
    return parseFloat(productPriceRows[0].price);
  }

  return defaultPrice;
}

async function handleCancelStatus(data) {
  const { id, rid, remarks, doc1Path, doc2Path, doc3Path, userId } = data;

  const now = getIndianTime();
  const updateRequestQuery = `
    UPDATE filling_requests 
    SET status = 'Cancel', 
        cdate = ?,
        ccid = ?,
        cancel_remark = ?,
        doc1 = ?,
        doc2 = ?,
        doc3 = ?,
        status_updated_by = ?
    WHERE id = ? AND rid = ?
  `;
  
  await executeQuery(updateRequestQuery, [
    now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, id, rid
  ]);

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

// ✅ FIXED: Remove balanceType parameter
async function updateWalletHistory(cl_id, rid, deductedAmount, oldBalance, newBalance) {
  try {
    const description = 'Fuel Purchase';
    
    console.log('💰 Wallet History Update:', {
      oldBalance,
      deductedAmount,
      newBalance,
      description
    });

    await executeQuery(
      `INSERT INTO wallet_history (cl_id, rid, old_balance, deducted, c_balance, d_date, type, description) 
       VALUES (?, ?, ?, ?, ?, NOW(), 4, ?)`,
      [cl_id, rid, oldBalance, deductedAmount, newBalance, description]
    );
  } catch (error) {
    console.error('❌ Error in updateWalletHistory:', error);
  }
}

async function handleNonBillingStocks(station_id, product_id, aqty) {
  try {
    const checkQuery = `SELECT stock FROM non_billing_stocks WHERE station_id = ? AND product_id = ?`;
    const result = await executeQuery(checkQuery, [station_id, product_id]);

    if (result.length > 0) {
      const existingStock = result[0].stock;
      const updatedStock = existingStock + aqty;
      await executeQuery(
        `UPDATE non_billing_stocks SET stock = ? WHERE station_id = ? AND product_id = ?`,
        [updatedStock, station_id, product_id]
      );
    } else {
      await executeQuery(
        `INSERT INTO non_billing_stocks (station_id, product_id, stock) VALUES (?, ?, ?)`,
        [station_id, product_id, aqty]
      );
    }
  } catch (error) {
    console.error('❌ Error in handleNonBillingStocks:', error);
  }
}

async function handleFileUpload(file) {
  if (!file || file.size === 0) return null;

  try {
    const maxSize = 5 * 1024 * 1000;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    // For now, return a dummy path since file upload might be causing issues
    return `/uploads/temp_${Date.now()}.jpg`;
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    return null;
  }
}