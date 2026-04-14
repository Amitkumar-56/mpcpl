// src/app/api/manufacturing/raw-materials/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');

    let query = "SELECT * FROM mfg_raw_materials WHERE 1=1";
    const params = [];

    if (category) {
      query += " AND category = ?";
      params.push(category);
    }
    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (material_name LIKE ? OR material_code LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY created_at DESC";
    const materials = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error("Raw materials fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { material_name, category, unit, min_stock_level, supplier_id, description, created_by } = body;

    if (!material_name || !category) {
      return NextResponse.json({ success: false, error: "Material name and category are required" }, { status: 400 });
    }

    // Auto-generate material code
    const [lastMaterial] = await executeQuery(
      "SELECT material_code FROM mfg_raw_materials ORDER BY id DESC LIMIT 1"
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastMaterial?.material_code) {
      const match = lastMaterial.material_code.match(/RM-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const material_code = `RM-${String(nextNum).padStart(4, '0')}`;

    const result = await executeQuery(
      `INSERT INTO mfg_raw_materials (material_code, material_name, category, unit, min_stock_level, supplier_id, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [material_code, material_name, category, unit || 'kg', min_stock_level || 0, supplier_id || null, description || null, created_by || null]
    );

    return NextResponse.json({ success: true, message: "Raw material created", id: result.insertId, material_code });
  } catch (error) {
    console.error("Raw material create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, material_name, category, unit, current_stock, min_stock_level, supplier_id, description, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Material ID is required" }, { status: 400 });
    }

    await executeQuery(
      `UPDATE mfg_raw_materials SET material_name=?, category=?, unit=?, current_stock=?, min_stock_level=?, supplier_id=?, description=?, status=? WHERE id=?`,
      [material_name, category, unit, current_stock || 0, min_stock_level || 0, supplier_id || null, description || null, status || 'active', id]
    );

    return NextResponse.json({ success: true, message: "Raw material updated" });
  } catch (error) {
    console.error("Raw material update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: "Material ID is required" }, { status: 400 });
    }

    await executeQuery("UPDATE mfg_raw_materials SET status='inactive' WHERE id=?", [id]);
    return NextResponse.json({ success: true, message: "Raw material deactivated" });
  } catch (error) {
    console.error("Raw material delete error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
