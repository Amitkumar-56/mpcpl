// src/app/api/farming/animals/barcode/[code]/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { code } = params;
    
    if (!code) {
      return NextResponse.json({ success: false, error: 'Barcode is required' }, { status: 400 });
    }

    const animal = await executeQuery(`
      SELECT * FROM farming_animals WHERE barcode = ? OR tag_id = ?
    `, [code, code]);

    if (animal.length === 0) {
      return NextResponse.json({ success: false, error: 'Animal not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: animal[0] });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
