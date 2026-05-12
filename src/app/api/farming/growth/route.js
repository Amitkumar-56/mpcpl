// src/app/api/farming/growth/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { ensureFarmingTables } from "@/lib/farming_init";

// GET growth history for an animal
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const animal_id = searchParams.get('animal_id');

    if (!animal_id) {
      return NextResponse.json({ success: false, error: 'Animal ID is required' }, { status: 400 });
    }

    const growth = await executeQuery(`
      SELECT * FROM farming_growth WHERE animal_id = ? ORDER BY recorded_date DESC
    `, [animal_id]);

    return NextResponse.json({ success: true, data: growth });
  } catch (error) {
    console.error("Growth GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Add new growth record
export async function POST(request) {
  try {
    const body = await request.json();
    const { animal_id, weight, height, length, chest_girth, recorded_date, notes } = body;

    if (!animal_id || !weight) {
      return NextResponse.json({ success: false, error: 'Animal ID and Weight are required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_growth (animal_id, weight, height, length, chest_girth, recorded_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      animal_id, weight, height || null, length || null,
      chest_girth || null, recorded_date || new Date().toISOString().split('T')[0],
      notes || ''
    ]);

    // Also update current weight in farming_animals
    await executeQuery(`UPDATE farming_animals SET weight = ? WHERE id = ?`, [weight, animal_id]);

    return NextResponse.json({
      success: true,
      message: 'Growth record added successfully',
      id: result.insertId
    });
  } catch (error) {
    console.error("Growth POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
