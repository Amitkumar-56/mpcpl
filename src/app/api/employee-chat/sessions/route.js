// src/app/api/employee-chat/sessions/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Fetch employee chat sessions
export async function GET(request) {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'requested', 'received', or 'all'

    let query = `
      SELECT 
        es.id,
        es.requester_id,
        es.responder_id,
        es.status,
        es.request_message,
        es.created_at,
        es.updated_at,
        es.ended_at,
        requester.name as requester_name,
        requester.picture as requester_picture,
        requester.role as requester_role,
        responder.name as responder_name,
        responder.picture as responder_picture,
        responder.role as responder_role,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.session_id = es.id AND cm.status != 'read' AND cm.receiver_id = ?) as unread_count,
        (SELECT cm.message FROM chat_messages cm WHERE cm.session_id = es.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.session_id = es.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_at
      FROM employee_sessions es
      LEFT JOIN employee_profile requester ON es.requester_id = requester.id
      LEFT JOIN employee_profile responder ON es.responder_id = responder.id
      WHERE (es.requester_id = ? OR es.responder_id = ?)
    `;

    const params = [employeeId, employeeId, employeeId];

    if (type === 'requested') {
      query += ` AND es.requester_id = ?`;
      params.push(employeeId);
    } else if (type === 'received') {
      query += ` AND es.responder_id = ?`;
      params.push(employeeId);
    }

    query += ` ORDER BY es.updated_at DESC`;

    const sessions = await executeQuery(query, params);

    return NextResponse.json({
      success: true,
      sessions: sessions
    });

  } catch (error) {
    console.error("Error fetching employee chat sessions:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Create new employee chat session
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

    const requesterId = decoded.userId;
    const { responderId, requestMessage } = await request.json();

    if (!responderId) {
      return NextResponse.json({ error: "Responder ID is required" }, { status: 400 });
    }

    if (requesterId === responderId) {
      return NextResponse.json({ error: "Cannot chat with yourself" }, { status: 400 });
    }

    // Check if there's already an active session between these employees
    const existingSession = await executeQuery(
      `SELECT id FROM employee_sessions 
       WHERE ((requester_id = ? AND responder_id = ?) OR (requester_id = ? AND responder_id = ?))
       AND status IN ('pending', 'active')`,
      [requesterId, responderId, responderId, requesterId]
    );

    if (existingSession.length > 0) {
      console.log('Session already exists:', existingSession[0].id);
      
      // Get the existing session details
      const sessionDetails = await executeQuery(
        `SELECT 
          es.id,
          es.requester_id,
          es.responder_id,
          es.status,
          es.request_message,
          es.created_at,
          requester.name as requester_name,
          requester.picture as requester_picture,
          responder.name as responder_name,
          responder.picture as responder_picture
        FROM employee_sessions es
        LEFT JOIN employee_profile requester ON es.requester_id = requester.id
        LEFT JOIN employee_profile responder ON es.responder_id = responder.id
        WHERE es.id = ?`,
        [existingSession[0].id]
      );
      
      return NextResponse.json({
        success: true,
        session: sessionDetails[0],
        message: "Existing chat session found"
      });
    }

    console.log('Creating new session for:', { requesterId, responderId, requestMessage });
    // Create new chat session (removed availability check)
    const result = await executeQuery(
      `INSERT INTO employee_sessions (requester_id, responder_id, status, request_message) 
       VALUES (?, ?, 'active', ?)`,
      [requesterId, responderId, requestMessage || '']
    );
    console.log('Insert result:', result);

    if (result.affectedRows > 0) {
      // Get session details with employee info
      const sessionDetails = await executeQuery(
        `SELECT 
          es.id,
          es.requester_id,
          es.responder_id,
          es.status,
          es.request_message,
          es.created_at,
          requester.name as requester_name,
          requester.picture as requester_picture,
          responder.name as responder_name,
          responder.picture as responder_picture
        FROM employee_sessions es
        LEFT JOIN employee_profile requester ON es.requester_id = requester.id
        LEFT JOIN employee_profile responder ON es.responder_id = responder.id
        WHERE es.id = ?`,
        [result.insertId]
      );

      return NextResponse.json({
        success: true,
        session: sessionDetails[0]
      });
    }

    return NextResponse.json({
      success: false,
      error: "Failed to create chat session"
    }, { status: 500 });

  } catch (error) {
    console.error("Error creating employee chat session:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
