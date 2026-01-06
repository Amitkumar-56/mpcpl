import { createAuditLog } from '@/lib/auditLog';
import { verifyToken } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import fs from 'fs';
import { cookies } from 'next/headers';
import { NextResponse } from "next/server";
import path from 'path';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    console.log('🔍 Fetching request with ID:', id);
    
    const query = `
      SELECT 
        fr.*, 
        c.name as customer_name, 
        c.phone as customer_phone,
        fs.station_name as loading_station,
        p.pname as product_name,
        pc.pcode as product_code,
        ep.name as updated_by_name,
        cb.amtlimit as customer_balance
      FROM filling_requests fr
      LEFT JOIN customers c ON c.id = fr.cid
      LEFT JOIN filling_stations fs ON fs.id = fr.fs_id
      LEFT JOIN products p ON p.id = fr.product
      LEFT JOIN product_codes pc ON pc.id = fr.fl_id
      LEFT JOIN employee_profile ep ON ep.id = fr.status_updated_by
      LEFT JOIN customer_balances cb ON cb.com_id = fr.cid
      WHERE fr.id = ?
    `;

    const requestData = await executeQuery(query, [id]);
    
    console.log('📦 Database result:', requestData);
    
    if (requestData.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({ request: requestData[0] });
  } catch (error) {
    console.error('❌ Database error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status, qty, aqty, vehicle_number, driver_number, remark } = body;

    console.log('💾 Updating request:', { id, ...body });

    // Check if request exists
    const checkQuery = "SELECT * FROM filling_requests WHERE id = ?";
    const existingRequest = await executeQuery(checkQuery, [id]);
    
    if (existingRequest.length === 0) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const oldRequest = existingRequest[0];
    const oldQty = parseFloat(oldRequest.aqty ?? oldRequest.qty ?? 0) || 0;
    const newQty = aqty !== undefined
      ? parseFloat(aqty) || 0
      : (qty !== undefined ? parseFloat(qty) || 0 : oldQty);
    const price = parseFloat(oldRequest.price || 0) || 0;
    const oldAmount = parseFloat(oldRequest.totalamt ?? (price * oldQty)) || (price * oldQty);
    const newAmount = price * newQty;
    const deltaAmount = newAmount - oldAmount;
    const wasCompleted = String(oldRequest.status) === 'Completed' || status === 'Completed';

    let updateQuery = "UPDATE filling_requests SET ";
    const updateParams = [];
    const updateFields = [];

    if (status) {
      updateFields.push("status = ?");
      updateParams.push(status);
      
      // If status is being updated to Completed, set completed_date
      if (status === "Completed") {
        updateFields.push("completed_date = NOW()");
      }
    }

    if (aqty !== undefined) {
      updateFields.push("aqty = ?");
      updateParams.push(parseFloat(aqty));
      updateFields.push("totalamt = ?");
      updateParams.push(newAmount);
    } else if (qty !== undefined) {
      updateFields.push("qty = ?");
      updateFields.push("aqty = ?");
      updateParams.push(parseFloat(qty));
      updateParams.push(parseFloat(qty));
      updateFields.push("totalamt = ?");
      updateParams.push(newAmount);
    }

    if (vehicle_number) {
      updateFields.push("vehicle_number = ?");
      updateParams.push(vehicle_number);
    }

    if (driver_number) {
      updateFields.push("driver_number = ?");
      updateParams.push(driver_number);
    }

    if (remark !== undefined) {
      updateFields.push("remark = ?");
      updateParams.push(remark);
    }

    // Add updated timestamp
    updateFields.push("updated = NOW()");

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updateQuery += updateFields.join(", ");
    updateQuery += " WHERE id = ?";
    updateParams.push(id);

    console.log('📝 Update query:', updateQuery);
    console.log('📝 Update params:', updateParams);

    const result = await executeQuery(updateQuery, updateParams);

    console.log('✅ Update result:', result);

    if (result.affectedRows > 0) {
      // Get user info for audit log
      let userId = null;
      let userName = null;
      try {
        const cookieStore = cookies();
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
      } catch (userError) {
        console.error('Error getting user info:', userError);
      }

      // Financial updates only if request is Completed (existing or now)
      if ((aqty !== undefined || qty !== undefined) && wasCompleted) {
        try {
          const cid = parseInt(oldRequest.cid);
          const clientRows = await executeQuery(`SELECT client_type FROM customers WHERE id = ?`, [cid]);
          const clientType = clientRows.length ? parseInt(clientRows[0].client_type) : null;
          const balanceRows = await executeQuery(
            `SELECT amtlimit, balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
            [cid]
          );
          const prevAmtLimit = balanceRows.length ? parseFloat(balanceRows[0].amtlimit || 0) : 0;
          const prevUsed = balanceRows.length ? parseFloat(balanceRows[0].balance || 0) : 0;

          if (clientType === 3) {
            await executeQuery(
              `UPDATE customer_balances SET balance = COALESCE(balance, 0) + ? WHERE com_id = ?`,
              [deltaAmount, cid]
            );
          } else {
            const nextAmtLimit = Math.max(0, prevAmtLimit - deltaAmount);
            const nextUsed = prevUsed + deltaAmount;
            await executeQuery(
              `UPDATE customer_balances SET amtlimit = ?, balance = ? WHERE com_id = ?`,
              [nextAmtLimit, nextUsed, cid]
            );
          }

          const historyRow = await executeQuery(
            `SELECT id, new_amount, remaining_limit FROM filling_history WHERE rid = ? ORDER BY filling_date DESC, id DESC LIMIT 1`,
            [oldRequest.rid]
          );
          if (historyRow.length) {
            const h = historyRow[0];
            const prevNewAmount = parseFloat(h.new_amount || oldAmount) || oldAmount;
            const updatedNewAmount = prevNewAmount + deltaAmount;
            let updatedRemaining = null;
            if (clientType !== 3) {
              const afterBalance = await executeQuery(
                `SELECT amtlimit FROM customer_balances WHERE com_id = ? LIMIT 1`,
                [cid]
              );
              updatedRemaining = afterBalance.length ? parseFloat(afterBalance[0].amtlimit || 0) : null;
            }
            await executeQuery(
              `UPDATE filling_history SET filling_qty = ?, amount = ?, new_amount = ?, remaining_limit = ? WHERE id = ?`,
              [newQty, newAmount, updatedNewAmount, updatedRemaining, h.id]
            );
          }
        } catch (finErr) {
          console.error('⚠️ Financial update error:', finErr);
        }
      }

      // Create audit log
      const newRequest = { ...oldRequest, ...body, totalamt: newAmount };
      const deltaQty = parseFloat((newQty - oldQty).toFixed(2));
      const deltaAmtLog = parseFloat((newAmount - oldAmount).toFixed(2));
      const remarksDetail = qty !== undefined 
        ? `ΔQty: ${deltaQty} L, ΔAmount: ₹${deltaAmtLog.toFixed(2)}`
        : `Request fields updated`;
      
      await createAuditLog({
        page: 'Filling Requests',
        uniqueCode: `REQUEST-${id}`,
        section: 'Edit Request',
        userId: userId,
        userName: userName,
        action: 'edit',
        remarks: `Filling request updated: ${oldRequest.rid || id}. ${remarksDetail}`,
        oldValue: oldRequest,
        newValue: newRequest,
        recordType: 'filling_request',
        recordId: parseInt(id)
      });

      return NextResponse.json({ 
        success: true, 
        message: "Request updated successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Failed to update request" 
      }, { status: 500 });
    }
  } catch (error) {
    console.error("❌ PUT API Error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const id = formData.get('id');
    const aqty = formData.get('aqty');
    const remarks = formData.get('remark') || formData.get('remarks') || '';
    const doc1 = formData.get('doc1');
    const doc2 = formData.get('doc2');
    const doc3 = formData.get('doc3');

    if (!id) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const rows = await executeQuery(`SELECT * FROM filling_requests WHERE id = ?`, [id]);
    if (!rows.length) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const oldRequest = rows[0];

    let doc1Path = oldRequest.doc1 || null;
    let doc2Path = oldRequest.doc2 || null;
    let doc3Path = oldRequest.doc3 || null;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'requests', String(id));
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    async function saveFile(file) {
      const filename = `${Date.now()}_${file.name}`;
      const filePath = path.join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/requests/${id}/${filename}`;
    }

    if (doc1 && doc1.size > 0) doc1Path = await saveFile(doc1);
    if (doc2 && doc2.size > 0) doc2Path = await saveFile(doc2);
    if (doc3 && doc3.size > 0) doc3Path = await saveFile(doc3);

    const price = parseFloat(oldRequest.price || 0) || 0;
    const oldQty = parseFloat(oldRequest.aqty ?? oldRequest.qty ?? 0) || 0;
    const newQty = aqty !== null && aqty !== undefined ? parseFloat(aqty) || 0 : oldQty;
    const oldAmount = parseFloat(oldRequest.totalamt ?? (price * oldQty)) || (price * oldQty);
    const newAmount = price * newQty;
    const deltaAmount = newAmount - oldAmount;
    
    console.log('📊 Edit Request Data:', {
      id,
      oldQty,
      newQty,
      oldAmount,
      newAmount,
      deltaAmount,
      oldRemark: oldRequest.remark,
      newRemark: remarks,
      hasDoc1: !!doc1,
      hasDoc2: !!doc2,
      hasDoc3: !!doc3
    });

    // Check if remark column exists
    let hasRemarkColumn = true;
    try {
      const colsInfo = await executeQuery('SHOW COLUMNS FROM filling_requests');
      const colSet = new Set(colsInfo.map(r => r.Field || r.field));
      hasRemarkColumn = colSet.has('remark');
    } catch (colError) {
      console.warn('Could not check remark column:', colError.message);
    }
    
    const updateQuery = `
      UPDATE filling_requests
      SET doc1 = ?, doc2 = ?, doc3 = ?, aqty = ?, totalamt = ?${hasRemarkColumn ? ', remark = ?' : ''}
      WHERE id = ?
    `;
    
    const updateParams = [doc1Path, doc2Path, doc3Path, newQty, newAmount];
    if (hasRemarkColumn) {
      updateParams.push(remarks);
    }
    updateParams.push(id);
    
    console.log('💾 Updating filling request:', {
      id,
      oldQty,
      newQty,
      oldAmount,
      newAmount,
      deltaAmount,
      remarks,
      hasRemarkColumn,
      updateQuery
    });
    
    let updateResult;
    try {
      updateResult = await executeQuery(updateQuery, updateParams);
      
      console.log('✅ Update result:', {
        affectedRows: updateResult?.affectedRows || 0,
        changedRows: updateResult?.changedRows || 0
      });
      
      if (!updateResult || updateResult.affectedRows === 0) {
        console.error('❌ Update failed - no rows affected');
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update request. No rows were affected. Please check if the request ID is correct.' 
        }, { status: 500 });
      }
    } catch (updateError) {
      console.error('❌ Update query error:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error while updating request',
        details: updateError.message 
      }, { status: 500 });
    }
    
    // Verify the update was successful
    try {
      const verifyQuery = await executeQuery(`SELECT aqty, totalamt, ${hasRemarkColumn ? 'remark,' : ''} doc1, doc2, doc3 FROM filling_requests WHERE id = ?`, [id]);
      if (verifyQuery.length > 0) {
        const updated = verifyQuery[0];
        console.log('✅ Verified update:', {
          aqty: updated.aqty,
          totalamt: updated.totalamt,
          remark: hasRemarkColumn ? updated.remark : 'N/A',
          doc1: updated.doc1 ? 'Updated' : 'No change',
          doc2: updated.doc2 ? 'Updated' : 'No change',
          doc3: updated.doc3 ? 'Updated' : 'No change'
        });
      }
    } catch (verifyError) {
      console.warn('Could not verify update:', verifyError.message);
    }

    const wasCompleted = String(oldRequest.status) === 'Completed';
    
    // ✅ Update balance, outstanding, and filling_history for completed requests
    if (wasCompleted && aqty !== null && aqty !== undefined && deltaAmount !== 0) {
      try {
        const cid = parseInt(oldRequest.cid);
        
        // Get customer info
        const clientRows = await executeQuery(`SELECT client_type, billing_type FROM customers WHERE id = ?`, [cid]);
        const clientType = clientRows.length ? parseInt(clientRows[0].client_type) : null;
        const billingType = clientRows.length ? parseInt(clientRows[0].billing_type) : null;
        const isNonBilling = billingType === 2; // Non-billing customers
        const isDayLimitCustomer = clientType === 3; // Day limit customers
        
        // Get current balance info
        const balanceRows = await executeQuery(
          `SELECT amtlimit, balance, day_limit FROM customer_balances WHERE com_id = ? LIMIT 1`,
          [cid]
        );
        const currentAmtLimit = balanceRows.length ? parseFloat(balanceRows[0].amtlimit || 0) : 0;
        const currentBalance = balanceRows.length ? parseFloat(balanceRows[0].balance || 0) : 0;
        const dayLimit = balanceRows.length ? parseFloat(balanceRows[0].day_limit || 0) : 0;
        
        console.log('💰 Balance Update Info:', {
          cid,
          clientType,
          billingType,
          isDayLimitCustomer,
          isNonBilling,
          currentAmtLimit,
          currentBalance,
          dayLimit,
          oldAmount,
          newAmount,
          deltaAmount
        });
        
        // ✅ CORRECT LOGIC: Reverse old transaction, then apply new one
        // deltaAmount = newAmount - oldAmount
        // If deltaAmount < 0 (decrease): balance increases, outstanding decreases
        // If deltaAmount > 0 (increase): balance decreases, outstanding increases
        
        if (isDayLimitCustomer) {
          // Day limit customers: Only update outstanding, no balance/amtlimit changes
          // Outstanding is tracked in filling_requests table (payment_status = 0)
          // No balance changes needed for day limit customers
          console.log('📅 Day limit customer - no balance update needed');
        } else if (isNonBilling) {
          // Non-billing (prepaid): Update balance only
          // Balance = prepaid balance (decreases when used)
          // When amount decreases: balance increases (we refund)
          // When amount increases: balance decreases (we charge more)
          // Current balance already has oldAmount deducted, so we reverse it and apply new
          const newBalance = currentBalance + oldAmount - newAmount; // = currentBalance - deltaAmount
          await executeQuery(
            `UPDATE customer_balances SET balance = ? WHERE com_id = ?`,
            [Math.max(0, newBalance), cid]
          );
          console.log('💳 Non-billing balance updated:', { 
            oldBalance: currentBalance, 
            newBalance: Math.max(0, newBalance),
            deltaAmount 
          });
        } else {
          // Billing customers: Update both amtlimit and balance
          // amtlimit = remaining credit limit (decreases when used)
          // balance = amount used/outstanding (increases when used)
          // Current values already have oldAmount applied:
          //   currentAmtLimit = originalAmtLimit - oldAmount
          //   currentBalance = originalBalance + oldAmount
          // We need to reverse oldAmount and apply newAmount:
          //   newAmtLimit = originalAmtLimit - newAmount = currentAmtLimit - deltaAmount
          //   newBalance = originalBalance + newAmount = currentBalance + deltaAmount
          const newAmtLimit = currentAmtLimit - deltaAmount;
          const newBalance = currentBalance + deltaAmount;
          
          await executeQuery(
            `UPDATE customer_balances SET amtlimit = ?, balance = ? WHERE com_id = ?`,
            [Math.max(0, newAmtLimit), Math.max(0, newBalance), cid]
          );
          console.log('💳 Billing balance updated:', { 
            oldAmtLimit: currentAmtLimit, 
            newAmtLimit: Math.max(0, newAmtLimit),
            oldBalance: currentBalance,
            newBalance: Math.max(0, newBalance),
            deltaAmount
          });
        }
        
        // ✅ Update filling_history for the transaction
        const historyRow = await executeQuery(
          `SELECT id, new_amount, remaining_limit, amount FROM filling_history 
           WHERE rid = ? AND trans_type = 'Outward' 
           ORDER BY filling_date DESC, id DESC LIMIT 1`,
          [oldRequest.rid]
        );
        
        if (historyRow.length > 0) {
          const h = historyRow[0];
          const prevAmount = parseFloat(h.amount || oldAmount) || oldAmount;
          const prevNewAmount = parseFloat(h.new_amount || 0) || 0;
          
          // Calculate new values
          // new_amount represents cumulative amount after this transaction
          // We need to reverse the old transaction and apply the new one
          const updatedAmount = newAmount; // New transaction amount
          const updatedNewAmount = prevNewAmount - prevAmount + newAmount; // Reverse old, add new
          
          // Get updated remaining limit (should match updated amtlimit)
          let updatedRemaining = null;
          if (!isDayLimitCustomer && !isNonBilling) {
            const afterBalance = await executeQuery(
              `SELECT amtlimit FROM customer_balances WHERE com_id = ? LIMIT 1`,
              [cid]
            );
            updatedRemaining = afterBalance.length ? parseFloat(afterBalance[0].amtlimit || 0) : null;
          } else if (isDayLimitCustomer && dayLimit > 0) {
            // For day limit customers, remaining_limit might be day_limit related
            // Check if there's a day_limit field we should use
            updatedRemaining = dayLimit;
          }
          
          await executeQuery(
            `UPDATE filling_history 
             SET filling_qty = ?, amount = ?, new_amount = ?, remaining_limit = ? 
             WHERE id = ?`,
            [newQty, updatedAmount, updatedNewAmount, updatedRemaining, h.id]
          );
          
          console.log('📝 Filling history updated:', {
            historyId: h.id,
            rid: oldRequest.rid,
            oldQty: oldQty,
            newQty: newQty,
            oldAmount: prevAmount,
            newAmount: updatedAmount,
            oldNewAmount: prevNewAmount,
            updatedNewAmount: updatedNewAmount,
            updatedRemaining: updatedRemaining,
            isDayLimitCustomer,
            isNonBilling
          });
        } else {
          console.warn('⚠️ No filling_history record found for rid:', oldRequest.rid);
        }
        
      } catch (finErr) {
        console.error('⚠️ Financial update error:', finErr);
        console.error('Error stack:', finErr.stack);
        // Don't fail the entire request, but log the error
      }
    } else if (wasCompleted) {
      console.log('ℹ️ No quantity change, skipping balance update');
    }

    let userId = null;
    let userName = null;
    try {
      const cookieStore = cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          userId = decoded.userId || decoded.id;
          if (userId) {
            const users = await executeQuery(
              `SELECT id, name FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              userName = users[0].name;
              console.log('👤 User info fetched:', { userId, userName });
            } else {
              console.warn('⚠️ User not found in employee_profile:', userId);
            }
          }
        } else {
          console.warn('⚠️ Token verification failed');
        }
      } else {
        console.warn('⚠️ No token found in cookies');
      }
    } catch (userErr) {
      console.error('⚠️ Error fetching user info:', userErr);
    }

    // ✅ Create edit log - ONLY if there are actual changes
    let editLogCreated = false;
    let editLogError = null;
    
    // ✅ Check if there are actual changes
    const hasAqtyChange = oldRequest.aqty !== newQty;
    const hasRemarksChange = oldRequest.remark !== remarks;
    const hasDoc1Change = doc1Path && doc1Path !== oldRequest.doc1;
    const hasDoc2Change = doc2Path && doc2Path !== oldRequest.doc2;
    const hasDoc3Change = doc3Path && doc3Path !== oldRequest.doc3;
    const hasAnyChange = hasAqtyChange || hasRemarksChange || hasDoc1Change || hasDoc2Change || hasDoc3Change;
    
    if (!hasAnyChange) {
      console.log('ℹ️ No changes detected, skipping edit log creation');
    } else {
      try {
        // Use rid (request ID) - MUST use rid (string like "MP000005") not id (numeric)
        // This is critical for matching in the fetch query
        const requestId = oldRequest.rid || String(oldRequest.id);
        
        if (!oldRequest.rid) {
          console.warn('⚠️ Request has no rid, using id as fallback:', oldRequest.id);
        }
        
        // Ensure userId is not null - use fallback if needed
        const finalUserId = userId || 1; // Use 1 as fallback if userId is null
        const finalUserName = userName || `Employee ID: ${finalUserId}`;
        
        const changes = JSON.stringify({
          edited_by_id: finalUserId,
          edited_by_name: finalUserName,
          aqty: hasAqtyChange ? { from: oldRequest.aqty, to: newQty } : null,
          remarks: hasRemarksChange ? { from: oldRequest.remark, to: remarks } : null,
          doc1: hasDoc1Change ? { to: doc1Path } : null,
          doc2: hasDoc2Change ? { to: doc2Path } : null,
          doc3: hasDoc3Change ? { to: doc3Path } : null
        });
        
        console.log('📝 Creating edit log (changes detected):', {
          request_id: requestId,
          rid: oldRequest.rid,
          id: oldRequest.id,
          edited_by: finalUserId,
          edited_by_name: finalUserName,
          changes: { hasAqtyChange, hasRemarksChange, hasDoc1Change, hasDoc2Change, hasDoc3Change }
        });
        
        // ✅ Ensure edit_logs table exists with correct structure
        try {
          await executeQuery(`
            CREATE TABLE IF NOT EXISTS edit_logs (
              id INT AUTO_INCREMENT PRIMARY KEY,
              request_id VARCHAR(100) NOT NULL COMMENT 'Request ID (rid)',
              edited_by INT NOT NULL COMMENT 'Employee ID who edited',
              edited_date DATETIME NOT NULL COMMENT 'Date and time of edit',
              old_status VARCHAR(50) COMMENT 'Previous status',
              new_status VARCHAR(50) COMMENT 'New status',
              old_aqty DECIMAL(10,2) DEFAULT 0 COMMENT 'Previous actual quantity',
              new_aqty DECIMAL(10,2) DEFAULT 0 COMMENT 'New actual quantity',
              changes TEXT COMMENT 'JSON string of all changes made',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_request_id (request_id),
              INDEX idx_edited_by (edited_by),
              INDEX idx_edited_date (edited_date)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
          `);
          console.log('✅ edit_logs table verified/created');
        } catch (tableErr) {
          console.error('❌ Error creating/checking edit_logs table:', tableErr);
          // Continue anyway - table might already exist with different structure
        }
        
        // Insert edit log
        const insertResult = await executeQuery(
          `INSERT INTO edit_logs (request_id, edited_by, edited_date, old_status, new_status, old_aqty, new_aqty, changes) 
           VALUES (?, ?, NOW(), ?, ?, ?, ?, ?)`,
          [requestId, finalUserId, oldRequest.status, oldRequest.status, oldRequest.aqty || 0, newQty || 0, changes]
        );
        
        editLogCreated = true;
        console.log('✅ Edit log created successfully:', {
          insertId: insertResult?.insertId,
          affectedRows: insertResult?.affectedRows,
          request_id: requestId,
          edited_by: finalUserId
        });
        
        // Verify the insert by fetching it back
        try {
          const verifyLog = await executeQuery(
            `SELECT * FROM edit_logs WHERE request_id = ? OR request_id = ? ORDER BY edited_date DESC LIMIT 1`,
            [requestId, String(oldRequest.id || '')]
          );
          if (verifyLog.length > 0) {
            console.log('✅ Verified edit log exists:', {
              id: verifyLog[0].id,
              request_id: verifyLog[0].request_id,
              request_id_type: typeof verifyLog[0].request_id,
              edited_by: verifyLog[0].edited_by,
              edited_date: verifyLog[0].edited_date,
              storedAs: verifyLog[0].request_id === requestId ? 'rid' : 'id'
            });
          } else {
            console.warn('⚠️ Edit log was inserted but could not be verified with request_id:', requestId, 'or id:', oldRequest.id);
          }
        } catch (verifyErr) {
          console.warn('⚠️ Could not verify edit log:', verifyErr.message);
        }
        
      } catch (logErr) {
        editLogCreated = false;
        editLogError = logErr.message;
        console.error('❌ Edit log insert failed:', logErr);
        console.error('Error details:', {
          message: logErr.message,
          sql: logErr.sql,
          code: logErr.code,
          errno: logErr.errno,
          sqlState: logErr.sqlState
        });
        // Don't fail the entire request if edit log fails, but log it clearly
      }
    }

    await createAuditLog({
      page: 'Filling Requests',
      uniqueCode: `REQUEST-${id}`,
      section: 'Edit Request',
      userId: userId,
      userName: userName,
      action: 'edit',
      remarks: `Filling request updated: ${oldRequest.rid || id}. ΔQty: ${(newQty - oldQty).toFixed(2)} L`,
      oldValue: oldRequest,
      newValue: { ...oldRequest, aqty: newQty, totalamt: newAmount, doc1: doc1Path, doc2: doc2Path, doc3: doc3Path, remark: remarks },
      recordType: 'filling_request',
      recordId: parseInt(id)
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Request updated successfully',
      editLogCreated,
      editLogError: editLogError || null
    });
  } catch (error) {
    console.error('❌ POST API Error:', error);
    return NextResponse.json({ error: 'Server error', details: error.message }, { status: 500 });
  }
}
