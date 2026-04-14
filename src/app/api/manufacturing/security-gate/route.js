// src/app/api/manufacturing/security-gate/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction');
    const gate_status = searchParams.get('gate_status');
    const search = searchParams.get('search');
    const date = searchParams.get('date');

    let query = "SELECT * FROM security_gate_entries WHERE 1=1";
    const params = [];

    if (direction) {
      query += " AND direction = ?";
      params.push(direction);
    }
    if (gate_status) {
      query += " AND gate_status = ?";
      params.push(gate_status);
    }
    if (search) {
      query += " AND (vehicle_number LIKE ? OR driver_name LIKE ? OR entry_code LIKE ? OR tanker_code LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (date) {
      query += " AND DATE(created_at) = ?";
      params.push(date);
    }

    query += " ORDER BY created_at DESC";
    const entries = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("Security gate fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { vehicle_number, driver_name, driver_phone, material_type, material_name, quantity, unit, direction, entry_photo, purpose, remarks, tanker_code, created_by } = body;

    if (!vehicle_number || !direction) {
      return NextResponse.json({ success: false, error: "Vehicle number and direction are required" }, { status: 400 });
    }

    // Auto-generate entry code
    const prefix = direction === 'entry' ? 'GE' : 'GX';
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const [lastEntry] = await executeQuery(
      "SELECT entry_code FROM security_gate_entries WHERE entry_code LIKE ? ORDER BY id DESC LIMIT 1",
      [`${prefix}-${today}-%`]
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastEntry?.entry_code) {
      const match = lastEntry.entry_code.match(new RegExp(`${prefix}-\\d+-(\\d+)`));
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const entry_code = `${prefix}-${today}-${String(nextNum).padStart(4, '0')}`;

    const entryTime = direction === 'entry' ? new Date().toISOString() : null;
    const exitTime = direction === 'exit' ? new Date().toISOString() : null;
    const gateStatus = direction === 'entry' ? 'arrived' : 'exited';

    const result = await executeQuery(
      `INSERT INTO security_gate_entries (entry_code, tanker_code, vehicle_number, driver_name, driver_phone, material_type, material_name, quantity, unit, direction, entry_time, exit_time, entry_photo, gate_status, purpose, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry_code, tanker_code || null, vehicle_number, driver_name || null, driver_phone || null, material_type || null, material_name || null, quantity || 0, unit || 'kg', direction, entryTime, exitTime, entry_photo || null, gateStatus, purpose || null, remarks || null, created_by || null]
    );

    return NextResponse.json({ success: true, message: `Gate ${direction} recorded`, id: result.insertId, entry_code });
  } catch (error) {
    console.error("Security gate create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, gate_status, exit_photo, exit_time, remarks } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Entry ID is required" }, { status: 400 });
    }

    const updates = [];
    const params = [];

    if (gate_status) { updates.push("gate_status=?"); params.push(gate_status); }
    if (exit_photo) { updates.push("exit_photo=?"); params.push(exit_photo); }
    if (gate_status === 'exited') { 
      updates.push("exit_time=NOW()"); 
      updates.push("direction='exit'");
    }
    if (remarks !== undefined) { updates.push("remarks=?"); params.push(remarks); }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: "No fields to update" }, { status: 400 });
    }

    params.push(id);
    await executeQuery(`UPDATE security_gate_entries SET ${updates.join(', ')} WHERE id=?`, params);

    return NextResponse.json({ success: true, message: "Gate entry updated" });
  } catch (error) {
    console.error("Security gate update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
