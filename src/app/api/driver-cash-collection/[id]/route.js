import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { createAuditLog } from '@/lib/auditLog';

export async function GET(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Valid ID required' }, { status: 400 });
    }

    await ensureTables();

    const rows = await executeQuery(
      `SELECT id, driver_name, driver_phone, vehicle_number, customer_name, amount, collected_date, remarks, created_by, created_at 
       FROM driver_cash_collections WHERE id = ? LIMIT 1`,
      [id]
    );
    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, record: rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const id = parseInt(params.id);
    if (!id || isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Valid ID required' }, { status: 400 });
    }

    const body = await request.json();
    const updates = {
      driver_name: body.driver_name,
      driver_phone: body.driver_phone,
      vehicle_number: body.vehicle_number,
      customer_name: body.customer_name,
      amount: body.amount,
      collected_date: body.collected_date,
      remarks: body.remarks
    };

    if (!updates.driver_name || !updates.vehicle_number || !updates.customer_name) {
      return NextResponse.json({ success: false, error: 'Driver, vehicle, customer required' }, { status: 400 });
    }

    await ensureTables();

    const existing = await executeQuery(`SELECT * FROM driver_cash_collections WHERE id = ?`, [id]);
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 });
    }

    const setParts = [];
    const paramsArr = [];
    Object.entries(updates).forEach(([k, v]) => {
      if (v !== undefined) {
        setParts.push(`${k} = ?`);
        if (k === 'amount' && v !== null) {
          paramsArr.push(parseFloat(v));
        } else if (k === 'collected_date' && v) {
          paramsArr.push(new Date(v));
        } else {
          paramsArr.push(v);
        }
      }
    });
    if (setParts.length === 0) {
      return NextResponse.json({ success: false, error: 'No fields to update' }, { status: 400 });
    }
    paramsArr.push(id);

    await executeQuery(`UPDATE driver_cash_collections SET ${setParts.join(', ')} WHERE id = ?`, paramsArr);

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
    } catch {}

    await executeQuery(
      `INSERT INTO driver_cash_history (collection_id, action, performed_by, performed_at, remarks)
       VALUES (?, 'update', ?, NOW(), ?)`,
      [id, userId || null, `Updated amount ₹${parseFloat(updates.amount || 0).toLocaleString('en-IN')}`]
    );

    try {
      await createAuditLog({
        page: 'Driver Cash',
        uniqueCode: `DRC-${id}`,
        section: 'Cash Collection',
        userId: userId,
        userName: userName || (userId ? `Employee ID: ${userId}` : null),
        action: 'update',
        remarks: `Driver cash record updated`,
        oldValue: existing[0],
        newValue: updates,
        recordType: 'driver_cash',
        recordId: id
      });
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function ensureTables() {
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
}
