import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Customer ID is required' 
      }, { status: 400 });
    }

    const [result] = await executeQuery(
      `SELECT COUNT(*) as unreadCount 
       FROM messages 
       WHERE customer_id = ? 
       AND sender = 'customer' 
       AND status != 'read'`,
      [customerId]
    );

    return NextResponse.json({ 
      success: true, 
      unreadCount: result.unreadCount 
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}