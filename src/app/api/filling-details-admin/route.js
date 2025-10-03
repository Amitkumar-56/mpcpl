// src/app/api/filling-details-admin/route.js
import fs from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { checkPermissions, verifyToken } from '../../../lib/auth';
import { executeQuery } from '../../../lib/db';

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
      console.warn('⚠️ ID missing in request');
      return new Response(JSON.stringify({ success: false, error: 'ID is required' }), { status: 400 });
    }

    let data;
    try {
      const query = `
        SELECT 
          fr.*,
          p.pname as product_name,
          fs.station_name,
          c.name as client_name,
          c.phone as client_phone,
          c.billing_type,
          cb.amtlimit,
          cb.hold_balance,
          cb.balance,
          fss.stock as station_stock,
          fr.price as fuel_price
        FROM filling_requests fr
        LEFT JOIN products p ON fr.product = p.id
        LEFT JOIN filling_stations fs ON fr.fs_id = fs.id
        LEFT JOIN customers c ON fr.cid = c.id
        LEFT JOIN customer_balances cb ON c.id = cb.com_id
        LEFT JOIN filling_station_stocks fss ON fr.fs_id = fss.fs_id AND fr.product = fss.product
        WHERE fr.id = ?
      `;
      const rows = await executeQuery(query, [id]);
      console.log('🔹 DB rows:', rows);

      if (rows.length === 0) {
        console.warn('⚠️ No request found for ID:', id);
        return new Response(JSON.stringify({ success: false, error: 'Request not found' }), { status: 404 });
      }

      data = rows[0];
      console.log('✅ Request data:', data);

    } catch (dbErr) {
      console.error('❌ DB function error:', dbErr);
      return new Response(JSON.stringify({ success: false, error: 'Database error' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, data }));

  } catch (err) {
    console.error('❌ API error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
  }
}

