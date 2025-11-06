// src/app/api/chat/send-customer-message/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { customerId, text } = await request.json();

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

    return NextResponse.json({ success: true, messageId: result.insertId });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}