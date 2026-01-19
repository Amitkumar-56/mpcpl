// src/app/api/process-request-otp/route.js
import { getCurrentUser } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('🔄 PROCESS REQUEST WITH OTP API CALLED');
    
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestId, otp } = body;
    
    console.log('📋 Process Request Data:', { 
      requestId, 
      otp: otp ? `${otp.substring(0, 2)}...` : 'empty',
      userId: currentUser.userId,
      environment: process.env.NODE_ENV
    });
    
    if (!requestId || !otp) {
      return NextResponse.json(
        { success: false, error: 'Request ID and OTP are required' },
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
    
    // 3. Check eligibility (balance check)
    if (requestInfo.eligibility && requestInfo.eligibility === 'No') {
      return NextResponse.json(
        { success: false, error: 'Request is not eligible for processing' },
        { status: 400 }
      );
    }
    
    // 🔥 FIXED: Development mode में OTP verification skip करें
    if (process.env.NODE_ENV === 'production') {
      // Production में ही OTP check करें
      console.log('🔍 Production mode: Checking OTP against database');
      
      const otpCheck = await executeQuery(
        `SELECT * FROM otp_verifications 
         WHERE request_id = ? 
         AND otp = ?
         AND expires_at > NOW()
         AND verified = 0`,
        [requestId, otp]
      );
      
      if (!otpCheck || otpCheck.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid or expired OTP' },
          { status: 400 }
        );
      }
      
      // Mark OTP as verified
      await executeQuery(
        `UPDATE otp_verifications 
         SET verified = 1, verified_at = NOW(), verified_by = ?
         WHERE id = ?`,
        [currentUser.userId, otpCheck[0].id]
      );
    } else {
      // Development mode में सिर्फ log करें
      console.log('🔧 Development mode: Skipping OTP verification');
      console.log('🔢 OTP received:', otp);
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
    
    // 6. Create processing log
    await executeQuery(
      `INSERT INTO filling_logs 
       (request_id, processed_by, processed_date) 
       VALUES (?, ?, NOW())`,
      [requestInfo.rid, currentUser.userId]
    );
    
    // 7. Create audit log
    try {
      const { createAuditLog } = await import('@/lib/auditLog');
      await createAuditLog({
        page: 'Filling Requests',
        uniqueCode: requestInfo.rid,
        section: 'Request Processing',
        userId: currentUser.userId,
        userName: currentUser.name || 'System',
        action: 'process',
        remarks: `Request processed via OTP verification: ${requestInfo.rid}`,
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
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}