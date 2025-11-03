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

      console.log('✅ Final data prepared:', {
        day_limit: data.day_limit,
        day_amount: data.day_amount,
        daily_available: (data.day_limit || 0) - (data.day_amount || 0),
        cst_limit: data.cst_limit,
        amtlimit: data.amtlimit,
        credit_available: (data.cst_limit || 0) - (data.amtlimit || 0)
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
    const balanceQuery = `
      SELECT 
        cb.day_limit, 
        cb.day_amount, 
        cb.cst_limit, 
        cb.amtlimit,
        cb.balance,
        cb.day_limit_expiry,
        cb.is_active,
        c.client_type
      FROM customer_balances cb
      LEFT JOIN customers c ON cb.com_id = c.id
      WHERE cb.com_id = ?
    `;
    const balanceRows = await executeQuery(balanceQuery, [cl_id]);
    
    if (balanceRows.length === 0) {
      return { 
        sufficient: false, 
        message: 'Customer balance not found.' 
      };
    }
    
    const balanceData = balanceRows[0];
    const clientType = balanceData.client_type;
    
    // DAY LIMIT CUSTOMER (Type 3) - No balance check, only check if account is active
    if (clientType === "3") {
      if (balanceData.is_active === 0) {
        return { 
          sufficient: false, 
          message: 'Your day limit has expired. Please recharge to activate your account.',
          isDayLimitExpired: true
        };
      }
      
      // Check if day limit will expire today
      if (balanceData.day_limit_expiry) {
        const now = new Date();
        const expiryDate = new Date(balanceData.day_limit_expiry);
        const timeDiff = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        if (daysRemaining <= 0) {
          // Auto-deactivate if expired
          await executeQuery(
            `UPDATE customer_balances SET is_active = 0 WHERE com_id = ?`,
            [cl_id]
          );
          return { 
            sufficient: false, 
            message: 'Day limit has expired. Please recharge your account.',
            isDayLimitExpired: true
          };
        }
      }
      
      console.log('✅ Day-limit customer: No credit limit check required');
      return { 
        sufficient: true, 
        mode: 'day_limit',
        isDayLimitClient: true
      };
    }

    // Credit limit system validation
    if (creditLimit > 0) {
      const creditAvailable = Math.max(0, creditLimit - usedAmount);
      
      console.log('💰 Credit Limit Details:', {
        credit_limit: creditLimit,
        used_amount: usedAmount,
        credit_available: creditAvailable,
        required_amount: calculatedAmount
      });

      if (creditAvailable < calculatedAmount) {
        return { 
          sufficient: false, 
          message: `Insufficient credit limit. Required: ₹${calculatedAmount.toFixed(2)}, Available: ₹${creditAvailable.toFixed(2)}. Please recharge your account.`
        };
      }
      
      return { 
        sufficient: true, 
        mode: 'credit_limit',
        calculatedAmount 
      };
    }

    // If no limit system is set
    return { 
      sufficient: false, 
      message: 'No credit limit set for this customer. Please set credit limit first.' 
    };

  } catch (error) {
    console.error('❌ Error checking balance limit:', error);
    return { 
      sufficient: false, 
      message: 'Error checking limit status' 
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

// async function handleCompletedStatus(data) {
//   const {
//     id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
//     oldstock, cst_limit, amtlimit, day_limit, day_amount,
//     price, aqty, doc1Path, doc2Path, doc3Path, remarks, userId
//   } = data;

//   let finalPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, price);
//   const calculatedAmount = finalPrice * aqty;
//   const newStock = oldstock - aqty;

//   const getLatestAmountQuery = `SELECT amtlimit, balance FROM customer_balances WHERE com_id = ?`;
//   const latestAmountRows = await executeQuery(getLatestAmountQuery, [cl_id]);
  
//   let old_amtlimit = 0;
//   let old_balance = 0;
  
//   if (latestAmountRows.length > 0) {
//       old_amtlimit = parseFloat(latestAmountRows[0].amtlimit) || 0; // Current available balance
//     old_balance = parseFloat(latestAmountRows[0].balance) || 0;
    
//   }

//   const new_amtlimit = old_amtlimit - calculatedAmount;
//   const new_balance = old_balance + calculatedAmount;

//     console.log('💰 Balance Update Calculation:', {
//     old_available_balance: old_amtlimit,
//     calculated_amount: calculatedAmount,
//     new_available_balance: new_amtlimit,
//     old_balance: old_balance,
//     new_balance: new_balance
//   });

//     const now = getIndianTime();
//   const updateCustomerBalanceQuery = `
//     UPDATE customer_balances 
//     SET amtlimit = amtlimit - ?, 
//         balance = balance + ?,
//         updated_at = ? 
//     WHERE com_id = ?
//   `;
  
//   await executeQuery(updateCustomerBalanceQuery, [calculatedAmount, calculatedAmount, now, cl_id]);
//   // Update customer_balances based on limit system
//   // const now = getIndianTime();

//   // Get current balance to determine limit system
//   const balanceQuery = `SELECT day_limit, cst_limit, amtlimit, day_amount FROM customer_balances WHERE com_id = ?`;
//   const balanceRows = await executeQuery(balanceQuery, [cl_id]);
  
//   let updateBalanceQuery = '';
//   let balanceType = '';
//   let queryParams = [];
  
//   if (balanceRows.length > 0) {
//     const balanceData = balanceRows[0];
//     const creditDays = parseInt(balanceData.day_limit, 10) || 0;
    
//     if (creditDays > 0) {
//       // Day limit system - update day_amount
//       updateBalanceQuery = `
//         UPDATE customer_balances 
//         SET day_amount = day_amount + ?, 
//             balance = balance + ?,
//             updated_at = ? 
//         WHERE com_id = ?
//       `;
//       balanceType = 'day_limit';
//       queryParams = [calculatedAmount, calculatedAmount, now, cl_id];
//       console.log('✅ Updated daily limit - day_amount increased by:', calculatedAmount);
//     } else {
//       // Credit limit system - update amtlimit
//       updateBalanceQuery = `
//         UPDATE customer_balances 
//         SET amtlimit = amtlimit - ?, 
//             balance = balance + ?,
//             updated_at = ? 
//         WHERE com_id = ?
//       `;
//       balanceType = 'credit_limit';
//       queryParams = [calculatedAmount, calculatedAmount, now, cl_id];
//       console.log('✅ Updated credit limit - amtlimit increased by:', calculatedAmount);
//     }
//   }
  
//   if (updateBalanceQuery) {
//     await executeQuery(updateBalanceQuery, queryParams);
//   }

//   // Update filling request
//   const updateRequestQuery = `
//     UPDATE filling_requests 
//     SET status = 'Completed', 
//         aqty = ?,
//         completed_date = ?,
//         ccid = ?,
//         remark = ?,
//         doc1 = COALESCE(?, doc1),
//         doc2 = COALESCE(?, doc2),
//         doc3 = COALESCE(?, doc3),
//         status_updated_by = ?,
//         sub_product_id = COALESCE(?, sub_product_id),
//         price = ?,
//         totalamt = ?
//     WHERE id = ? AND rid = ?
//   `;
  
//   await executeQuery(updateRequestQuery, [
//     aqty, now, userId, remarks, doc1Path, doc2Path, doc3Path, userId, 
//     sub_product_id, finalPrice, calculatedAmount, id, rid
//   ]);

//   // Insert into filling history
//   const insertHistoryQuery = `
//     INSERT INTO filling_history 
//     (rid, fs_id, product_id, sub_product_id, trans_type, current_stock, filling_qty, amount, 
//      available_stock, filling_date, cl_id, created_by, old_amount, new_amount, remaining_limit) 
//     VALUES (?, ?, ?, ?, 'Outward', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;
  
//   await executeQuery(insertHistoryQuery, [
//     rid, fs_id, product_id, sub_product_id || null, oldstock, aqty, calculatedAmount, 
//     newStock, now, cl_id, userId, old_amount, new_amount, calculatedAmount
//   ]);

//   // Update station stock
//   const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`;
//   await executeQuery(updateStockQuery, [newStock, fs_id, product_id]);

//   // Handle non-billing stocks if needed
//   if (billing_type == 2) {
//     await handleNonBillingStocks(fs_id, product_id, aqty);
//   }

//   // Update wallet history with correct balance type
//   await updateWalletHistory(cl_id, rid, calculatedAmount, balanceType);

//   return 'Request Completed Successfully';
// }

async function handleCompletedStatus(data) {
  const {
    id, rid, fs_id, cl_id, product_id, sub_product_id, billing_type,
    oldstock, cst_limit, amtlimit, day_limit, day_amount,
    price, aqty, doc1Path, doc2Path, doc3Path, remarks, userId
  } = data;

  let finalPrice = await getFuelPrice(fs_id, product_id, sub_product_id, cl_id, price);
  const calculatedAmount = finalPrice * aqty;
  const newStock = oldstock - aqty;

  const getLatestAmountQuery = `SELECT amtlimit, balance, day_amount FROM customer_balances WHERE com_id = ?`;
  const latestAmountRows = await executeQuery(getLatestAmountQuery, [cl_id]);
  
  let old_amtlimit = 0;
  let old_balance = 0;
  let old_day_amount = 0;
  
  if (latestAmountRows.length > 0) {
    old_amtlimit = parseFloat(latestAmountRows[0].amtlimit) || 0;
    old_balance = parseFloat(latestAmountRows[0].balance) || 0;
    old_day_amount = parseFloat(latestAmountRows[0].day_amount) || 0;
  }

  const new_amtlimit = old_amtlimit - calculatedAmount;
  const new_balance = old_balance + calculatedAmount;
  const new_day_amount = old_day_amount + calculatedAmount;

  console.log('💰 Balance Update Calculation:', {
    old_available_balance: old_amtlimit,
    calculated_amount: calculatedAmount,
    new_available_balance: new_amtlimit,
    old_balance: old_balance,
    new_balance: new_balance
  });

  const now = getIndianTime();

  // Get current balance to determine limit system
  const balanceQuery = `SELECT day_limit, cst_limit, amtlimit, day_amount FROM customer_balances WHERE com_id = ?`;
  const balanceRows = await executeQuery(balanceQuery, [cl_id]);
  
  let updateBalanceQuery = '';
  let balanceType = '';
  let queryParams = [];
  
  // FIX: Define old_amount and new_amount variables
  let old_amount = 0;
  let new_amount = 0;
  
  if (balanceRows.length > 0) {
    const balanceData = balanceRows[0];
    const creditDays = parseInt(balanceData.day_limit, 10) || 0;
    
    if (creditDays > 0) {
      // Day limit system - update day_amount
      updateBalanceQuery = `
        UPDATE customer_balances 
        SET day_amount = day_amount + ?, 
            balance = balance + ?,
            updated_at = ? 
        WHERE com_id = ?
      `;
      balanceType = 'day_limit';
      queryParams = [calculatedAmount, calculatedAmount, now, cl_id];
      old_amount = old_day_amount;
      new_amount = new_day_amount;
      console.log('✅ Updated daily limit - day_amount increased by:', calculatedAmount);
    } else {
      // Credit limit system - update amtlimit
      updateBalanceQuery = `
        UPDATE customer_balances 
        SET amtlimit = amtlimit - ?, 
            balance = balance + ?,
            updated_at = ? 
        WHERE com_id = ?
      `;
      balanceType = 'credit_limit';
      queryParams = [calculatedAmount, calculatedAmount, now, cl_id];
      old_amount = old_amtlimit;
      new_amount = new_amtlimit;
      console.log('✅ Updated credit limit - amtlimit increased by:', calculatedAmount);
    }
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

  // Insert into filling history - FIXED: using defined old_amount and new_amount
  const insertHistoryQuery = `
    INSERT INTO filling_history 
    (rid, fs_id, product_id, sub_product_id, trans_type, current_stock, filling_qty, amount, 
     available_stock, filling_date, cl_id, created_by, old_amount, new_amount, remaining_limit) 
    VALUES (?, ?, ?, ?, 'Outward', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  await executeQuery(insertHistoryQuery, [
    rid, fs_id, product_id, sub_product_id || null, oldstock, aqty, calculatedAmount, 
    newStock, now, cl_id, userId, old_amount, new_amount, calculatedAmount
  ]);

  // Update station stock
  const updateStockQuery = `UPDATE filling_station_stocks SET stock = ? WHERE fs_id = ? AND product = ?`;
  await executeQuery(updateStockQuery, [newStock, fs_id, product_id]);

  // Handle non-billing stocks if needed
  if (billing_type == 2) {
    await handleNonBillingStocks(fs_id, product_id, aqty);
  }

  // Update wallet history with correct balance type
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
    const balanceQuery = `SELECT day_amount, amtlimit, day_limit, cst_limit FROM customer_balances WHERE com_id = ?`;
    const balanceRows = await executeQuery(balanceQuery, [cl_id]);
    
    if (balanceRows.length === 0) return;
    
    const balanceData = balanceRows[0];
    
    let oldBalance = 0;
    let newBalance = 0;
    let balanceLabel = '';
    
    if (balanceType === 'day_limit' || balanceData.day_limit > 0) {
      oldBalance = (balanceData.day_amount || 0) - deductedAmount;
      newBalance = balanceData.day_amount || 0;
      balanceLabel = 'Daily Limit';
    } else {
      oldBalance = (balanceData.amtlimit || 0) - deductedAmount;
      newBalance = balanceData.amtlimit || 0;
      balanceLabel = 'Credit Limit';
    }

    console.log('💰 Wallet History Update:', {
      balanceType,
      oldBalance,
      deductedAmount,
      newBalance,
      balanceLabel
    });

    await executeQuery(
      `INSERT INTO wallet_history (cl_id, rid, old_balance, deducted, c_balance, d_date, type, description) 
       VALUES (?, ?, ?, ?, ?, NOW(), 4, ?)`,
      [cl_id, rid, oldBalance, deductedAmount, newBalance, `Fuel Purchase - ${balanceLabel}`]
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