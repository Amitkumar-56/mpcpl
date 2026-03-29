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

    // Atomic update: Only assign if not already assigned
    const result = await executeQuery(
      "UPDATE chat_sessions SET employee_id = ?, status = 'active' WHERE customer_id = ? AND (employee_id IS NULL OR employee_id = '')",
      [employeeId, customerId]
    );

    // Check if update was successful (affectedRows > 0)
    if (result.affectedRows === 0) {
      // Chat was already assigned to someone else
      const [existing] = await executeQuery(
        "SELECT employee_id FROM chat_sessions WHERE customer_id = ?",
        [customerId]
      );

      return NextResponse.json({
        success: false,
        message: "Chat already accepted by another employee",
        alreadyAssigned: true,
        assignedTo: existing?.employee_id
      });
    }

    // Broadcast chat assignment to all employees
    try {
      const globalSocket = global._io;
      if (globalSocket) {
        globalSocket.to("employees").emit("chat_assigned", {
          customerId,
          employeeId,
          employeeName: null, // Will be updated by client
        });
      }
    } catch (socketError) {
      console.error("Socket broadcast error:", socketError);
    }

    return NextResponse.json({
      success: true,
      message: "Chat accepted successfully",
      assignedTo: employeeId
    });

  } catch (error) {
    console.error("Error accepting chat:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error: " + error.message,
    }, { status: 500 });
  }
}
