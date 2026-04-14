// src/app/api/manufacturing/setup/route.js
// One-time setup API to create manufacturing tables
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const tables = [
      // 1. Raw Materials
      `CREATE TABLE IF NOT EXISTS mfg_raw_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_code VARCHAR(50) NOT NULL UNIQUE,
        material_name VARCHAR(200) NOT NULL,
        category ENUM('type_a_raw', 'other_raw') NOT NULL DEFAULT 'type_a_raw',
        unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
        current_stock DECIMAL(15,3) DEFAULT 0,
        min_stock_level DECIMAL(15,3) DEFAULT 0,
        supplier_id INT NULL,
        description TEXT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // 2. Finished Goods
      `CREATE TABLE IF NOT EXISTS mfg_finished_goods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_code VARCHAR(50) NOT NULL UNIQUE,
        product_name VARCHAR(200) NOT NULL,
        category VARCHAR(100) NULL,
        unit ENUM('kg', 'litre', 'pcs', 'box') NOT NULL DEFAULT 'kg',
        current_stock DECIMAL(15,3) DEFAULT 0,
        batch_id INT NULL,
        description TEXT NULL,
        status ENUM('active', 'inactive') DEFAULT 'active',
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // 3. Batches
      `CREATE TABLE IF NOT EXISTS mfg_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_code VARCHAR(50) NOT NULL UNIQUE,
        batch_date DATE NOT NULL,
        product_name VARCHAR(200) NULL,
        target_quantity DECIMAL(15,3) DEFAULT 0,
        actual_quantity DECIMAL(15,3) DEFAULT 0,
        unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
        status ENUM('draft', 'in_process', 'testing', 'completed', 'rejected') DEFAULT 'draft',
        notes TEXT NULL,
        created_by INT NULL,
        completed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // 4. Batch Materials
      `CREATE TABLE IF NOT EXISTS mfg_batch_materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_id INT NOT NULL,
        material_id INT NOT NULL,
        material_name VARCHAR(200) NULL,
        quantity_used DECIMAL(15,3) DEFAULT 0,
        unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      // 5. Tanker Allocation
      `CREATE TABLE IF NOT EXISTS mfg_tanker_allocation (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tanker_code VARCHAR(100) NOT NULL,
        tanker_type ENUM('type_a_raw', 'other_raw') NOT NULL DEFAULT 'type_a_raw',
        material_id INT NULL,
        material_name VARCHAR(200) NULL,
        batch_id INT NULL,
        quantity DECIMAL(15,3) DEFAULT 0,
        unit ENUM('kg', 'litre') NOT NULL DEFAULT 'kg',
        driver_name VARCHAR(200) NULL,
        vehicle_number VARCHAR(50) NULL,
        allocation_date DATE NOT NULL,
        status ENUM('allocated', 'in_transit', 'arrived', 'unloaded', 'completed') DEFAULT 'allocated',
        notes TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // 6. Lab Tests
      `CREATE TABLE IF NOT EXISTS mfg_lab_tests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_code VARCHAR(50) NOT NULL UNIQUE,
        batch_id INT NOT NULL,
        batch_code VARCHAR(50) NULL,
        test_method VARCHAR(200) NOT NULL,
        test_date DATE NOT NULL,
        tested_by VARCHAR(200) NULL,
        parameters TEXT NULL,
        result_value VARCHAR(200) NULL,
        result_status ENUM('pending', 'pass', 'fail', 'retest') DEFAULT 'pending',
        remarks TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`,
      // 7. Security Gate Entries
      `CREATE TABLE IF NOT EXISTS security_gate_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_code VARCHAR(50) NOT NULL UNIQUE,
        tanker_code VARCHAR(100) NULL,
        vehicle_number VARCHAR(50) NOT NULL,
        driver_name VARCHAR(200) NULL,
        driver_phone VARCHAR(20) NULL,
        material_type VARCHAR(200) NULL,
        material_name VARCHAR(200) NULL,
        quantity DECIMAL(15,3) DEFAULT 0,
        unit ENUM('kg', 'litre') DEFAULT 'kg',
        direction ENUM('entry', 'exit') NOT NULL,
        entry_time TIMESTAMP NULL,
        exit_time TIMESTAMP NULL,
        entry_photo LONGTEXT NULL,
        exit_photo LONGTEXT NULL,
        gate_status ENUM('arrived', 'under_processing', 'ready_to_exit', 'exited') DEFAULT 'arrived',
        purpose VARCHAR(200) NULL,
        remarks TEXT NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    ];

    const results = [];
    for (const sql of tables) {
      try {
        await executeQuery(sql);
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        results.push({ table: tableName, status: 'created' });
      } catch (err) {
        const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1] || 'unknown';
        results.push({ table: tableName, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({ success: true, message: "Manufacturing tables setup complete", results });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
