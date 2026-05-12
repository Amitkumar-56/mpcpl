import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "Entry ID is required" }, { status: 400 });
    }

    const [entry] = await executeQuery(
      "SELECT * FROM mfg_entry_requests WHERE id = ?",
      [id]
    );

    if (!entry) {
      return NextResponse.json({ success: false, error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        vehicle_number: entry.vehicle_number,
        status: entry.status,
        otp_code: entry.otp_code,
        otp_verified: entry.otp_verified,
        entry_time: entry.entry_time,
        exit_time: entry.exit_time
      }
    });
  } catch (error) {
    console.error("Error checking entry status:", error);
    return NextResponse.json({ success: false, error: "Failed to check status" }, { status: 500 });
  }
}
