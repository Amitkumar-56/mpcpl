import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/auditLog";

function nowIST() {
  const now = new Date();
  const offset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + offset);
  return istTime.toISOString().slice(0, 19).replace("T", " ");
}

export async function POST(req) {
  try {
    const body = await req.json();
    const action = String(body.action || "").toLowerCase();
    const customerId = parseInt(body.customerId);
    const amount = Number(body.amount || 0);

    if (!customerId || !["reserve", "release_all"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
    }

    const balRows = await executeQuery(
      `SELECT amtlimit, hold_balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
      [customerId]
    );
    if (balRows.length === 0) {
      return NextResponse.json({ success: false, error: "Balance record not found" }, { status: 404 });
    }
    const { amtlimit, hold_balance } = balRows[0];
    const now = nowIST();

    if (action === "reserve") {
      if (isNaN(amount) || amount <= 0) {
        return NextResponse.json({ success: false, error: "Invalid reserve amount" }, { status: 400 });
      }
      const currentAmt = parseFloat(amtlimit) || 0;
      if (currentAmt < amount) {
        return NextResponse.json({ success: false, error: "Insufficient amtlimit to reserve" }, { status: 400 });
      }
      await executeQuery(
        `UPDATE customer_balances 
         SET amtlimit = amtlimit - ?, hold_balance = hold_balance + ?, updated_at = ?
         WHERE com_id = ?`,
        [amount, amount, now, customerId]
      );
    } else if (action === "release_all") {
      const holdBal = parseFloat(hold_balance) || 0;
      if (holdBal > 0) {
        await executeQuery(
          `UPDATE customer_balances 
           SET amtlimit = amtlimit + ?, hold_balance = GREATEST(0, hold_balance - ?), updated_at = ?
           WHERE com_id = ?`,
          [holdBal, holdBal, now, customerId]
        );
      }
    }

    try {
      const user = await getCurrentUser();
      const userId = user?.userId || null;
      const userName = user?.userName || null;
      await createAuditLog({
        page: "Customers",
        uniqueCode: `CUSTOMER-${customerId}`,
        section: "Hold Balance Management",
        userId,
        userName,
        action: action === "reserve" ? "hold_reserve" : "hold_release",
        remarks: action === "reserve" ? `Reserved ₹${amount}` : `Released all hold`,
        recordType: "customer",
        recordId: customerId,
      });
    } catch {}

    const updated = await executeQuery(
      `SELECT amtlimit, hold_balance, balance FROM customer_balances WHERE com_id = ? LIMIT 1`,
      [customerId]
    );
    return NextResponse.json({ success: true, data: updated[0] || {} });
  } catch (error) {
    console.error("Error in hold-balance API:", error);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
