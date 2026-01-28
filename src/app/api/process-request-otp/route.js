// src/app/api/process-request-otp/route.js
import { getCurrentUser, verifyToken } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🔄 PROCESS REQUEST WITH OTP API CALLED');
    
    // Get current user (fallback to token if needed)
    let currentUser = await getCurrentUser();
    if (!currentUser) {
      try {
        const cookieStore = await cookies();
        let token = cookieStore.get('token')?.value;
        if (!token && typeof request.headers?.get === 'function') {
          const authHeader = request.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }
        if (token) {
          const decoded = verifyToken(token);
          const userId = decoded?.userId || decoded?.id;
          if (userId) {
            const users = await executeQuery(
              `SELECT id, name, role FROM employee_profile WHERE id = ?`,
              [userId]
            );
            if (users.length > 0) {
              currentUser = { userId: users[0].id, name: users[0].name, role: users[0].role };
            }
          }
        }
      } catch {}
    }
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    // Allow any authenticated employee to perform OTP operations

    const body = await request.json();
    const { requestId, otp, action } = body;
    
    console.log('📋 Process Request Data:', { 
      requestId, 
      otp: otp ? '***masked***' : 'empty',
      userId: currentUser.userId,
      action: action || 'verify'
    });
    
    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Request ID is required' },
        { status: 400 }
      );
    }

    // Generate OTP (6-digit) with resend limit
    if (action === 'generate') {
      try {
        const attemptRows = await executeQuery(
          `SELECT COUNT(*) as cnt 
           FROM otp_logs 
           WHERE request_id = ? 
             AND verified_by = ? 
             AND bypassed = 2 
             AND verified_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)`,
          [requestId, currentUser.userId]
        );
        const attempts = Array.isArray(attemptRows) && attemptRows.length > 0 ? parseInt(attemptRows[0].cnt || 0) : 0;
        if (attempts >= 5) {
          return NextResponse.json(
            { success: false, error: 'Maximum OTP resend attempts reached (5). Please wait and try again.' },
            { status: 403 }
          );
        }
      } catch {}

      const reqRows = await executeQuery(
        `SELECT id, rid FROM filling_requests WHERE id = ? LIMIT 1`,
        [requestId]
      );
      if (!reqRows || reqRows.length === 0) {
        return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
      }
      const req = reqRows[0];
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      await executeQuery(
        `UPDATE filling_requests SET otp = ? WHERE id = ?`,
        [generatedOtp, requestId]
      );
      try {
        await executeQuery(
          `INSERT INTO otp_logs (request_id, otp_entered, verified_by, verified_at, bypassed) 
           VALUES (?, NULL, ?, NOW(), 2)`,
          [requestId, currentUser.userId]
        );
      } catch {}
      return NextResponse.json({
        success: true,
        message: 'OTP generated and sent',
        rid: req.rid,
        otp: generatedOtp
      });
    }

    // OTP must be exactly 6 digits
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: 'OTP must be exactly 6 digits' },
        { status: 400 }
      );
    }

    // 1. Get request details
    const requestQuery = `
      SELECT fr.*, c.name as customer_name, c.phone as customer_phone
      FROM filling_requests fr
      LEFT JOIN customers c ON fr.cid = c.id
      WHERE fr.id = ?
    `;
    
    const requestData = await executeQuery(requestQuery, [requestId]);
    
    if (!requestData || requestData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }
    
    const requestInfo = requestData[0];
    
    // 2. Check if request is already processed
    if (requestInfo.status !== 'Pending') {
      return NextResponse.json({
        success: true,
        message: 'Request is already processed',
        requestStatus: requestInfo.status,
        rid: requestInfo.rid,
        processed: true
      });
    }
    
    // 3. OTP must match the latest stored on request
    if (String(requestInfo.otp || '') !== String(otp)) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP' },
        { status: 400 }
      );
    }
    
    console.log('OTP Accepted:', otp);
    
    try {
      await executeQuery(
        `INSERT INTO otp_logs (request_id, otp_entered, verified_by, verified_at, bypassed) 
         VALUES (?, ?, ?, NOW(), ?)`,
        [requestId, otp, currentUser.userId, 0]
      );
    } catch (logError) {
      console.log('📝 OTP log skipped (table may not exist):', logError.message);
    }
    
    // 4. Reserve amount atomically using amtlimit and hold_balance
    let productId = null;
    try {
      if (requestInfo.sub_product_id) {
        const prodRows = await executeQuery(
          `SELECT product_id FROM product_codes WHERE id = ? LIMIT 1`,
          [requestInfo.sub_product_id]
        );
        if (prodRows && prodRows.length > 0) {
          productId = prodRows[0].product_id;
        }
      }
    } catch {}
    const qtyToUse = parseFloat(requestInfo.aqty || requestInfo.qty || 0) || 0;
    const price = await getFuelPrice(
      requestInfo.fs_id,
      productId || parseInt(requestInfo.product) || 0,
      requestInfo.sub_product_id || 0,
      requestInfo.cid,
      0
    );
    if (!price || price <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Deal price not set. Please contact Admin to update price then process.',
        limitTitle: 'Deal Price Alert',
        limitOverdue: true
      }, { status: 400 });
    }
    const requiredAmount = price * qtyToUse;
    const holdUpdate = await executeQuery(
      `UPDATE customer_balances 
       SET amtlimit = amtlimit - ?, 
           hold_balance = hold_balance + ? 
       WHERE com_id = ? 
         AND (amtlimit - hold_balance) >= ?`,
      [requiredAmount, requiredAmount, requestInfo.cid, requiredAmount]
    );
    if (!holdUpdate || holdUpdate.affectedRows === 0) {
      const balRows = await executeQuery(
        `SELECT amtlimit, hold_balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
        [requestInfo.cid]
      );
      const amtlimit = balRows && balRows.length ? parseFloat(balRows[0].amtlimit || 0) : 0;
      const hold = balRows && balRows.length ? parseFloat(balRows[0].hold_balance || 0) : 0;
      const available = Math.max(0, amtlimit - hold);
      return NextResponse.json({
        success: false,
        error: `Insufficient balance. Required: ₹${requiredAmount.toFixed(2)}, Available: ₹${available.toFixed(2)}. Please contact Admin to update limit then process.`,
        limitOverdue: true,
        limitTitle: 'Credit Limit Overdue',
        requiredAmount,
        available
      }, { status: 400 });
    }

    // 5. Update request status to Processing
    const updateResult = await executeQuery(
      `UPDATE filling_requests 
       SET status = 'Processing', 
           status_updated_by = ?
       WHERE id = ?`,
      [currentUser.userId, requestId]
    );
    
    if (updateResult.affectedRows === 0) {
      throw new Error('Failed to update request status');
    }
    
    // 5. Create processing log
    await executeQuery(
      `INSERT INTO filling_logs 
       (request_id, processed_by, processed_date) 
       VALUES (?, ?, NOW())`,
      [requestInfo.rid, currentUser.userId]
    );
    
    // 6. Create audit log
    try {
      const { createAuditLog } = await import('@/lib/auditLog');
      await createAuditLog({
        page: 'Filling Requests',
        uniqueCode: requestInfo.rid,
        section: 'Request Processing',
        userId: currentUser.userId,
        userName: currentUser.name || 'System',
        remarks: `Request processed via OTP verification.`,
        oldValue: { status: 'Pending' },
        newValue: { status: 'Processing' },
        recordType: 'filling_request',
        recordId: requestId
      });
    } catch (auditError) {
      console.error('Audit log error:', auditError);
    }
    
    console.log('✅ Request processed successfully:', requestInfo.rid);
    
    return NextResponse.json({
      success: true,
      message: 'Request processed successfully',
      rid: requestInfo.rid,
      newStatus: 'Processing',
      processed: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Process Request OTP API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: error.message,
        details: error.message
      },
      { status: 500 }
    );
  }
}

async function getFuelPrice(station_id, product_id, sub_product_id, com_id, defaultPrice = 0) {
  const sId = parseInt(sub_product_id);
  const hasSubProduct = !isNaN(sId) && sId > 0;

  if (hasSubProduct) {
    const exactRows = await executeQuery(
      "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND sub_product_id = ? AND com_id = ? AND is_active = 1 ORDER BY updated_date DESC LIMIT 1",
      [station_id, product_id, sub_product_id, com_id]
    );
    if (Array.isArray(exactRows) && exactRows.length > 0) {
      return parseFloat(exactRows[0].price);
    }
  }

  if (hasSubProduct) {
    const stationRows = await executeQuery(
      "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND sub_product_id = ? AND (com_id IS NULL OR com_id = 0) AND is_active = 1 ORDER BY updated_date DESC LIMIT 1",
      [station_id, product_id, sub_product_id]
    );
    if (Array.isArray(stationRows) && stationRows.length > 0) {
      return parseFloat(stationRows[0].price);
    }
  }

  const customerRows = await executeQuery(
    "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND com_id = ? AND (sub_product_id IS NULL OR sub_product_id = 0 OR sub_product_id = '') AND is_active = 1 ORDER BY updated_date DESC LIMIT 1",
    [station_id, product_id, com_id]
  );
  if (Array.isArray(customerRows) && customerRows.length > 0) {
    return parseFloat(customerRows[0].price);
  }

  const productRows = await executeQuery(
    "SELECT price FROM deal_price WHERE station_id = ? AND product_id = ? AND (com_id IS NULL OR com_id = 0) AND (sub_product_id IS NULL OR sub_product_id = 0 OR sub_product_id = '') AND is_active = 1 ORDER BY updated_date DESC LIMIT 1",
    [station_id, product_id]
  );
  if (Array.isArray(productRows) && productRows.length > 0) {
    return parseFloat(productRows[0].price);
  }

  return defaultPrice || 0;
}