// POST - Update request with FIXED permission checking
export async function POST(request) {
  try {
    console.log('🚀 /filling-details-admin POST called');
    
    // Verify authentication
    const token = request.cookies?.get('token')?.value;
    console.log('🔐 Token present:', !!token);
    
    const decoded = verifyToken(token);
    console.log('🔐 Decoded token:', decoded);
    
    if (!decoded) {
      console.error('❌ Not authenticated');
      return NextResponse.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    console.log('✅ User authenticated:', decoded.userId);

    // Check general module access - FIXED: Use can_edit for updates
    const hasModuleAccess = await checkPermissions(decoded.userId, 'Filling Requests', 'can_edit');
    if (!hasModuleAccess) {
      console.error(`❌ User ${decoded.userId} lacks edit permission for Filling Requests`);
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied. You do not have permission to update filling requests.' 
      }, { status: 403 });
    }

    console.log('✅ User has edit permission for Filling Requests');

    return await handlePostRequest(request, decoded.userId);

  } catch (error) {
    console.error('❌ POST Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

async function handlePostRequest(request, userId) {
  try {
    console.log('🔍 Starting to parse form data...');
    const formData = await request.formData();
    console.log('✅ Form data parsed successfully');
    
    // Extract and validate all fields with better error handling
    const id = formData.get('id');
    const rid = formData.get('rid');
    const fs_id = formData.get('fs_id');
    const cl_id = formData.get('cl_id');
    const product_id = formData.get('product_id');
    const billing_type = formData.get('billing_type');
    const oldstock = parseFloat(formData.get('oldstock')) || 0;
    const amtlimit = parseFloat(formData.get('amtlimit')) || 0;
    const hold_balance = parseFloat(formData.get('hold_balance')) || 0;
    const price = parseFloat(formData.get('price')) || 0;
    const aqty = parseFloat(formData.get('aqty')) || 0;
    const status = formData.get('status');
    const remarks = formData.get('remarks');

    console.log('🔹 Extracted Form Data:', {
      id, rid, fs_id, cl_id, product_id, billing_type, oldstock, 
      amtlimit, hold_balance, price, aqty, status, remarks, userId
    });

    // Validate required fields
    if (!id || !rid) {
      console.error('❌ Missing required fields:', { id, rid });
      return NextResponse.json({ 
        success: false,
        error: 'Missing required fields: id and rid are required' 
      }, { status: 400 });
    }

    // Handle file uploads with better error handling
    let doc1Path = null, doc2Path = null, doc3Path = null;
    
    try {
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
        console.log('✅ doc1 uploaded:', doc1Path);
      }
      if (doc2File && doc2File.size > 0) {
        doc2Path = await handleFileUpload(doc2File);
        console.log('✅ doc2 uploaded:', doc2Path);
      }
      if (doc3File && doc3File.size > 0) {
        doc3Path = await handleFileUpload(doc3File);
        console.log('✅ doc3 uploaded:', doc3Path);
      }
    } catch (fileError) {
      console.error('❌ File upload error:', fileError);
      return NextResponse.json({ 
        success: false,
        error: `File upload failed: ${fileError.message}` 
      }, { status: 400 });
    }

    console.log('🔁 Starting database transaction...');
    await executeQuery('START TRANSACTION');

    try {
      let resultMessage = '';

      if (status === 'Processing') {
        console.log('🔄 Handling Processing status...');
        resultMessage = await handleProcessingStatus({
          cl_id, hold_balance, price, aqty, rid, userId
        });
      } else if (status === 'Completed') {
        console.log('🔄 Handling Completed status...');
        resultMessage = await handleCompletedStatus({
          id, rid, fs_id, cl_id, product_id, billing_type,
          oldstock, amtlimit, hold_balance, price, aqty,
          doc1Path, doc2Path, doc3Path, remarks, userId
        });
      } else if (status === 'Cancel') {
        console.log('🔄 Handling Cancel status...');
        resultMessage = await handleCancelStatus({
          id, remarks, doc1Path, doc2Path, doc3Path, userId
        });
      } else {
        console.log('🔄 Handling generic status update...');
        await updateFillingRequest({
          id, aqty, status, remarks, doc1Path, doc2Path, doc3Path, userId
        });
        resultMessage = 'Request updated successfully';
      }

      console.log('✅ Transaction completed, committing...');
      await executeQuery('COMMIT');

      console.log('✅ Update successful:', resultMessage);
      return NextResponse.json({ 
        success: true, 
        message: resultMessage,
        status: status
      });

    } catch (error) {
      console.error('❌ Transaction error, rolling back...', error);
      await executeQuery('ROLLBACK');
      return NextResponse.json({ 
        success: false,
        error: 'Transaction failed: ' + error.message 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error updating request:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Error updating request: ' + error.message 
    }, { status: 500 });
  }
}

async function handleProcessingStatus(data) {
  const { cl_id, hold_balance, price, aqty, rid, userId } = data;
  
  const calculatedHoldBalance = price * aqty;
  console.log('💰 Calculated hold balance:', calculatedHoldBalance);

  // Check customer limit
  const customerQuery = `SELECT cst_limit FROM customer_balances WHERE com_id = ?`;
  const customerRows = await executeQuery(customerQuery, [cl_id]);
  
  if (customerRows.length === 0 || customerRows[0].cst_limit <= 0) {
    throw new Error("Customer doesn't have limit to process this request");
  }

  // Update customer balance
  const updateBalanceQuery = `
    UPDATE customer_balances 
    SET amtlimit = amtlimit - ?, hold_balance = hold_balance + ? 
    WHERE com_id = ?
  `;
  await executeQuery(updateBalanceQuery, [calculatedHoldBalance, calculatedHoldBalance, cl_id]);

  // Update request status
  const updateRequestQuery = `
    UPDATE filling_requests 
    SET status = 'Processing', pdate = NOW(), pcid = ?
    WHERE rid = ?
  `;
  await executeQuery(updateRequestQuery, [userId, rid]);

  return 'Status updated to Processing';
}

async function handleCompletedStatus(data) {
  const {
    id, rid, fs_id, cl_id, product_id, billing_type,
    oldstock, amtlimit, hold_balance, price, aqty,
    doc1Path, doc2Path, doc3Path, remarks, userId
  } = data;

  const calculatedHoldBalance = price * aqty;
  const newStock = oldstock - aqty;
  const c_balance = amtlimit - calculatedHoldBalance;

  console.log('📊 Completion calculations:', {
    calculatedHoldBalance,
    newStock,
    c_balance
  });

  await updateFillingRequest({
    id, aqty, status: 'Completed', remarks, 
    doc1Path, doc2Path, doc3Path, userId,
    additionalFields: {
      completed_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      cdate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ccid: userId
    }
  });

  // Insert into history
  const insertHistoryQuery = `
    INSERT INTO filling_history 
    (rid, fs_id, product_id, trans_type, current_stock, filling_qty, amount, available_stock, filling_date, cl_id, created_by, remaining_limit) 
    VALUES (?, ?, ?, 'Outward', ?, ?, ?, ?, NOW(), ?, ?, ?)
  `;
  await executeQuery(insertHistoryQuery, [
    rid, fs_id, product_id, oldstock, aqty, calculatedHoldBalance, newStock, cl_id, userId, c_balance
  ]);

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

  // Update customer balances
  await updateCustomerBalances(cl_id, calculatedHoldBalance, rid, amtlimit);

  return 'Request Completed Successfully';
}

async function handleCancelStatus(data) {
  const { id, remarks, doc1Path, doc2Path, doc3Path, userId } = data;

  await updateFillingRequest({
    id, 
    aqty: null, 
    status: 'Cancel', 
    remarks, 
    doc1Path, 
    doc2Path, 
    doc3Path, 
    userId,
    additionalFields: {
      cadate: new Date().toISOString().slice(0, 19).replace('T', ' '),
      cacid: userId,
      cancel_remark: remarks
    }
  });

  return 'Request Cancelled Successfully';
}

async function updateFillingRequest(data) {
  const {
    id, aqty, status, remarks, doc1Path, doc2Path, doc3Path, userId,
    additionalFields = {}
  } = data;

  let updateQuery = `
    UPDATE filling_requests 
    SET status = ?, remark = COALESCE(?, remark),
        status_updated_by = ?,
        doc1 = COALESCE(?, doc1),
        doc2 = COALESCE(?, doc2),
        doc3 = COALESCE(?, doc3)
  `;

  const queryParams = [status, remarks, userId, doc1Path, doc2Path, doc3Path];

  if (aqty !== null && aqty !== undefined) {
    updateQuery += `, aqty = ?`;
    queryParams.push(aqty);
  }

  Object.keys(additionalFields).forEach(field => {
    updateQuery += `, ${field} = ?`;
    queryParams.push(additionalFields[field]);
  });

  updateQuery += ` WHERE id = ?`;
  queryParams.push(id);

  console.log('📝 Executing update query:', updateQuery, queryParams);
  await executeQuery(updateQuery, queryParams);
  console.log('✅ Filling request updated successfully');
}

async function handleNonBillingStocks(station_id, product_id, aqty) {
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
}

async function updateCustomerBalances(cl_id, hold_balance, rid, old_balance) {
  await executeQuery(
    `UPDATE customer_balances SET hold_balance = hold_balance - ?, amtlimit = amtlimit - ? WHERE com_id = ?`,
    [hold_balance, hold_balance, cl_id]
  );

  const c_balance = old_balance - hold_balance;
  await executeQuery(
    `INSERT INTO wallet_history (cl_id, rid, old_balance, deducted, c_balance, d_date, type) 
     VALUES (?, ?, ?, ?, ?, NOW(), 4)`,
    [cl_id, rid, old_balance, hold_balance, c_balance]
  );

  await executeQuery(
    `UPDATE customer_balances SET balance = balance + ? WHERE com_id = ?`,
    [hold_balance, cl_id]
  );
}

async function handleFileUpload(file) {
  if (!file || file.size === 0) return null;

  try {
    // Add file size validation (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error(`File size exceeds 5MB limit: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    const uploadDir = './public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const timestamp = Date.now();
    const originalName = file.name || 'document';
    const fileExtension = path.extname(originalName) || '.jpg';
    const filename = `${timestamp}_${originalName.replace(/\s+/g, '_')}`;
    const filepath = path.join(uploadDir, filename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filepath, buffer);

    console.log('✅ File uploaded successfully:', `/uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error('❌ File upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}