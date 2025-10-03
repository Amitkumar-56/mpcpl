//src/app/api/cst/verify/route.js
import { verifyToken } from "@/lib/cstauth";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
    
    const decoded = verifyToken(token);
    
    return NextResponse.json({ 
      valid: !!decoded,
      user: decoded 
    });
  } catch (error) {
    return NextResponse.json({ 
      valid: false,
      error: error.message 
    }, { status: 401 });
  }
}