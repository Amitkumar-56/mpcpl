// src/app/api/manufacturing/lab-testing/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batch_id = searchParams.get('batch_id');
    const result_status = searchParams.get('result_status');
    const search = searchParams.get('search');

    let query = `SELECT lt.*, b.batch_code, b.product_name 
                 FROM mfg_lab_tests lt 
                 LEFT JOIN mfg_batches b ON lt.batch_id = b.id
                 WHERE 1=1`;
    const params = [];

    if (batch_id) {
      query += " AND lt.batch_id = ?";
      params.push(batch_id);
    }
    if (result_status) {
      query += " AND lt.result_status = ?";
      params.push(result_status);
    }
    if (search) {
      query += " AND (lt.test_code LIKE ? OR lt.test_method LIKE ? OR b.batch_code LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += " ORDER BY lt.created_at DESC";
    const tests = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: tests });
  } catch (error) {
    console.error("Lab tests fetch error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { batch_id, test_method, test_date, tested_by, parameters, result_value, result_status, remarks, created_by } = body;

    if (!batch_id || !test_method) {
      return NextResponse.json({ success: false, error: "Batch ID and test method are required" }, { status: 400 });
    }

    // Get batch code
    const [batch] = await executeQuery("SELECT batch_code FROM mfg_batches WHERE id=?", [batch_id]);
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // Auto-generate test code
    const [lastTest] = await executeQuery(
      "SELECT test_code FROM mfg_lab_tests ORDER BY id DESC LIMIT 1"
    ).catch(() => [null]);

    let nextNum = 1;
    if (lastTest?.test_code) {
      const match = lastTest.test_code.match(/LAB-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const test_code = `LAB-${String(nextNum).padStart(5, '0')}`;

    const result = await executeQuery(
      `INSERT INTO mfg_lab_tests (test_code, batch_id, batch_code, test_method, test_date, tested_by, parameters, result_value, result_status, remarks, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [test_code, batch_id, batch.batch_code, test_method, test_date || new Date().toISOString().split('T')[0], tested_by || null, parameters || null, result_value || null, result_status || 'pending', remarks || null, created_by || null]
    );

    // If test result affects batch, update batch status
    if (result_status === 'pass') {
      await executeQuery("UPDATE mfg_batches SET status='completed' WHERE id=? AND status='testing'", [batch_id]);
    } else if (result_status === 'fail') {
      await executeQuery("UPDATE mfg_batches SET status='rejected' WHERE id=? AND status='testing'", [batch_id]);
    }

    return NextResponse.json({ success: true, message: "Lab test created", id: result.insertId, test_code });
  } catch (error) {
    console.error("Lab test create error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, result_value, result_status, remarks, parameters } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Test ID is required" }, { status: 400 });
    }

    await executeQuery(
      `UPDATE mfg_lab_tests SET result_value=?, result_status=?, remarks=?, parameters=? WHERE id=?`,
      [result_value || null, result_status || 'pending', remarks || null, parameters || null, id]
    );

    // Update batch status based on test result
    if (result_status === 'pass' || result_status === 'fail') {
      const [test] = await executeQuery("SELECT batch_id FROM mfg_lab_tests WHERE id=?", [id]);
      if (test) {
        if (result_status === 'pass') {
          await executeQuery("UPDATE mfg_batches SET status='completed' WHERE id=? AND status='testing'", [test.batch_id]);
        } else if (result_status === 'fail') {
          await executeQuery("UPDATE mfg_batches SET status='rejected' WHERE id=? AND status='testing'", [test.batch_id]);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Lab test updated" });
  } catch (error) {
    console.error("Lab test update error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
