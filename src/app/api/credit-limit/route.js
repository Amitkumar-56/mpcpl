import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id"));

    if (!id) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const customer = await executeQuery(
      "SELECT name, phone FROM customers WHERE id = ?",
      [id]
    );

    const balance = await executeQuery(
      "SELECT cst_limit, balance, amtlimit FROM customer_balances WHERE com_id = ?",
      [id]
    );

    return NextResponse.json({
      customer: customer[0] || { name: "Invalid ID", phone: "Invalid ID" },
      balance: balance[0] || { cst_limit: 0, balance: 0, amtlimit: 0 },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { com_id, in_amount = 0, d_amount = 0, user_id } = body;

    if (!com_id) {
      return NextResponse.json({ error: "Missing com_id" }, { status: 400 });
    }

    if (in_amount > 0 && d_amount > 0) {
      return NextResponse.json(
        { error: "Enter either increase or decrease, not both." },
        { status: 400 }
      );
    }

    // Fetch current record
    const current = await executeQuery(
      "SELECT * FROM customer_balances WHERE com_id = ?",
      [com_id]
    );

    const now = new Date();
    let cst_limit = 0,
      amtlimit = 0,
      balance = 0, // balance will stay 0
      old_balance = 0,
      change_type = "",
      change_value = 0;

    // 🟢 If record exists → update
    if (current.length > 0) {
      const record = current[0];
      old_balance = parseFloat(record.balance);
      cst_limit = parseFloat(record.cst_limit);
      amtlimit = parseFloat(record.amtlimit);

      if (in_amount > 0) {
        cst_limit += in_amount;
        amtlimit += in_amount;
        change_type = "increase";
        change_value = in_amount;
      } else if (d_amount > 0) {
        if (cst_limit < d_amount || amtlimit < d_amount) {
          return NextResponse.json(
            { error: "Insufficient limit to decrease" },
            { status: 400 }
          );
        }
        cst_limit -= d_amount;
        amtlimit -= d_amount;
        change_type = "decrease";
        change_value = d_amount;
      } else {
        return NextResponse.json({ error: "No amount entered" }, { status: 400 });
      }

      // ✅ Update only limit fields — keep balance 0
      await executeQuery(
        `UPDATE customer_balances 
         SET amtlimit = ?, cst_limit = ? 
         WHERE com_id = ?`,
        [amtlimit, cst_limit, com_id]
      );
    } 
    // 🔵 If record not found → insert new
    else {
      if (in_amount <= 0) {
        return NextResponse.json(
          { error: "Cannot decrease or set 0 for new record" },
          { status: 400 }
        );
      }

      cst_limit = in_amount;
      amtlimit = in_amount;
      change_type = "insert";
      change_value = in_amount;

      // ✅ Insert record with balance = 0
      await executeQuery(
        `INSERT INTO customer_balances 
         (balance, hold_balance, amtlimit, cst_limit, com_id, account_id)
         VALUES (0, 0, ?, ?, ?, 0)`,
        [amtlimit, cst_limit, com_id]
      );
    }

    // 🪣 Insert into wallet_history
    await executeQuery(
      `INSERT INTO wallet_history 
       (cl_id, old_balance, added, c_balance, type, d_date, created_at, in_amount, d_amount) 
       VALUES (?, ?, ?, ?, 2, ?, ?, ?, ?)`,
      [com_id, old_balance, change_value, balance, now, now, in_amount, d_amount]
    );

    // 🪣 Insert into filling_history
    await executeQuery(
      `INSERT INTO filling_history
       (trans_type, credit_date, remaining_limit, filling_date, cl_id, created_by, created_at, in_amount, d_amount, limit_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "credit_limit_update",
        now,
        amtlimit,
        now,
        com_id,
        user_id,
        now,
        in_amount,
        d_amount,
        change_type,
      ]
    );

    return NextResponse.json({
      success: true,
      message:
        current.length > 0
          ? "Customer limit updated successfully"
          : "New customer record created",
      cst_limit,
      amtlimit,
      balance, // will always be 0
    });
  } catch (err) {
    console.error("Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

