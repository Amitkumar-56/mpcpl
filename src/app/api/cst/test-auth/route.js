// src/app/api/cst/test-auth/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('🔍 Testing customer authentication...');
    
    const customerId = request.headers.get('x-customer-id');
    const userIdFromHeader = request.headers.get('x-user-id');
    const authHeader = request.headers.get('authorization');
    
    console.log('📋 Request Headers:', {
      'x-customer-id': customerId,
      'x-user-id': userIdFromHeader,
      'authorization': authHeader ? authHeader.substring(0, 20) + '...' : 'none'
    });
    
    return NextResponse.json({
      success: true,
      message: 'Authentication test',
      headers: {
        'x-customer-id': customerId || 'not found',
        'x-user-id': userIdFromHeader || 'not found',
        'authorization': authHeader ? 'present' : 'not present'
      }
    });
    
  } catch (error) {
    console.error('❌ Test auth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
