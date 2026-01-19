import { getCurrentUser } from '@/lib/auth';
import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { requestId } = body;
    
    // Get request details
    const requestData = await executeQuery(
      `SELECT * FROM filling_requests WHERE id = ?`,
      [requestId]
    );
    
    if (!requestData || requestData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }
    
    const requestInfo = requestData[0];
    
    // Check if OTP is verified
    const otpCheck = await executeQuery(
      `SELECT * FROM otp_verifications 
       WHERE request_id = ? 
       AND verified = 1`,
      [requestId]
    );
    
    if (otpCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'OTP not verified' },
        { status: 400 }
      );
    }
    
    // Update request status to Processing
    await executeQuery(
      `UPDATE filling_requests 
       SET status = 'Processing', 
           status_updated_by = ?
       WHERE id = ?`,
      [currentUser.userId, requestId]
    );
    
    // Create processing log
    await executeQuery(
      `INSERT INTO filling_logs 
       (request_id, processed_by, processed_date) 
       VALUES (?, ?, NOW())`,
      [requestInfo.rid, currentUser.userId]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Request processed successfully',
      rid: requestInfo.rid
    });
    
  } catch (error) {
    console.error('❌ Process request error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}