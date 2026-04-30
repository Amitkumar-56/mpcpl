import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

const ensureTable = async () => {
  const tableSql = `
    CREATE TABLE IF NOT EXISTS mfg_entry_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_code VARCHAR(50) UNIQUE,
      vehicle_number VARCHAR(50) NOT NULL,
      driver_name VARCHAR(100),
      driver_phone VARCHAR(20),
      purpose VARCHAR(255),
      material_name VARCHAR(255),
      quantity DECIMAL(10,2),
      unit VARCHAR(20),
      status VARCHAR(50) DEFAULT 'pending_approval',
      otp_code VARCHAR(10),
      otp_expiry DATETIME,
      entry_photo LONGTEXT,
      exit_photo LONGTEXT,
      entry_time DATETIME,
      exit_time DATETIME,
      created_by INT,
      created_by_name VARCHAR(100),
      processed_by INT,
      processed_by_name VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  await executeQuery(tableSql);
};

export async function GET(request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = "SELECT * FROM mfg_entry_requests WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (vehicle_number LIKE ? OR driver_name LIKE ? OR request_code LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY created_at DESC LIMIT 50";
    const data = await executeQuery(query, params);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTable();
    const body = await request.json();
    const { vehicle_number, driver_name, driver_phone, purpose, created_by, created_by_name, role } = body;

    const requestCode = `REQ-${Date.now().toString().slice(-6)}`;
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 30 * 60000); // 30 mins

    // If Admin (role 5), auto-approve to 'pending' (ready for OTP)
    // If Guard (role 8), set to 'pending_approval'
    const status = Number(role) === 5 ? 'pending' : 'pending_approval';

    const sql = `
      INSERT INTO mfg_entry_requests 
      (request_code, vehicle_number, driver_name, driver_phone, purpose, status, otp_code, otp_expiry, created_by, created_by_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await executeQuery(sql, [
      requestCode, vehicle_number, driver_name, driver_phone, purpose, 
      status, otpCode, otpExpiry, created_by, created_by_name
    ]);

    return NextResponse.json({ success: true, requestCode, otpCode });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await ensureTable();
    const body = await request.json();
    const { id, action, otp_code, entry_photo, exit_photo, processed_by, processed_by_name } = body;

    if (action === 'approve') {
      await executeQuery("UPDATE mfg_entry_requests SET status = 'pending' WHERE id = ?", [id]);
      return NextResponse.json({ success: true, message: 'Approved' });
    }

    if (action === 'verify_otp') {
      const rows = await executeQuery("SELECT * FROM mfg_entry_requests WHERE id = ? AND otp_code = ?", [id, otp_code]);
      if (rows.length === 0) throw new Error("Invalid OTP");
      
      const req = rows[0];
      if (new Date() > new Date(req.otp_expiry)) throw new Error("OTP Expired");

      await executeQuery("UPDATE mfg_entry_requests SET status = 'approved' WHERE id = ?", [id]);
      return NextResponse.json({ success: true, message: 'OTP Verified' });
    }

    if (action === 'process_entry') {
      if (!entry_photo) throw new Error("Entry photo required");
      await executeQuery(`
        UPDATE mfg_entry_requests 
        SET status = 'processing', 
            entry_photo = ?, 
            entry_time = CURRENT_TIMESTAMP,
            processed_by = ?,
            processed_by_name = ?
        WHERE id = ?
      `, [entry_photo, processed_by, processed_by_name, id]);
      return NextResponse.json({ success: true, message: 'Vehicle Inside' });
    }

    if (action === 'process_exit') {
      if (!exit_photo) throw new Error("Exit photo required");
      await executeQuery(`
        UPDATE mfg_entry_requests 
        SET status = 'completed', 
            exit_photo = ?, 
            exit_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [exit_photo, id]);
      return NextResponse.json({ success: true, message: 'Vehicle Exited' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
