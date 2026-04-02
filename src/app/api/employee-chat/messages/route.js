// src/app/api/employee-chat/messages/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Fetch messages for a specific session
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
    const sessionId = searchParams.get('sessionId');

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

    // Fetch messages with sender and receiver details
    console.log('Fetching messages for session:', sessionId, 'Employee:', employeeId);
    const messages = await executeQuery(
      `SELECT 
        cm.id,
        cm.session_id,
        cm.sender_id,
        cm.receiver_id,
        cm.message,
        cm.message_type,
        cm.file_path,
        cm.status,
        cm.created_at,
        cm.read_at,
        sender.name as sender_name,
        sender.picture as sender_picture,
        receiver.name as receiver_name,
        receiver.picture as receiver_picture
      FROM chat_messages cm
      LEFT JOIN employee_profile sender ON cm.sender_id = sender.id
      LEFT JOIN employee_profile receiver ON cm.receiver_id = receiver.id
      WHERE cm.session_id = ?
      ORDER BY cm.created_at ASC
      LIMIT 100`,
      [sessionId]
    );

    console.log('Messages fetched:', messages.length, 'messages');

    return NextResponse.json({
      success: true,
      messages: messages
    });

  } catch (error) {
    console.error("Error fetching employee chat messages:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - Send a new message
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

    const senderId = decoded.userId;
    const { sessionId, message, messageType = 'text', filePath } = await request.json();

    if (!sessionId || !message) {
      return NextResponse.json({ error: "Session ID and message are required" }, { status: 400 });
    }

    // Verify that the employee is part of this session and session is active
    const session = await executeQuery(
      `SELECT * FROM employee_sessions 
       WHERE id = ? AND status = 'active' AND (requester_id = ? OR responder_id = ?)`,
      [sessionId, senderId, senderId]
    );

    if (session.length === 0) {
      return NextResponse.json({ error: "Session not found, inactive, or access denied" }, { status: 404 });
    }

    const sessionData = session[0];
    const receiverId = sessionData.requester_id === senderId ? sessionData.responder_id : sessionData.requester_id;

    // Insert new message
    const result = await executeQuery(
      `INSERT INTO chat_messages (session_id, sender_id, receiver_id, message, message_type, file_path, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'sent')`,
      [sessionId, senderId, receiverId, message, messageType, filePath || null]
    );

    if (result.affectedRows > 0) {
      // Update session's updated_at timestamp
      await executeQuery(
        `UPDATE employee_sessions SET updated_at = NOW() WHERE id = ?`,
        [sessionId]
      );

      // Get the complete message with employee details
      const messageDetails = await executeQuery(
        `SELECT 
          cm.id,
          cm.session_id,
          cm.sender_id,
          cm.receiver_id,
          cm.message,
          cm.message_type,
          cm.file_path,
          cm.status,
          cm.created_at,
          cm.read_at,
          sender.name as sender_name,
          sender.picture as sender_picture,
          receiver.name as receiver_name,
          receiver.picture as receiver_picture
        FROM chat_messages cm
        LEFT JOIN employee_profile sender ON cm.sender_id = sender.id
        LEFT JOIN employee_profile receiver ON cm.receiver_id = receiver.id
        WHERE cm.id = ?`,
        [result.insertId]
      );

      return NextResponse.json({
        success: true,
        message: messageDetails[0]
      });
    }

    return NextResponse.json({
      success: false,
      error: "Failed to send message"
    }, { status: 500 });

  } catch (error) {
    console.error("Error sending employee chat message:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
