// src/app/api/nb-stock-history-non/route.js
import { verifyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('🚀 /api/nb-stock-history-non GET called');

    // Get user info from token
    let current_user = { id: null, name: null, role: null };
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          const userId = decoded.userId || decoded.id;
          const users = await executeQuery(
            `SELECT id, name, role FROM employee_profile WHERE id = ?`,
            [userId]
          );
          if (users.length > 0) {
            current_user = { 
              id: users[0].id, 
              name: users[0].name, 
              role: users[0].role 
            };
          }
        }
      }
    } catch (authError) {
      console.error('Error getting user info:', authError);
    }

    // Auto-grant access for admin roles (5,4,3,7)
    if (!current_user.id || !['5', '4', '3', '7'].includes(String(current_user.role))) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const customer_name = searchParams.get('customer_name') || '';
    const station_name = searchParams.get('station_name') || '';
    const product_name = searchParams.get('product_name') || '';
    const from_date = searchParams.get('from_date') || '';
    const to_date = searchParams.get('to_date') || '';

    const offset = (page - 1) * limit;

    console.log('📊 Query parameters:', {
      page, limit, offset, customer_name, station_name, product_name, from_date, to_date
    });

    // Build WHERE conditions
    let whereConditions = [];
    let queryParams = [];

    if (customer_name) {
      whereConditions.push('customer_name LIKE ?');
      queryParams.push(`%${customer_name}%`);
    }

    if (station_name) {
      whereConditions.push('station_name LIKE ?');
      queryParams.push(`%${station_name}%`);
    }

    if (product_name) {
      whereConditions.push('product_name LIKE ?');
      queryParams.push(`%${product_name}%`);
    }

    if (from_date) {
      whereConditions.push('DATE(completion_date) >= ?');
      queryParams.push(from_date);
    }

    if (to_date) {
      whereConditions.push('DATE(completion_date) <= ?');
      queryParams.push(to_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM nb_stock_history 
      ${whereClause}
    `;
    
    const countResult = await executeQuery(countQuery, queryParams);
    const total = countResult[0].total;

    // Get data with pagination
    const dataQuery = `
      SELECT 
        id,
        customer_name,
        station_name,
        product_name,
        quantity,
        request_id,
        completion_date,
        created_at
      FROM nb_stock_history 
      ${whereClause}
      ORDER BY completion_date DESC, id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    console.log('🔍 Data query:', dataQuery);
    console.log('🔍 Query params:', queryParams);

    const data = await executeQuery(dataQuery, queryParams);

    // Format data
    const formattedData = data.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity) || 0,
      completion_date: item.completion_date,
      created_at: item.created_at
    }));

    console.log('✅ Found records:', formattedData.length);

    return NextResponse.json({
      success: true,
      data: formattedData,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_records: total,
        records_per_page: limit,
        has_next: page * limit < total,
        has_prev: page > 1
      },
      filters: {
        customer_name,
        station_name,
        product_name,
        from_date,
        to_date
      }
    });

  } catch (error) {
    console.error('❌ Error in nb-stock-history-non API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch NB stock history' },
      { status: 500 }
    );
  }
}
