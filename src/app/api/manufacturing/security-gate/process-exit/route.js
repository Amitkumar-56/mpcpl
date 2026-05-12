import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, otp, exit_photo, exit_location_lat, exit_location_lng, exit_location_name } = body;

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

    // Check if vehicle is currently inside
    if (entry.status !== 'In-Plant') {
      return NextResponse.json({ success: false, error: "Vehicle is not currently inside the premises" }, { status: 400 });
    }

    // Process exit - mark as Completed and set exit time
    await executeQuery(
      `UPDATE mfg_entry_requests 
       SET status = 'Completed', 
           exit_time = CURRENT_TIMESTAMP,
           exit_photo = ?,
           exit_location_lat = ?,
           exit_location_lng = ?,
           exit_location_name = ?,
           otp_verified = TRUE
       WHERE id = ?`,
      [exit_photo || null, exit_location_lat || null, exit_location_lng || null, exit_location_name || null, id]
    );

    return NextResponse.json({
      success: true,
      message: "Exit processed successfully",
      exitTime: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error processing exit:", error);
    return NextResponse.json({ success: false, error: "Exit processing failed" }, { status: 500 });
  }
}
