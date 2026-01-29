import { executeTransaction } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { tors, type, amount, sup_id, remarks } = await req.json();

    if (!tors || !type || !amount || !sup_id) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const amt = Number(amount);

    await executeTransaction(async (connection) => {
      // 1️⃣ Get current payable
      const [rows] = await connection.execute(
        "SELECT payable FROM stock WHERE id = ?",
        [sup_id]
      );

      if (rows.length === 0) {
        throw new Error("Invalid Stock ID");
      }

      const currentPayable = Number(rows[0].payable);
      const newPayable =
        type === 1 ? currentPayable - amt : currentPayable + amt;

      // 2️⃣ Insert DNCN
      await connection.execute(
        `INSERT INTO dncn (sup_id, type, amount, status, dncn_date, remarks)
         VALUES (?, ?, ?, 1, NOW(), ?)`,
        [sup_id, type, newPayable, remarks || null]
      );

      // 3️⃣ Update stock / t_invoice
      let updateSql = "";

      if (tors === 1) {
        updateSql =
          type === 1
            ? "UPDATE stock SET dncn = dncn - ?, payable = payable - ? WHERE id = ?"
            : "UPDATE stock SET dncn = dncn + ?, payable = payable + ? WHERE id = ?";
      } else if (tors === 2) {
        updateSql =
          type === 1
            ? "UPDATE t_invoice SET dncn = dncn - ?, payable = payable - ? WHERE id = ?"
            : "UPDATE t_invoice SET dncn = dncn + ?, payable = payable + ? WHERE id = ?";
      } else {
        throw new Error("Invalid TORS value");
      }

      await connection.execute(updateSql, [amt, amt, sup_id]);
    });

    return NextResponse.json({
      success: true,
      message: "DNCN added successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
