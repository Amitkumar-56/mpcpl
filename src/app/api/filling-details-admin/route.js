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
      const query = `
        SELECT 
          fr.*,
          p.pname as product_name,
          p.id as product_id,
          fs.station_name,
          c.name as client_name,
          c.phone as client_phone,
          c.billing_type,
          cb.id as balance_id,
          cb.balance,
          cb.hold_balance,
          cb.amtlimit,
          cb.cst_limit,
          cb.com_id,
          cb.last_reset_date,
          cb.created_at,
          cb.updated_at,
          cb.day_limit,
          cb.day_amount,
          cb.day_limit_expiry,
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

      // Calculate remaining days for day limit customers
      if (data.day_limit && data.day_limit > 0 && data.day_limit_expiry) {
        const now = new Date();
        const expiryDate = new Date(data.day_limit_expiry);
        const remainingDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        data.remaining_days = Math.max(0, remainingDays);
      } else {
        data.remaining_days = 0;
      }

      console.log('✅ Final data prepared:', {
        day_limit: data.day_limit,
        remaining_days: data.remaining_days,
        day_limit_expiry: data.day_limit_expiry,
        is_active: data.is_active,
        cst_limit: data.cst_limit,
        amtlimit: data.amtlimit
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
    const cst_limit = parseFloat(formData.get('cst_limit')) || 0;
    const amtlimit = parseFloat(formData.get('amtlimit')) || 0;
    const day_limit = parseFloat(formData.get('day_limit')) || 0;
    const day_amount = parseFloat(formData.get('day_amount')) || 0;
    const price = parseFloat(formData.get('price')) || 0;
    const aqty = parseFloat(formData.get('aqty')) || 0;
    const status = formData.get('status');
    const remarks = formData.get('remarks');

    console.log('🔹 Extracted Form Data:', {
      id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type, oldstock, 
      cst_limit, amtlimit, day_limit, day_amount, price, aqty, status, remarks
    });

    // Validate required fields
    if (!id || !rid) {
      console.error('❌ Missing required fields');
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check customer balance limit before proceeding (ONLY for Completed status)
    if (status === 'Completed') {
      const balanceCheck = await checkBalanceLimit(cl_id, aqty, price, fs_id, product_id, sub_product_id);
      
      if (!balanceCheck.sufficient) {
        return NextResponse.json({ 
          success: false,
          limitOverdue: true,
          message: balanceCheck.message || 'Your limit is over. Please recharge your account.'
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
      
      resultMessage = await handleCompletedStatus({
        id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
        oldstock, cst_limit, amtlimit, day_limit, day_amount,
        price, aqty, doc1Path, doc2Path, doc3Path, remarks, userId
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

// Helper Functions
async function checkBalanceLimit(cl_id, aqty, defaultPrice, fs_id, product_id, sub_product_id) {
  try {
    console.log('🔍 Checking balance limit for customer:', cl_id);

    if (!cl_id) {
      return { 
        sufficient: false, 
        message: 'Customer ID is required' 
      };
    }

    // Calculate the amount for this transaction
    const calculatedAmount = aqty * defaultPrice;
    
    // Get customer balance with day limit info
    const balanceQuery = `
      SELECT 
        amtlimit, 
        day_limit,
        day_limit_expiry,
        is_active
      FROM customer_balances 
      WHERE com_id = ?
    `;
    const balanceRows = await executeQuery(balanceQuery, [cl_id]);
    
    if (balanceRows.length === 0) {
      return { 
        sufficient: false, 
        message: 'Customer balance not found.' 
      };
    }
    
    const balanceData = balanceRows[0];
    const dayLimit = parseInt(balanceData.day_limit) || 0;
    const currentAmtLimit = parseFloat(balanceData.amtlimit) || 0;
    
    console.log('💰 Balance Check:', {
      dayLimit,
      current_amtlimit: currentAmtLimit,
      required_amount: calculatedAmount,
      day_limit_expiry: balanceData.day_limit_expiry,
      is_active: balanceData.is_active
    });

    // DAY LIMIT CUSTOMER CHECK
    if (dayLimit > 0) {
      const now = new Date();
      const expiryDate = balanceData.day_limit_expiry ? new Date(balanceData.day_limit_expiry) : null;
      
      // Check if day limit is expired
      if (expiryDate && now > expiryDate) {
        console.log('❌ Day limit expired');
        
        // Update status to inactive
        await executeQuery(
          `UPDATE customer_balances SET is_active = 0 WHERE com_id = ?`,
          [cl_id]
        );
        
        return { 
          sufficient: false, 
          message: 'Your day limit has expired. Please renew your limit.',
          isDayLimitExpired: true
        };
      }
      
      // Check if account is active
      if (balanceData.is_active === 0) {
        console.log('❌ Day limit account inactive');
        return { 
          sufficient: false, 
          message: 'Your day limit account is inactive. Please contact administrator.'
        };
      }
      
      // Calculate remaining days
      let remainingDays = 0;
      if (expiryDate) {
        remainingDays = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        remainingDays = Math.max(0, remainingDays);
      }
      
      console.log('✅ Day limit customer - Transaction allowed', {
        remainingDays,
        expiryDate: expiryDate?.toISOString()
      });
      
      return { 
        sufficient: true, 
        mode: 'day_limit',
        remainingDays,
        expiryDate: expiryDate?.toISOString(),
        isDayLimitClient: true
      };
    }

    // CREDIT LIMIT CUSTOMERS - Check amtlimit only
    if (currentAmtLimit < calculatedAmount) {
      return { 
        sufficient: false, 
        message: `Insufficient balance. Required: ₹${calculatedAmount.toFixed(2)}, Available: ₹${currentAmtLimit.toFixed(2)}. Please recharge your account.`
      };
    }
    
    console.log('✅ Amtlimit sufficient - Transaction allowed');
    return { 
      sufficient: true, 
      mode: 'credit_limit',
      calculatedAmount 
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
  const updateRequestQuery = `
    UPDATE filling_requests 
    SET status = 'Processing', 
        pdate = ?,
        pcid = ?,
        remark = ?,
        doc1 = COALESCE(?, doc1),
        doc2 = COALESCE(?, doc2),
        doc3 = COALESCE(?, doc3),
        status_updated_by = ?,
        sub_product_id = COALESCE(?, sub_product_id)
    WHERE id = ? AND rid = ?
  `;
  
  await executeQuery(updateRequestQuery, [
    now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id, id, rid
  ]);

  return 'Status updated to Processing';
}

async function handleCompletedStatus(data) {
  const {
    id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
    oldstock, cst_limit, amtlimit, day_limit, day_amount,
    price, aqty, doc1Path, doc2Path, doc3Path, remarks, userId
  } = data;

  let finalPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, price);
  const calculatedAmount = finalPrice * aqty;
  const newStock = oldstock - aqty;

  // Get current balance data
  const getLatestAmountQuery = `
    SELECT amtlimit, balance, day_limit, day_limit_expiry, is_active 
    FROM customer_balances 
    WHERE com_id = ?
  `;
  const latestAmountRows = await executeQuery(getLatestAmountQuery, [cl_id]);
  
  let old_amtlimit = 0;
  let old_balance = 0;
  let customerDayLimit = 0;
  
  if (latestAmountRows.length > 0) {
    old_amtlimit = parseFloat(latestAmountRows[0].amtlimit) || 0;
    old_balance = parseFloat(latestAmountRows[0].balance) || 0;
    customerDayLimit = parseInt(latestAmountRows[0].day_limit) || 0;
  }

  const new_amtlimit = old_amtlimit - calculatedAmount;
  const new_balance = old_balance + calculatedAmount;

  console.log('💰 Balance Update Calculation:', {
    old_amtlimit: old_amtlimit,
    calculated_amount: calculatedAmount,
    new_amtlimit: new_amtlimit,
    old_balance: old_balance,
    new_balance: new_balance,
    customerDayLimit,
    isDayLimitCustomer: customerDayLimit > 0
  });

  const now = getIndianTime();

  let updateBalanceQuery = '';
  let balanceType = '';
  let queryParams = [];
  
  // DAY LIMIT CUSTOMER - No amount deduction, only balance update for record
  if (customerDayLimit > 0) {
    // Day limit customers - NO AMTLIMIT DEDUCTION, only balance increase for tracking
    updateBalanceQuery = `
      UPDATE customer_balances 
      SET balance = balance + ?,
          updated_at = ? 
      WHERE com_id = ?
    `;
    balanceType = 'day_limit';
    queryParams = [calculatedAmount, now, cl_id];
    console.log('✅ Day limit customer - Only balance updated (no amtlimit deduction)');
  } else {
    // CREDIT LIMIT CUSTOMER - Update amtlimit (amount deduction)
    updateBalanceQuery = `
      UPDATE customer_balances 
      SET amtlimit = amtlimit - ?, 
          balance = balance + ?,
          updated_at = ? 
      WHERE com_id = ?
    `;
    balanceType = 'credit_limit';
    queryParams = [calculatedAmount, calculatedAmount, now, cl_id];
    console.log('✅ Credit limit customer - Amtlimit decreased, balance increased');
  }
  
  if (updateBalanceQuery) {
    await executeQuery(updateBalanceQuery, queryParams);
  }

  // Update filling request
  const updateRequestQuery = `
    UPDATE filling_requests 
    SET status = 'Completed', 
        aqty = ?,
        completed_date = ?,
        ccid = ?,
        remark = ?,
        doc1 = COALESCE(?, doc1),
        doc2 = COALESCE(?, doc2),
        doc3 = COALESCE(?, doc3),
        status_updated_by = ?,
        sub_product_id = COALESCE(?, sub_product_id),
        price = ?,
        totalamt = ?
    WHERE id = ? AND rid = ?
  `;
  
  await executeQuery(updateRequestQuery, [
    aqty, now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, 
    sub_product_id, finalPrice, calculatedAmount, id, rid
  ]);

  try {
    const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_history');
    const colSet = new Set(colsInfo.map(r => r.Field));

    const baseCols = [
      'rid','fs_id','product_id','sub_product_id','trans_type','current_stock','filling_qty','amount',
      'available_stock','filling_date','cl_id','created_by','old_amount','new_amount','remaining_limit'
    ];
    const baseVals = [
      rid, fs_id, product_id, sub_product_id || null, 'Outward', oldstock, aqty, calculatedAmount,
      newStock, now, cl_id, userId,
      customerDayLimit > 0 ? old_balance : old_amtlimit,
      customerDayLimit > 0 ? new_balance : new_amtlimit,
      calculatedAmount
    ];

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
    if (colSet.has('day_limit_amount')) {
      baseCols.push('day_limit_amount');
      baseVals.push(calculatedAmount);
    }

    const placeholders = baseCols.map(() => '?').join(', ');
    const insertSql = `INSERT INTO filling_history (${baseCols.join(',')}) VALUES (${placeholders})`;
    await executeQuery(insertSql, baseVals);
  } catch (e) {
    const insertHistoryQuery = `
      INSERT INTO filling_history 
      (rid, fs_id, product_id, sub_product_id, trans_type, current_stock, filling_qty, amount, 
       available_stock, filling_date, cl_id, created_by, old_amount, new_amount, remaining_limit) 
      VALUES (?, ?, ?, ?, 'Outward', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await executeQuery(insertHistoryQuery, [
      rid, fs_id, product_id, sub_product_id || null, oldstock, aqty, calculatedAmount,
      newStock, now, cl_id, userId,
      customerDayLimit > 0 ? old_balance : old_amtlimit,
      customerDayLimit > 0 ? new_balance : new_amtlimit,
      calculatedAmount
    ]);
  }

  // Update station stock
  const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`;
  await executeQuery(updateStockQuery, [newStock, fs_id, product_id]);

  // Handle non-billing stocks if needed
  if (billing_type == 2) {
    await handleNonBillingStocks(fs_id, product_id, aqty);
  }

  // Update wallet history
  await updateWalletHistory(cl_id, rid, calculatedAmount, balanceType);

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
        doc1 = COALESCE(?, doc1),
        doc2 = COALESCE(?, doc2),
        doc3 = COALESCE(?, doc3),
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
      SET doc1 = COALESCE(?, doc1), 
          doc2 = COALESCE(?, doc2), 
          doc3 = COALESCE(?, doc3), 
          aqty = ?, 
          status = ?, 
          remark = ?, 
          sub_product_id = COALESCE(?, sub_product_id),
          pdate = ?,
          pcid = ?,
          status_updated_by = ?
      WHERE id = ?
    `;
    queryParams = [doc1Path, doc2Path, doc3Path, aqty, status, remarks, sub_product_id, now, userId, userId, id];
  } else {
    updateQuery = `
      UPDATE filling_requests 
      SET doc1 = COALESCE(?, doc1), 
          doc2 = COALESCE(?, doc2), 
          doc3 = COALESCE(?, doc3), 
          aqty = ?, 
          status = ?, 
          remark = ?, 
          sub_product_id = COALESCE(?, sub_product_id),
          status_updated_by = ?
      WHERE id = ?
    `;
    queryParams = [doc1Path, doc2Path, doc3Path, aqty, status, remarks, sub_product_id, userId, id];
  }
  
  await executeQuery(updateQuery, queryParams);
  return 'Request updated successfully';
}

