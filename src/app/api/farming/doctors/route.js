// src/app/api/farming/doctors/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status') || 'active';

    if (id) {
      const doctor = await executeQuery(`SELECT * FROM farming_doctors WHERE id = ?`, [id]);
      return NextResponse.json({ success: true, data: doctor[0] });
    }

    const doctors = await executeQuery(`SELECT * FROM farming_doctors WHERE status = ? ORDER BY name ASC`, [status]);
    return NextResponse.json({ success: true, data: doctors });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, contact_number, address, clinic_name, specialization } = await request.json();
    if (!name || !contact_number) return NextResponse.json({ success: false, error: 'Name and Contact are required' }, { status: 400 });

    const result = await executeQuery(`
      INSERT INTO farming_doctors (name, contact_number, address, clinic_name, specialization)
      VALUES (?, ?, ?, ?, ?)
    `, [name, contact_number, address, clinic_name, specialization]);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
