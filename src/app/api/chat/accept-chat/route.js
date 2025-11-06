// src/app/api/chat/accept-chat/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { customerId, employeeId } = await request.json();

    if (!customerId || !employeeId) {
      return NextResponse.json({
        success: false,
        error: "Customer ID and Employee ID required",
      }, { status: 400 });
    }

    // चेक करो कि ये चैट पहले से किसी ने accept की है या नहीं
    const [existing] = await executeQuery(
      "SELECT employee_id FROM chat_sessions WHERE customer_id = ? AND status = 'active'",
      [customerId]
    );

    if (existing && existing.employee_id) {
      return NextResponse.json({
        success: false,
        message: "Chat already accepted by another employee",
      });
    }

    // Accept करने वाले employee को assign करो
    await executeQuery(
      "UPDATE chat_sessions SET employee_id = ?, status = 'active' WHERE customer_id = ?",
      [employeeId, customerId]
    );

    return NextResponse.json({
      success: true,
      message: "Chat accepted successfully",
    });

  } catch (error) {
    console.error("Error accepting chat:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error: " + error.message,
    }, { status: 500 });
  }
}
