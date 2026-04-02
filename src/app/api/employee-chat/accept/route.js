// src/app/api/employee-chat/accept/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// POST - Accept or reject employee chat request
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
    const { sessionId, action } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Check if the session exists and is pending
    const session = await executeQuery(
      `SELECT * FROM employee_sessions WHERE id = ? AND status = 'pending'`,
      [sessionId]
    );

    if (session.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Session not found or already processed"
      }, { status: 404 });
    }

    const sessionData = session[0];

    // Verify that this employee is the intended responder
    if (sessionData.responder_id !== employeeId) {
      return NextResponse.json({
        success: false,
        error: "You are not authorized to respond to this session"
      }, { status: 403 });
    }

    // Update session status
    const newStatus = action === 'accept' ? 'active' : 'rejected';
    const updateResult = await executeQuery(
      `UPDATE employee_sessions SET status = ?, updated_at = NOW() WHERE id = ?`,
      [newStatus, sessionId]
    );

    if (updateResult.affectedRows > 0) {
      // Get updated session with employee details
      const updatedSession = await executeQuery(
        `SELECT 
          es.id,
          es.requester_id,
          es.responder_id,
          es.status,
          es.request_message,
          es.created_at,
          es.updated_at,
          requester.name as requester_name,
          requester.picture as requester_picture,
          requester.role as requester_role,
          responder.name as responder_name,
          responder.picture as responder_picture,
          responder.role as responder_role
        FROM employee_sessions es
        LEFT JOIN employee_profile requester ON es.requester_id = requester.id
        LEFT JOIN employee_profile responder ON es.responder_id = responder.id
        WHERE es.id = ?`,
        [sessionId]
      );

      return NextResponse.json({
        success: true,
        session: updatedSession[0],
        action: action
      });
    }

    return NextResponse.json({
      success: false,
      error: "Failed to update session"
    }, { status: 500 });

  } catch (error) {
    console.error("Error responding to employee chat request:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
