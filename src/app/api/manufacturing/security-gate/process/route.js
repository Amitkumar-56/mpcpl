import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const {
      requestId,
      action,
      otp,
      photo,
      lat,
      lng,
      locationName
    } = await request.json(); // action: 'entry', 'exit', 'reject'

    if (!requestId || !action) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const [req] = await executeQuery("SELECT * FROM mfg_entry_requests WHERE id = ?", [requestId]);
    if (!req) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    let query = "";
    let params = [];

    if (action === 'entry') {
      if (req.status !== 'Pending') {
        return NextResponse.json({ success: false, error: "Vehicle is already in plant or completed" }, { status: 400 });
      }

      // OTP Verification
      if (!otp || otp !== req.otp_code) {
        return NextResponse.json({ success: false, error: "Invalid OTP code. Please try again." }, { status: 400 });
      }

      query = `
        UPDATE mfg_entry_requests 
        SET status = 'In-Plant', 
            entry_time = CURRENT_TIMESTAMP, 
            otp_verified = TRUE,
            entry_photo = ?,
            entry_location_lat = ?,
            entry_location_lng = ?,
            entry_location_name = ?
        WHERE id = ?
      `;
      params = [photo, lat, lng, locationName || 'Factory Gate', requestId];
    } else if (action === 'exit') {
      if (req.status !== 'In-Plant') {
        return NextResponse.json({ success: false, error: "Vehicle must be In-Plant before exit" }, { status: 400 });
      }
      query = `
        UPDATE mfg_entry_requests 
        SET status = 'Completed', 
            exit_time = CURRENT_TIMESTAMP,
            exit_photo = ?,
            exit_location_lat = ?,
            exit_location_lng = ?,
            exit_location_name = ?
        WHERE id = ?
      `;
      params = [photo, lat, lng, locationName || 'Factory Gate', requestId];
    } else if (action === 'reject') {
      query = "UPDATE mfg_entry_requests SET status = 'Rejected' WHERE id = ?";
      params = [requestId];
    } else {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      message: `Vehicle ${action} processed successfully`
    });

  } catch (error) {
    console.error("Error processing gate action:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred" }, { status: 500 });
  }
}
