//src/app/api/auth/verify/route.js
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({ 
      userId: decoded.userId, 
      role: decoded.role,
      authenticated: true 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
  }
}