
// src/app/api/chat/messages/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const messages = await executeQuery(
      `SELECT m.*, ep.name as employee_name 
         FROM messages m 
         LEFT JOIN employee_profile ep ON m.employee_id = ep.id 
         WHERE m.customer_id = ? ORDER BY m.timestamp ASC`,
      [customerId]
    );

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}