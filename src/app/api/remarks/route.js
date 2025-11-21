import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const remarks = await executeQuery('SELECT id, remarks_name FROM remarks');
    
    return NextResponse.json({
      success: true,
      data: remarks
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}