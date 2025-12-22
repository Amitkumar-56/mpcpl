//src/app/api/cst/verify/route.js
import { verifyToken } from "@/lib/cstauth";
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.id) {
      return NextResponse.json({ 
        valid: false,
        error: 'Invalid token' 
      }, { status: 401 });
    }

    // Verify customer status is active
    const customers = await executeQuery(
      'SELECT id, status FROM customers WHERE id = ? AND status = 1',
      [decoded.id]
    );

    if (customers.length === 0) {
      return NextResponse.json({ 
        valid: false,
        error: 'Account has been deactivated' 
      }, { status: 403 });
    }
    
    return NextResponse.json({ 
      valid: true,
      user: decoded 
    });
  } catch (error) {
    return NextResponse.json({ 
      valid: false,
      error: error.message 
    }, { status: 401 });
  }
}