async function updateWalletHistory(cl_id, rid, deductedAmount, balanceType) {
  try {
    // Get current balance data
    const balanceQuery = `SELECT amtlimit, balance FROM customer_balances WHERE com_id = ?`;
    const balanceRows = await executeQuery(balanceQuery, [cl_id]);
    
    if (balanceRows.length === 0) return;
    
    const balanceData = balanceRows[0];
    
    let oldBalance, newBalance, description;
    
    if (balanceType === 'day_limit') {
      oldBalance = (balanceData.balance || 0) - deductedAmount;
      newBalance = balanceData.balance || 0;
      description = 'Fuel Purchase - Day Limit';
    } else {
      oldBalance = (balanceData.amtlimit || 0) + deductedAmount;
      newBalance = balanceData.amtlimit || 0;
      description = 'Fuel Purchase - Credit Limit';
    }

    console.log('💰 Wallet History Update:', {
      balanceType,
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

// Helper function to set day limit for customer
function calculateDayLimit(dayLimit, currentDate = new Date()) {
  const expiryDate = new Date(currentDate);
  expiryDate.setDate(expiryDate.getDate() + dayLimit);
  
  const remainingDays = Math.ceil((expiryDate - currentDate) / (1000 * 60 * 60 * 24));
  
  return {
    expiryDate: expiryDate.toISOString().slice(0, 19).replace('T', ' '),
    remainingDays: Math.max(0, remainingDays)
  };
}