// src/app/api/manufacturing/entry-requests/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET - Fetch entry requests with filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const date = searchParams.get('date');
    const vehicle = searchParams.get('vehicle'); // exact vehicle search for security guard

    let query = "SELECT * FROM mfg_entry_requests WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (vehicle_number LIKE ? OR driver_name LIKE ? OR request_code LIKE ? OR driver_phone LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (vehicle) {
      // Exact match for security guard vehicle search
      query += " AND UPPER(REPLACE(vehicle_number, ' ', '')) = UPPER(REPLACE(?, ' ', ''))";
      params.push(vehicle);
    }
    if (date) {
      query += " AND DATE(created_at) = ?";
      params.push(date);
    }

    query += " ORDER BY created_at DESC";
    const entries = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("Entry requests fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Admin creates a new entry request
export async function POST(request) {
  try {
    const body = await request.json();
    const { vehicle_number, driver_name, driver_phone, purpose, material_type, material_name, quantity, unit, remarks, created_by, created_by_name, role } = body;

    if (!vehicle_number) {
      return NextResponse.json({ success: false, error: "Vehicle number is required" }, { status: 400 });
    }

    // Auto-generate request code: MER-YYYYMMDD-0001
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const [lastEntry] = await executeQuery(
      "SELECT request_code FROM mfg_entry_requests WHERE request_code LIKE ? ORDER BY id DESC LIMIT 1",
      [`MER-${today}-%`]
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastEntry?.request_code) {
      const match = lastEntry.request_code.match(/MER-\d+-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const request_code = `MER-${today}-${String(nextNum).padStart(4, '0')}`;

    // Generate 6-digit OTP
    const otp_code = String(Math.floor(100000 + Math.random() * 900000));

    // Status handling: If Security Guard (role 8) creates it, it needs approval
    const initialStatus = Number(role) === 8 ? 'pending_approval' : 'pending';

    const result = await executeQuery(
      `INSERT INTO mfg_entry_requests (request_code, vehicle_number, driver_name, driver_phone, purpose, material_type, material_name, quantity, unit, remarks, otp_code, otp_generated_at, status, created_by, created_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)`,
      [request_code, vehicle_number.toUpperCase().replace(/\s+/g, ''), driver_name || null, driver_phone || null, purpose || null, material_type || null, material_name || null, quantity || 0, unit || 'kg', remarks || null, otp_code, initialStatus, created_by || null, created_by_name || null]
    );

    return NextResponse.json({
      success: true,
      message: "Entry request created successfully",
      id: result.insertId,
      request_code,
      otp_code
    });
  } catch (error) {
    console.error("Entry request create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update entry request (Security Guard processes / admin updates)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, action, otp_code, entry_photo, exit_photo, entry_location_lat, entry_location_lng, entry_location_name, exit_location_lat, exit_location_lng, exit_location_name, processed_by, processed_by_name, status, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Request ID is required" }, { status: 400 });
    }

    // Get current request
    const [currentRequest] = await executeQuery("SELECT * FROM mfg_entry_requests WHERE id = ?", [id]);
    if (!currentRequest) {
      return NextResponse.json({ success: false, error: "Request not found" }, { status: 404 });
    }

    // Action: approve - Admin/TL approves the request created by Security Guard
    if (action === 'approve') {
      await executeQuery(
        "UPDATE mfg_entry_requests SET status = 'pending' WHERE id = ?",
        [id]
      );
      return NextResponse.json({ success: true, message: "Request approved and OTP ready" });
    }

    // Action: verify_otp - Security guard verifies OTP
    if (action === 'verify_otp') {
      if (!otp_code) {
        return NextResponse.json({ success: false, error: "OTP is required" }, { status: 400 });
      }
      if (currentRequest.otp_code !== otp_code) {
        return NextResponse.json({ success: false, error: "Invalid OTP. Please try again." }, { status: 400 });
      }
      // Check OTP expiry (30 minutes)
      if (currentRequest.otp_generated_at) {
        const otpTime = new Date(currentRequest.otp_generated_at).getTime();
        const now = Date.now();
        if (now - otpTime > 30 * 60 * 1000) {
          return NextResponse.json({ success: false, error: "OTP has expired. Please ask admin to regenerate." }, { status: 400 });
        }
      }
      await executeQuery(
        "UPDATE mfg_entry_requests SET otp_verified = 1, status = 'approved' WHERE id = ?",
        [id]
      );
      return NextResponse.json({ success: true, message: "OTP verified successfully" });
    }

    // Action: process_entry - Security guard processes entry with photo & location
    if (action === 'process_entry') {
      const updates = ["status = 'processing'", "entry_time = NOW()"];
      const params = [];

      if (entry_photo) { updates.push("entry_photo = ?"); params.push(entry_photo); }
      if (entry_location_lat) { updates.push("entry_location_lat = ?"); params.push(entry_location_lat); }
      if (entry_location_lng) { updates.push("entry_location_lng = ?"); params.push(entry_location_lng); }
      if (entry_location_name) { updates.push("entry_location_name = ?"); params.push(entry_location_name); }
      if (processed_by) { updates.push("processed_by = ?"); params.push(processed_by); }
      if (processed_by_name) { updates.push("processed_by_name = ?"); params.push(processed_by_name); }

      params.push(id);
      await executeQuery(`UPDATE mfg_entry_requests SET ${updates.join(', ')} WHERE id = ?`, params);
      return NextResponse.json({ success: true, message: "Entry processed successfully" });
    }

    // Action: process_exit - Security guard processes exit with photo & location
    if (action === 'process_exit') {
      const updates = ["status = 'completed'", "exit_time = NOW()"];
      const params = [];

      if (exit_photo) { updates.push("exit_photo = ?"); params.push(exit_photo); }
      if (exit_location_lat) { updates.push("exit_location_lat = ?"); params.push(exit_location_lat); }
      if (exit_location_lng) { updates.push("exit_location_lng = ?"); params.push(exit_location_lng); }
      if (exit_location_name) { updates.push("exit_location_name = ?"); params.push(exit_location_name); }

      params.push(id);
      await executeQuery(`UPDATE mfg_entry_requests SET ${updates.join(', ')} WHERE id = ?`, params);
      return NextResponse.json({ success: true, message: "Exit processed successfully" });
    }

    // Action: regenerate_otp - Admin regenerates OTP
    if (action === 'regenerate_otp') {
      const newOtp = String(Math.floor(100000 + Math.random() * 900000));
      await executeQuery(
        "UPDATE mfg_entry_requests SET otp_code = ?, otp_generated_at = NOW(), otp_verified = 0 WHERE id = ?",
        [newOtp, id]
      );
      return NextResponse.json({ success: true, message: "OTP regenerated", otp_code: newOtp });
    }

    // Action: cancel - Admin cancels the request
    if (action === 'cancel') {
      await executeQuery("UPDATE mfg_entry_requests SET status = 'cancelled' WHERE id = ?", [id]);
      return NextResponse.json({ success: true, message: "Request cancelled" });
    }

    // Generic update
    const updates = [];
    const params = [];

    if (status) { updates.push("status = ?"); params.push(status); }
    if (remarks !== undefined) { updates.push("remarks = ?"); params.push(remarks); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    params.push(id);
    await executeQuery(`UPDATE mfg_entry_requests SET ${updates.join(', ')} WHERE id = ?`, params);

    return NextResponse.json({ success: true, message: "Request updated" });
  } catch (error) {
    console.error("Entry request update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
