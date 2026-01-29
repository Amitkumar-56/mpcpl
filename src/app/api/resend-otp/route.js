import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { requestId } = body;
    
    // Generate new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update OTP in database (extend expiry)
    const result = await executeQuery(
      `UPDATE otp_verifications 
       SET otp = ?, 
           expires_at = DATE_ADD(NOW(), INTERVAL 10 MINUTE),
           verified = 0,
           verified_at = NULL
       WHERE request_id = ?`,
      [newOtp, requestId]
    );
    
    if (result.affectedRows === 0) {
      // If no record exists, create one
      await executeQuery(
        `INSERT INTO otp_verifications 
         (request_id, otp, expires_at) 
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))`,
        [requestId, newOtp]
      );
    }
    
    console.log(`🔄 OTP resent for request ${requestId}: ${newOtp}`);
    
    return NextResponse.json({
      success: true,
      otp: newOtp,
      message: 'OTP resent successfully'
    });
    
  } catch (error) {
    console.error('❌ Resend OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend OTP' },
      { status: 500 }
    );
  }
}