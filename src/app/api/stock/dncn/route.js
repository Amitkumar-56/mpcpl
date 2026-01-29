import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }

    const query = 'SELECT * FROM dncn WHERE sup_id = ?';
    const values = [parseInt(id)];
    
    const results = await executeQuery(query, values);
    
    return NextResponse.json({ data: results });
    
  } catch (error) {
    console.error('Error fetching DNCN:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}