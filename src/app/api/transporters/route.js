import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

// ✅ GET all transporters with payable sum
export async function GET() {
  try {
    const transporters = await executeQuery("SELECT * FROM transporters ORDER BY id DESC");

    // For each transporter, fetch payable amount
    const results = await Promise.all(
      transporters.map(async (t) => {
        const payableData = await executeQuery(
          "SELECT SUM(t_payable) AS total_payable FROM stock WHERE transporter_id = ?",
          [t.id]
        );
        return {
          ...t,
          total_payable: payableData[0]?.total_payable || 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error fetching transporters:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
