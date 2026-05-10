// src/app/api/farming/expenses/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// GET expenses
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const from_date = searchParams.get('from_date');
    const to_date = searchParams.get('to_date');

    let query = `SELECT * FROM farming_expenses WHERE 1=1`;
    let params = [];

    if (type) { query += ` AND type = ?`; params.push(type); }
    if (from_date) { query += ` AND expense_date >= ?`; params.push(from_date); }
    if (to_date) { query += ` AND expense_date <= ?`; params.push(to_date); }

    query += ` ORDER BY expense_date DESC, created_at DESC`;
    const records = await executeQuery(query, params);

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error("Expenses GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create expense
export async function POST(request) {
  try {
    const {
      type, category, description, amount, vendor_name,
      bill_no, expense_date, notes
    } = await request.json();

    if (!type || !amount) {
      return NextResponse.json({ success: false, error: 'Type and Amount required' }, { status: 400 });
    }

    const result = await executeQuery(`
      INSERT INTO farming_expenses 
        (type, category, description, amount, vendor_name, bill_no, expense_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      type, category || '', description || '', amount,
      vendor_name || '', bill_no || '',
      expense_date || new Date().toISOString().split('T')[0], notes || ''
    ]);

    return NextResponse.json({
      success: true,
      message: 'Expense recorded',
      id: result.insertId
    });
  } catch (error) {
    console.error("Expenses POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
