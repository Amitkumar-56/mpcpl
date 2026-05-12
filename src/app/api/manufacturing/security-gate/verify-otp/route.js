import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, otp, type } = body;

    if (!id || !otp) {
      return NextResponse.json({ success: false, error: "Request ID and OTP are required" }, { status: 400 });
    }

    // Get the entry record
    const [entry] = await executeQuery(
      "SELECT * FROM mfg_entry_requests WHERE id = ?",
      [id]
    );

    if (!entry) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    // Verify OTP
    if (entry.otp_code !== otp) {
      return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 400 });
    }

    // OTP expiration check disabled for testing
    // To enable: uncomment the code below
    /*
    const otpGeneratedTime = new Date(entry.otp_generated_at);
    const currentTime = new Date();
    const timeDiff = (currentTime - otpGeneratedTime) / (1000 * 60); // minutes
    
    if (timeDiff > 30) {
      return NextResponse.json({ success: false, error: "OTP expired. Please request a new OTP." }, { status: 400 });
    }
    */

    if (type === 'entry') {
      // Process entry - mark as In-Plant and set entry time
      const updateResult = await executeQuery(
        `UPDATE mfg_entry_requests 
         SET otp_verified = TRUE, status = 'In-Plant', entry_time = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [id]
      );

      console.log("Update result:", updateResult);

      // Verify the update
      const [updatedEntry] = await executeQuery(
        "SELECT status FROM mfg_entry_requests WHERE id = ?",
        [id]
      );
      
      console.log("Updated entry status:", updatedEntry);

      return NextResponse.json({
        success: true,
        message: "Entry verified successfully",
        entryTime: new Date().toISOString(),
        newStatus: updatedEntry?.status
      });
    }

    return NextResponse.json({ success: false, error: "Invalid operation type" }, { status: 400 });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json({ success: false, error: "Verification failed" }, { status: 500 });
  }
}
