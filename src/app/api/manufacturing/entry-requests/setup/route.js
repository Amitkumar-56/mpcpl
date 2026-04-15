// src/app/api/manufacturing/entry-requests/setup/route.js
// One-time setup API to create the mfg_entry_requests table
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Create table if not exists
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS mfg_entry_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_code VARCHAR(50) NOT NULL UNIQUE,
        vehicle_number VARCHAR(50) NOT NULL,
        driver_name VARCHAR(200) NULL,
        driver_phone VARCHAR(20) NULL,
        purpose VARCHAR(500) NULL,
        material_type VARCHAR(200) NULL,
        material_name VARCHAR(200) NULL,
        quantity DECIMAL(15,3) DEFAULT 0,
        unit VARCHAR(20) DEFAULT 'kg',
        remarks TEXT NULL,
        otp_code VARCHAR(10) NULL,
        otp_generated_at TIMESTAMP NULL,
        otp_verified TINYINT(1) DEFAULT 0,
        status ENUM('pending', 'approved', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
        entry_photo LONGTEXT NULL,
        exit_photo LONGTEXT NULL,
        entry_location_lat DECIMAL(10,8) NULL,
        entry_location_lng DECIMAL(11,8) NULL,
        entry_location_name VARCHAR(300) NULL,
        exit_location_lat DECIMAL(10,8) NULL,
        exit_location_lng DECIMAL(11,8) NULL,
        exit_location_name VARCHAR(300) NULL,
        entry_time TIMESTAMP NULL,
        exit_time TIMESTAMP NULL,
        created_by INT NULL,
        created_by_name VARCHAR(200) NULL,
        processed_by INT NULL,
        processed_by_name VARCHAR(200) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create indexes (ignore errors if already exist)
    try { await executeQuery("CREATE INDEX idx_mfg_entry_vehicle ON mfg_entry_requests(vehicle_number)"); } catch {}
    try { await executeQuery("CREATE INDEX idx_mfg_entry_status ON mfg_entry_requests(status)"); } catch {}
    try { await executeQuery("CREATE INDEX idx_mfg_entry_code ON mfg_entry_requests(request_code)"); } catch {}
    try { await executeQuery("CREATE INDEX idx_mfg_entry_created_at ON mfg_entry_requests(created_at)"); } catch {}

    return NextResponse.json({ success: true, message: "mfg_entry_requests table created successfully" });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
