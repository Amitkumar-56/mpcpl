import { executeQuery } from "@/lib/db";
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { requestId, requestRid, customerPhone } = body;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database (expires in 10 minutes)
    const result = await executeQuery(
      `INSERT INTO otp_verifications 
       (request_id, request_rid, otp, phone_number, expires_at) 
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))
       ON DUPLICATE KEY UPDATE 
       otp = VALUES(otp), 
       expires_at = VALUES(expires_at),
       verified = 0,
       verified_at = NULL`,
      [requestId, requestRid, otp, customerPhone]
    );
    
    // In production, send OTP via SMS
    // const smsSent = await sendSMS(customerPhone, `Your OTP for request ${requestRid} is ${otp}`);
    
    console.log(`✅ OTP generated for ${requestRid}: ${otp}`);
    
    return NextResponse.json({
      success: true,
      otp: otp,
      message: 'OTP generated successfully'
    });
    
  } catch (error) {
    console.error('❌ Generate OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate OTP' },
      { status: 500 }
    );
  }
}