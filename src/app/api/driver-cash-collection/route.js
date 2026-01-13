import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auditLog";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      driver_name,
      driver_phone,
      vehicle_number,
      customer_name,
      amount,
      collected_date,
      remarks
    } = body || {};

    if (!driver_name || !vehicle_number || !customer_name || !amount || parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Driver name, vehicle number, customer name aur valid amount zaroori hain." },
        { status: 400 }
      );
    }

    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS driver_cash_collections (
          id INT AUTO_INCREMENT PRIMARY KEY,
          driver_name VARCHAR(255) NOT NULL,
          driver_phone VARCHAR(20),
          vehicle_number VARCHAR(50) NOT NULL,
          customer_name VARCHAR(255) NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          collected_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          remarks TEXT,
          created_by INT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_customer_name (customer_name),
          INDEX idx_vehicle_number (vehicle_number),
          INDEX idx_collected_date (collected_date)
        )
      `);

      await executeQuery(`
        CREATE TABLE IF NOT EXISTS driver_cash_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          collection_id INT NOT NULL,
          action VARCHAR(50) NOT NULL,
          performed_by INT NULL,
          performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          remarks TEXT,
          INDEX idx_collection_id (collection_id),
          INDEX idx_performed_at (performed_at)
        )
      `);
    } catch (tableErr) {
      return NextResponse.json({ error: "Table create fail: " + tableErr.message }, { status: 500 });
    }

    let userId = null;
    let userName = null;
    try {
      const currentUser = await getCurrentUser();
      userId = currentUser?.userId || currentUser?.id || null;
      userName = currentUser?.userName || null;
      if (!userName && userId) {
        const users = await executeQuery(`SELECT name FROM employee_profile WHERE id = ?`, [userId]);
        if (users.length > 0 && users[0].name) {
          userName = users[0].name;
        }
      }
    } catch {
    }

    const insertSql = `
      INSERT INTO driver_cash_collections
      (driver_name, driver_phone, vehicle_number, customer_name, amount, collected_date, remarks, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const values = [
      String(driver_name).trim(),
      driver_phone ? String(driver_phone).trim() : null,
      String(vehicle_number).trim(),
      String(customer_name).trim(),
      parseFloat(amount),
      collected_date ? new Date(collected_date) : null,
      remarks || null,
      userId || null
    ];

    try {
      const result = await executeQuery(insertSql, values);
      const newId = result.insertId;

      try {
        await executeQuery(
          `INSERT INTO driver_cash_history (collection_id, action, performed_by, performed_at, remarks)
           VALUES (?, 'create', ?, NOW(), ?)`,
          [newId, userId || null, `Amount: ₹${parseFloat(amount).toLocaleString('en-IN')} - Customer: ${customer_name}`]
        );
      } catch {
      }

      try {
        await createAuditLog({
          page: 'Driver Cash',
          uniqueCode: `DRC-${newId}`,
          section: 'Cash Collection',
          userId: userId,
          userName: userName || (userId ? `Employee ID: ${userId}` : null),
          action: 'create',
          remarks: `Driver ${driver_name} ne ${customer_name} se ₹${parseFloat(amount).toLocaleString('en-IN')} collect kiya`,
          oldValue: null,
          newValue: {
            driver_name,
            driver_phone,
            vehicle_number,
            customer_name,
            amount: parseFloat(amount),
            collected_date: collected_date || null
          },
          recordType: 'driver_cash',
          recordId: newId
        });
      } catch {
      }

      return NextResponse.json({ success: true, id: newId });
    } catch (err) {
      return NextResponse.json({ error: "Save fail: " + err.message }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

