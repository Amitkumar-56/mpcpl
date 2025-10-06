//src/app/api/customers/deal-price/schedule/route.js
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { executeQuery } from "@/lib/db";

export async function POST(request) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, Schedule_Date, Schedule_Time } = body;

    if (!id || !Schedule_Date || !Schedule_Time) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    // Insert schedule (adjust table name and columns as needed)
    await executeQuery.query(
      'INSERT INTO deal_price_schedule (com_id, schedule_date, schedule_time) VALUES (?, ?, ?)',
      [id, Schedule_Date, Schedule_Time]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Price scheduled successfully',
      id: id
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}