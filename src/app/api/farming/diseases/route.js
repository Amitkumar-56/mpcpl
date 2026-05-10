// src/app/api/farming/diseases/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    let query = `SELECT * FROM farming_diseases WHERE 1=1`;
    const params = [];

    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }

    query += ` ORDER BY disease_name ASC`;
    const diseases = await executeQuery(query, params);
    return NextResponse.json({ success: true, data: diseases });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { type, disease_name, symptoms, treatment_info, danger_level, is_contagious } = await request.json();
    if (!type || !disease_name) return NextResponse.json({ success: false, error: 'Type and Disease Name are required' }, { status: 400 });

    const result = await executeQuery(`
      INSERT INTO farming_diseases (type, disease_name, symptoms, treatment_info, danger_level, is_contagious)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [type, disease_name, symptoms, treatment_info, danger_level || 'medium', is_contagious ? 1 : 0]);

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
