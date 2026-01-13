// src/app/api/chat/send-message/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, text, employeeId, employeeName } = body;

    if (!customerId || !text || !employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer ID, text and employee ID are required' 
      }, { status: 400 });
    }

    const numericCustomerId = parseInt(customerId);
    const numericEmployeeId = parseInt(employeeId);
    
    if (isNaN(numericCustomerId) || isNaN(numericEmployeeId)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid ID format' 
      }, { status: 400 });
    }

    // Save employee message to database
    const result = await executeQuery(
      `INSERT INTO messages (text, sender, customer_id, employee_id, status) VALUES (?, 'employee', ?, ?, 'delivered')`,
      [text.trim(), numericCustomerId, numericEmployeeId]
    );

    // Update chat session with employee assignment
    await executeQuery(
      `UPDATE chat_sessions SET employee_id = ?, last_message_at = NOW(), status = 'active' WHERE customer_id = ?`,
      [numericEmployeeId, numericCustomerId]
    );

    // Emit realtime events if socket server is available
    try {
      const io = global._io;
      if (io) {
        const [savedMessage] = await executeQuery(
          `SELECT m.*, ep.name as employee_name 
           FROM messages m 
           LEFT JOIN employee_profile ep ON m.employee_id = ep.id 
           WHERE m.id = ?`,
          [result.insertId]
        );
        const messageData = {
          id: savedMessage.id,
          text: savedMessage.text,
          sender: savedMessage.sender,
          customer_id: savedMessage.customer_id,
          employee_id: savedMessage.employee_id,
          status: savedMessage.status,
          timestamp: savedMessage.timestamp,
          employee_name: savedMessage.employee_name || employeeName,
        };
        io.to(`customer_${numericCustomerId}`).emit('new_message', { message: messageData });
      }
    } catch (e) {}

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully',
      messageId: result.insertId
    });

  } catch (error) {
    console.error('Error sending employee message:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
