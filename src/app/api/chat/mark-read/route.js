// src/app/api/chat/mark-read/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerId, userId, userType } = body;

    console.log('Marking messages as read:', { customerId, userId, userType });

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer ID is required' 
      }, { status: 400 });
    }

    const senderToUpdate = userType === 'employee' ? 'customer' : 'employee';

    const result = await executeQuery(
      `UPDATE chat_messages SET status = 'read' 
       WHERE customer_id = ? 
       AND sender = ? 
       AND status != 'read'`,
      [customerId, senderToUpdate]
    );

    console.log('Messages marked as read:', result.affectedRows);

    return NextResponse.json({ 
      success: true, 
      message: 'Messages marked as read',
      affectedRows: result.affectedRows
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}