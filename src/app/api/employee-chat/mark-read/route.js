// src/app/api/employee-chat/mark-read/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST - Mark messages as read
export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const employeeId = decoded.userId;
    const { sessionId, messageIds } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Verify that the employee is part of this session
    const session = await executeQuery(
      `SELECT * FROM employee_sessions 
       WHERE id = ? AND (requester_id = ? OR responder_id = ?)`,
      [sessionId, employeeId, employeeId]
    );

    if (session.length === 0) {
      return NextResponse.json({ error: "Session not found or access denied" }, { status: 404 });
    }

    let updateResult;

    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      // Mark specific messages as read
      const placeholders = messageIds.map(() => '?').join(',');
      updateResult = await executeQuery(
        `UPDATE chat_messages 
         SET status = 'read', read_at = NOW() 
         WHERE id IN (${placeholders}) AND receiver_id = ? AND session_id = ?`,
        [...messageIds, employeeId, sessionId]
      );
    } else {
      // Mark all unread messages in the session as read
      updateResult = await executeQuery(
        `UPDATE chat_messages 
         SET status = 'read', read_at = NOW() 
         WHERE receiver_id = ? AND session_id = ? AND status != 'read'`,
        [employeeId, sessionId]
      );
    }

    return NextResponse.json({
      success: true,
      markedCount: updateResult.affectedRows
    });

  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
