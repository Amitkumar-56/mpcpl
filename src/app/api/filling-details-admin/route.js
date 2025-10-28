import { executeQuery } from "@/lib/db";
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

// GET - Fetch request details
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
          cb.amtlimit,
          cb.balance,
          cb.cst_limit,
          cb.limit_expiry,
          cb.validity_days,
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
      
      // Check if limit is expired
      const isLimitExpired = checkLimitExpiry(data);
      data.is_limit_expired = isLimitExpired;
      
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

      console.log('✅ Final data:', {
        price: data.fuel_price,
        stock: data.station_stock,
        sub_product_id: data.sub_product_id,
        sub_product_code: data.sub_product_code,
        status: data.status,
        is_limit_expired: data.is_limit_expired,
        limit_expiry: data.limit_expiry,
        validity_days: data.validity_days
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
    const amtlimit = parseFloat(formData.get('amtlimit')) || 0;
    const hold_balance = 0; // Always set to 0 - no hold operations
    const price = parseFloat(formData.get('price')) || 0;
    const aqty = parseFloat(formData.get('aqty')) || 0;
    const status = formData.get('status');
    const remarks = formData.get('remarks');

    console.log('🔹 Extracted Form Data:', {
      id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type, oldstock, 
      amtlimit, hold_balance, price, aqty, status, remarks
    });

    // Validate required fields
    if (!id || !rid) {
      console.error('❌ Missing required fields');
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Check customer balance and limit expiry before proceeding
    if (status === 'Completed') {
      const balanceCheck = await checkCustomerBalanceAndExpiry(cl_id, aqty, price, fs_id, product_id, sub_product_id);
      
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
        oldstock, amtlimit, price, aqty,
        doc1Path, doc2Path, doc3Path, remarks, userId
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

// Check customer balance AND expiry before completing request
async function checkCustomerBalanceAndExpiry(cl_id, aqty, defaultPrice, fs_id, product_id, sub_product_id) {
  try {
    // Get current balance and expiry details
    const balanceQuery = `
      SELECT amtlimit, cst_limit, limit_expiry, validity_days 
      FROM customer_balances 
      WHERE com_id = ?
    `;
    const balanceRows = await executeQuery(balanceQuery, [cl_id]);
    
    if (balanceRows.length === 0) {
      return { 
        sufficient: false, 
        message: 'Customer balance not found. Please set credit limit first.' 
      };
    }
    
    const currentBalance = parseFloat(balanceRows[0].amtlimit) || 0;
    const currentCstLimit = parseFloat(balanceRows[0].cst_limit) || 0;
    const limitExpiry = balanceRows[0].limit_expiry;
    const validityDays = balanceRows[0].validity_days || 0;
    
    // Check if limit is expired
    const isExpired = checkLimitExpiry(balanceRows[0]);
    
    if (isExpired) {
      return { 
        sufficient: false, 
        message: `Credit limit has expired on ${new Date(limitExpiry).toLocaleDateString('en-IN')}. Please renew your credit limit to continue.`
      };
    }
    
    // Get actual price
    const actualPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, defaultPrice);
    const calculatedAmount = actualPrice * aqty;
    
    console.log('💰 Balance and expiry check:', {
      currentBalance,
      currentCstLimit,
      calculatedAmount,
      actualPrice,
      aqty,
      limitExpiry,
      validityDays,
      isExpired
    });
    
    // Check if balance is sufficient
    if (currentBalance < calculatedAmount) {
      return { 
        sufficient: false, 
        message: `Insufficient balance. Required: ₹${calculatedAmount.toFixed(2)}, Available: ₹${currentBalance.toFixed(2)}. Please recharge your account.`
      };
    }
    
    return { sufficient: true };
  } catch (error) {
    console.error('❌ Error checking customer balance and expiry:', error);
    return { 
      sufficient: false, 
      message: 'Error checking balance and limit status' 
    };
  }
}

// Helper function to check if limit is expired
function checkLimitExpiry(balanceData) {
  if (!balanceData.limit_expiry) {
    return false; // No expiry set, so not expired
  }
  
  const now = new Date();
  const expiryDate = new Date(balanceData.limit_expiry);
  
  // Check if expiry date is in past
  return expiryDate < now;
}

// Get current Indian time in MySQL datetime format
function getIndianTime() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const istTime = new Date(now.getTime() + offset);
  
  return istTime.toISOString().slice(0, 19).replace('T', ' ');
}

// Update or create filling_logs entry
async function updateFillingLogs(request_id, status, userId) {
  try {
    // Check if log entry already exists
    const checkQuery = `SELECT id FROM filling_logs WHERE request_id = ?`;
    const existingLogs = await executeQuery(checkQuery, [request_id]);
    
    const now = getIndianTime();
    
    if (existingLogs.length > 0) {
      // Update existing log entry
      let updateQuery = '';
      let queryParams = [];
      
      switch (status) {
        case 'Processing':
          updateQuery = `
            UPDATE filling_logs 
            SET processed_by = ?, processed_date = ? 
            WHERE request_id = ?
          `;
          queryParams = [userId, now, request_id];
          break;
          
        case 'Completed':
          updateQuery = `
            UPDATE filling_logs 
            SET completed_by = ?, completed_date = ? 
            WHERE request_id = ?
          `;
          queryParams = [userId, now, request_id];
          break;
          
        case 'Cancel':
          updateQuery = `
            UPDATE filling_logs 
            SET cancelled_by = ?, cancelled_date = ? 
            WHERE request_id = ?
          `;
          queryParams = [userId, now, request_id];
          break;
          
        default:
          // For other status updates, don't update filling_logs as there's no updated_by column
          console.log(`ℹ️ No filling_logs update needed for status: ${status}`);
          return; // Exit early for default case
      }
      
      if (updateQuery) {
        await executeQuery(updateQuery, queryParams);
        console.log(`✅ Updated filling_logs for ${status} status`);
      }
    } else {
      // Create new log entry
      const insertQuery = `
        INSERT INTO filling_logs 
        (request_id, created_by, created_date) 
        VALUES (?, ?, ?)
      `;
      await executeQuery(insertQuery, [request_id, userId, now]);
      console.log('✅ Created new filling_logs entry');
    }
  } catch (error) {
    console.error('❌ Error updating filling_logs:', error);
    // Don't throw error here as it's not critical for main functionality
  }
}

// Processing Status - ONLY STATUS CHANGE, NO BALANCE OPERATIONS
async function handleProcessingStatus(data) {
  const { id, rid, cl_id, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id } = data;
  
  console.log('💰 Processing - Only status change, no balance operations');

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

  console.log('✅ Processing: Status updated successfully');
  return 'Status updated to Processing';
}

// Complete Status - WITH BALANCE CHECK AND DEDUCTION
async function handleCompletedStatus(data) {
  const {
    id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
    oldstock, amtlimit, price, aqty,
    doc1Path, doc2Path, doc3Path, remarks, userId
  } = data;

  // Get price from deal_price table
  let finalPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, price);
  
  console.log('💰 Final price to use:', finalPrice);

  // Calculate amount = aqty * price
  const calculatedAmount = finalPrice * aqty;
  const newStock = oldstock - aqty;

  console.log('📊 Completion calculations:', {
    finalPrice,
    calculatedAmount,
    newStock,
    oldstock,
    aqty,
    currentAmtLimit: amtlimit
  });

  // ✅ GET LATEST NEW_AMOUNT FROM PREVIOUS TRANSACTION FOR THIS USER
  const getLatestAmountQuery = `
    SELECT new_amount 
    FROM filling_history 
    WHERE cl_id = ? 
    ORDER BY id DESC 
    LIMIT 1
  `;
  
  const latestAmountRows = await executeQuery(getLatestAmountQuery, [cl_id]);
  
  let old_amount = 0;
  
  if (latestAmountRows.length > 0) {
    // ✅ Agar previous transaction hai, to uska new_amount current old_amount banega
    old_amount = parseFloat(latestAmountRows[0].new_amount) || 0;
    console.log('📈 Found previous transaction, using new_amount as old_amount:', old_amount);
  } else {
    // ✅ Agar pehli transaction hai, to 0 se start hoga
    old_amount = 0;
    console.log('📈 First transaction for this user, starting from 0');
  }

  // ✅ CORRECTED: Calculate amounts for filling_history - old_amount + amount = new_amount
  const new_amount = old_amount + calculatedAmount; // ✅ old_amount + amount = new_amount
  
  // Get current credit limit
  const balanceQuery = `SELECT cst_limit FROM customer_balances WHERE com_id = ?`;
  const balanceRows = await executeQuery(balanceQuery, [cl_id]);
  const currentLimit = balanceRows.length > 0 ? parseFloat(balanceRows[0].cst_limit) : 0;
  
  const remaining_limit = currentLimit - new_amount;

  console.log('💰 Filling history amounts (SEQUENTIAL):', {
    old_amount,
    new_amount,
    remaining_limit,
    calculatedAmount,
    formula: 'old_amount + amount = new_amount',
    note: 'Each new transaction uses previous new_amount as old_amount'
  });

  // ✅ CORRECTION: Deduct from amtlimit AND ADD to balance
  const updateBalanceQuery = `
    UPDATE customer_balances  
    SET 
      amtlimit = amtlimit - ?,  -- Available balance decrease
      balance = balance + ?,     -- Total balance INCREASE (outward amount ADD)
      updated_at = ?
    WHERE com_id = ?
  `;
  
  await executeQuery(updateBalanceQuery, [
    calculatedAmount, 
    calculatedAmount, 
    getIndianTime(), 
    cl_id
  ]);

  console.log('💰 Customer balance UPDATED:', {
    deducted_from_amtlimit: calculatedAmount,
    added_to_balance: calculatedAmount,
    com_id: cl_id
  });

  // Update filling request
  const now = getIndianTime();
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

  // ✅ CORRECTED: Insert into filling_history with SEQUENTIAL amount calculation
  const insertHistoryQuery = `
    INSERT INTO filling_history 
    (rid, fs_id, product_id, sub_product_id, trans_type, current_stock, filling_qty, amount, 
     available_stock, filling_date, cl_id, created_by, old_amount, new_amount, remaining_limit) 
    VALUES (?, ?, ?, ?, 'Outward', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(insertHistoryQuery, [
    rid, fs_id, product_id, sub_product_id || null, oldstock, aqty, calculatedAmount, 
    newStock, now, cl_id, userId, old_amount, new_amount, remaining_limit
  ]);

  console.log('✅ Filling history inserted with SEQUENTIAL amount logic');

  // Update station stock
  const updateStockQuery = `
    UPDATE filling_station_stocks 
    SET stock = ? 
    WHERE fs_id = ? AND product = ?
  `;
  await executeQuery(updateStockQuery, [newStock, fs_id, product_id]);

  // Handle non-billing stocks if applicable
  if (billing_type == 2) {
    await handleNonBillingStocks(fs_id, product_id, aqty);
  }

  // Update wallet history
  await updateWalletHistory(cl_id, rid, calculatedAmount, amtlimit);

  console.log('✅ Filling request completed successfully');
  return 'Request Completed Successfully';
}

// Dedicated function to get fuel price with proper fallback logic
async function getFuelPrice(station_id, product_id, sub_product_id, com_id, defaultPrice = 0) {
  console.log('🔍 Getting fuel price with params:', {
    station_id, product_id, sub_product_id, com_id, defaultPrice
  });

  let finalPrice = defaultPrice;

  // Priority 1: Exact match with all parameters
  if (sub_product_id) {
    const exactPriceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE station_id = ? 
        AND product_id = ? 
        AND sub_product_id = ?
        AND com_id = ?
        AND is_active = 1
      LIMIT 1
    `;
    
    const exactPriceRows = await executeQuery(exactPriceQuery, [
      station_id, product_id, sub_product_id, com_id
    ]);
    
    if (exactPriceRows.length > 0) {
      finalPrice = parseFloat(exactPriceRows[0].price);
      console.log('✅ Price found with exact match:', finalPrice);
      return finalPrice;
    }
  }

  // Priority 2: Station-level price with sub_product_id
  if (sub_product_id) {
    const stationPriceQuery = `
      SELECT price 
      FROM deal_price 
      WHERE station_id = ? 
        AND product_id = ? 
        AND sub_product_id = ?
        AND is_active = 1
      LIMIT 1
    `;
    
    const stationPriceRows = await executeQuery(stationPriceQuery, [
      station_id, product_id, sub_product_id
    ]);
    
    if (stationPriceRows.length > 0) {
      finalPrice = parseFloat(stationPriceRows[0].price);
      console.log('✅ Price found with station-level match:', finalPrice);
      return finalPrice;
    }
  }

  // Priority 3: Customer-specific price without sub_product_id
  const customerPriceQuery = `
    SELECT price 
    FROM deal_price 
    WHERE station_id = ? 
      AND product_id = ? 
      AND com_id = ?
      AND is_active = 1
    LIMIT 1
  `;
  
  const customerPriceRows = await executeQuery(customerPriceQuery, [
    station_id, product_id, com_id
  ]);
  
  if (customerPriceRows.length > 0) {
    finalPrice = parseFloat(customerPriceRows[0].price);
    console.log('✅ Price found with customer match:', finalPrice);
    return finalPrice;
  }

  // Priority 4: Station-level price without sub_product_id
  const productPriceQuery = `
    SELECT price 
    FROM deal_price 
    WHERE station_id = ? 
      AND product_id = ? 
      AND is_active = 1
    LIMIT 1
  `;
  
  const productPriceRows = await executeQuery(productPriceQuery, [
    station_id, product_id
  ]);
  
  if (productPriceRows.length > 0) {
    finalPrice = parseFloat(productPriceRows[0].price);
    console.log('✅ Price found with product match:', finalPrice);
    return finalPrice;
  }

  console.log('⚠️ No price found in deal_price, using default:', defaultPrice);
  return defaultPrice;
}

