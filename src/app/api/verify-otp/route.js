import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { requestId, otp } = body;
    
    // Verify OTP from database
    const result = await executeQuery(
      `SELECT * FROM otp_verifications 
       WHERE request_id = ? 
       AND otp = ?
       AND expires_at > NOW()
       AND verified = 0`,
      [requestId, otp]
    );
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }
    
    // Mark OTP as verified
    await executeQuery(
      `UPDATE otp_verifications 
       SET verified = 1, verified_at = NOW()
       WHERE id = ?`,
      [result[0].id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    });
    
  } catch (error) {
    console.error('❌ Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}