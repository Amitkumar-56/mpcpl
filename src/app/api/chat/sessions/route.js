import { executeQuery } from "@/lib/db";

import { NextResponse } from "next/server";



export async function GET(request) {

  try {

    const { searchParams } = new URL(request.url);

    const employeeRole = searchParams.get('employeeRole'); // Get employee role from query params



    // If driver (role 6), return empty sessions - no customer chat access

    if (employeeRole === '6') {

      return NextResponse.json({ 

        success: true, 

        sessions: [],

        message: "Drivers cannot access customer chats"

      });

    }



    const sessions = await executeQuery(`

      SELECT 

        cs.*,

        COALESCE(c.name, CONCAT('Customer ', cs.customer_id)) as customer_name,

        c.email as customer_email,

        c.phone as customer_phone,

        ep.name as employee_name,

        ep.role as employee_role,

        (SELECT COUNT(*) FROM messages m WHERE m.customer_id = cs.customer_id AND m.sender = 'customer' AND m.status != 'read') as unread_count

      FROM chat_sessions cs

      LEFT JOIN customers c ON cs.customer_id = c.id

      LEFT JOIN employee_profile ep ON cs.employee_id = ep.id

      ORDER BY cs.last_message_at DESC

    `);



    return NextResponse.json({ 

      success: true, 

      sessions: sessions.map(session => ({

        ...session,

        customerId: session.customer_id,

        customerName: session.customer_name,

        customerEmail: session.customer_email,

        customerPhone: session.customer_phone,

        unread: session.unread_count > 0,

        lastMessageAt: session.last_message_at,

        employeeId: session.employee_id ? {

          id: session.employee_id,

          name: session.employee_name,

          role: session.employee_role,

        } : null

      }))

    });

  } catch (error) {

    console.error('Error fetching chat sessions:', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });

  }

}