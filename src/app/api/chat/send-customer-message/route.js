// src/app/api/chat/send-customer-message/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { customerId, text, customerName } = await request.json();

    if (!customerId || !text) {
      return NextResponse.json({ success: false, error: 'Customer ID and text are required' }, { status: 400 });
    }

    // Save message
    const result = await executeQuery(
      `INSERT INTO messages (text, sender, customer_id, status) VALUES (?, 'customer', ?, 'sent')`,
      [text, customerId]
    );

    // Update chat session
    await executeQuery(
      `INSERT INTO chat_sessions (customer_id, last_message_at, status) 
       VALUES (?, NOW(), 'active') 
       ON DUPLICATE KEY UPDATE last_message_at = NOW(), status = 'active'`,
      [customerId]
    );

    // Emit realtime events if socket server is available
    try {
      const io = global._io;
      if (io) {
        const [savedMessage] = await executeQuery(
          `SELECT m.*, c.name as customer_name 
           FROM messages m 
           LEFT JOIN customers c ON m.customer_id = c.id 
           WHERE m.id = ?`,
          [result.insertId]
        );
        const messageData = {
          id: savedMessage.id,
          text: savedMessage.text,
          sender: savedMessage.sender,
          customer_id: savedMessage.customer_id,
          status: savedMessage.status,
          timestamp: savedMessage.timestamp,
        };
        io.to(`customer_${customerId}`).emit('new_message', { message: messageData });
        io.to('employees').emit('customer_message_notification', {
          type: 'new_customer_message',
          customerId,
          customerName: savedMessage?.customer_name || customerName,
          messageId: savedMessage.id,
          text: savedMessage.text,
          timestamp: savedMessage.timestamp,
          status: savedMessage.status,
        });
      }
    } catch (e) {}

    return NextResponse.json({ success: true, messageId: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