// Cancel Status - NO BALANCE CHANGES
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

  console.log('✅ Filling request cancelled successfully');
  return 'Request Cancelled Successfully';
}

// Generic Update - NO BALANCE CHANGES
async function updateFillingRequest(data) {
  const {
    id, aqty, status, remarks, doc1Path, doc2Path, doc3Path, userId, sub_product_id
  } = data;

  const now = getIndianTime();
  
  // Update based on status to set appropriate timestamps
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
  console.log('📝 Filling request updated with status:', status);
  return 'Request updated successfully';
}

// Wallet History Update
async function updateWalletHistory(cl_id, rid, deductedAmount, oldBalance) {
  try {
    // Get new balance after deduction
    const newBalanceQuery = `SELECT amtlimit FROM customer_balances WHERE com_id = ?`;
    const newBalanceRows = await executeQuery(newBalanceQuery, [cl_id]);
    const newBalance = newBalanceRows.length > 0 ? newBalanceRows[0].amtlimit : 0;

    await executeQuery(
      `INSERT INTO wallet_history (cl_id, rid, old_balance, deducted, c_balance, d_date, type) 
       VALUES (?, ?, ?, ?, ?, NOW(), 4)`,
      [cl_id, rid, oldBalance, deductedAmount, newBalance]
    );

    console.log('💰 Wallet history updated:', {
      cl_id, rid, oldBalance, deductedAmount, newBalance
    });
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
      throw new Error(`File size exceeds 5MB limit`);
    }

    const uploadDir = './public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalName = file.name || 'document';
    const filename = `${timestamp}_${originalName.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);

    return `/uploads/${filename}`;
  } catch (error) {
    console.error('❌ File upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}