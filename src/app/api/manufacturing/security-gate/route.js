import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// Ensure table exists with all proper columns
async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS mfg_entry_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      request_code VARCHAR(50) UNIQUE,
      vehicle_number VARCHAR(50) NOT NULL,
      driver_name VARCHAR(100) NOT NULL,
      driver_phone VARCHAR(20),
      purpose VARCHAR(255),
      material_type VARCHAR(50),
      material_name VARCHAR(100),
      quantity DECIMAL(15, 2) DEFAULT 0.00,
      unit VARCHAR(20) DEFAULT 'KG',
      remarks TEXT,
      otp_code VARCHAR(10),
      otp_generated_at TIMESTAMP NULL,
      otp_verified BOOLEAN DEFAULT FALSE,
      status ENUM('Pending', 'In-Plant', 'Completed', 'Rejected') DEFAULT 'Pending',
      entry_photo LONGTEXT,
      exit_photo LONGTEXT,
      entry_location_lat DECIMAL(10, 8),
      entry_location_lng DECIMAL(11, 8),
      entry_location_name VARCHAR(255),
      exit_location_lat DECIMAL(10, 8),
      exit_location_lng DECIMAL(11, 8),
      exit_location_name VARCHAR(255),
      entry_time TIMESTAMP NULL,
      exit_time TIMESTAMP NULL,
      created_by INT,
      created_by_name VARCHAR(100),
      processed_by INT,
      processed_by_name VARCHAR(100),
      branch_code VARCHAR(50),
      lab_verified BOOLEAN DEFAULT FALSE,
      lab_remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );
  `);

  // Safe column additions
  const columnsToAdd = [
    { name: 'branch_code', definition: 'VARCHAR(50) DEFAULT NULL' },
    { name: 'lab_verified', definition: 'BOOLEAN DEFAULT FALSE' },
    { name: 'lab_remarks', definition: 'TEXT DEFAULT NULL' },
  ];

  for (const col of columnsToAdd) {
    try {
      const [existing] = await executeQuery(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'mfg_entry_requests' AND COLUMN_NAME = ?`,
        [col.name]
      );
      if (!existing) {
        await executeQuery(`ALTER TABLE mfg_entry_requests ADD COLUMN ${col.name} ${col.definition}`);
      }
    } catch (e) {
      // Column might already exist
    }
  }
}

export async function GET(request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const search = searchParams.get('search') || '';
    const vehicleNumber = searchParams.get('vehicle') || '';
    const allStatuses = searchParams.get('all') || '';

    let query = 'SELECT id, request_code, vehicle_number, driver_name, driver_phone, purpose, material_type, material_name, quantity, unit, remarks, otp_code, otp_verified, status, entry_time, exit_time, entry_location_name, exit_location_name, branch_code, lab_verified, lab_remarks, created_by_name, processed_by_name, created_at, updated_at FROM mfg_entry_requests';
    let params = [];
    let conditions = [];

    if (vehicleNumber) {
      conditions.push('vehicle_number LIKE ?');
      params.push(`%${vehicleNumber}%`);
    }

    if (status && !allStatuses) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(vehicle_number LIKE ? OR driver_name LIKE ? OR request_code LIKE ? OR material_name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC LIMIT 200';

    const results = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching entry requests:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTable();
    const body = await request.json();
    const {
      vehicle_number,
      driver_name,
      driver_phone,
      purpose,
      material_type,
      material_name,
      quantity,
      unit,
      remarks
    } = body;

    if (!vehicle_number || !driver_name) {
      return NextResponse.json({ success: false, error: "Vehicle number and driver name are required" }, { status: 400 });
    }

    // Auto-generate branch code based on purpose
    let branchCode = 'MFG';
    if (purpose) {
      const purposeMap = {
        'Raw Material Delivery': 'RM',
        'Finished Goods Dispatch': 'FG',
        'Maintenance / Service': 'MNT',
        'Others': 'OTH'
      };
      branchCode = purposeMap[purpose] || 'MFG';
    }

    const timestamp = Date.now();
    const requestCode = `${branchCode}-${timestamp}`;
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await executeQuery(`
      INSERT INTO mfg_entry_requests (
        request_code, vehicle_number, driver_name, driver_phone,
        purpose, material_type, material_name, quantity, unit, remarks,
        otp_code, otp_generated_at, status, branch_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'Pending', ?)
    `, [requestCode, vehicle_number.toUpperCase(), driver_name, driver_phone, purpose, material_type, material_name, quantity || 0, unit || 'KG', remarks, otpCode, branchCode]);

    return NextResponse.json({
      success: true,
      message: "Entry request created successfully",
      requestId: result.insertId,
      requestCode,
      otpCode
    });
  } catch (error) {
    console.error("Error creating entry request:", error);
    return NextResponse.json({ success: false, error: "Failed to create request" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await ensureTable();
    const body = await request.json();
    const { id, lab_verified, lab_remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Request ID is required" }, { status: 400 });
    }

    // Lab verification update
    if (lab_verified !== undefined) {
      await executeQuery(`UPDATE mfg_entry_requests SET lab_verified = ?, lab_remarks = ? WHERE id = ?`, [lab_verified, lab_remarks || '', id]);
      return NextResponse.json({ success: true, message: "Lab verification updated" });
    }

    return NextResponse.json({ success: false, error: "No valid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating entry request:", error);
    return NextResponse.json({ success: false, error: "Failed to update" }, { status: 500 });
  }
}
