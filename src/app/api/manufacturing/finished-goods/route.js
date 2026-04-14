// src/app/api/manufacturing/finished-goods/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');

    let query = "SELECT fg.*, b.batch_code FROM mfg_finished_goods fg LEFT JOIN mfg_batches b ON fg.batch_id = b.id WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND fg.status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (fg.product_name LIKE ? OR fg.product_code LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY fg.created_at DESC";
    const goods = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: goods });
  } catch (error) {
    console.error("Finished goods fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { product_name, category, unit, batch_id, description, created_by } = body;

    if (!product_name) {
      return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    }

    // Auto-generate product code
    const [lastProduct] = await executeQuery(
      "SELECT product_code FROM mfg_finished_goods ORDER BY id DESC LIMIT 1"
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastProduct?.product_code) {
      const match = lastProduct.product_code.match(/FG-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const product_code = `FG-${String(nextNum).padStart(4, '0')}`;

    const result = await executeQuery(
      `INSERT INTO mfg_finished_goods (product_code, product_name, category, unit, batch_id, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [product_code, product_name, category || null, unit || 'kg', batch_id || null, description || null, created_by || null]
    );

    return NextResponse.json({ success: true, message: "Finished good created", id: result.insertId, product_code });
  } catch (error) {
    console.error("Finished good create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, product_name, category, unit, current_stock, batch_id, description, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    await executeQuery(
      `UPDATE mfg_finished_goods SET product_name=?, category=?, unit=?, current_stock=?, batch_id=?, description=?, status=? WHERE id=?`,
      [product_name, category, unit, current_stock || 0, batch_id || null, description || null, status || 'active', id]
    );

    return NextResponse.json({ success: true, message: "Finished good updated" });
  } catch (error) {
    console.error("Finished good update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
