import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, newOTP } = body;

    if (!id || !newOTP) {
      return NextResponse.json({ success: false, error: "Request ID and new OTP are required" }, { status: 400 });
    }

    // Update the OTP and reset verification status
    await executeQuery(
      `UPDATE mfg_entry_requests 
       SET otp_code = ?, 
           otp_generated_at = CURRENT_TIMESTAMP,
           otp_verified = FALSE
       WHERE id = ?`,
      [newOTP, id]
    );

    return NextResponse.json({
      success: true,
      message: "OTP regenerated successfully",
      newOTP
    });
  } catch (error) {
    console.error("Error regenerating OTP:", error);
    return NextResponse.json({ success: false, error: "Failed to regenerate OTP" }, { status: 500 });
  }
}
