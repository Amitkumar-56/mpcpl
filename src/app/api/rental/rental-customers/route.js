import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || "";
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    let whereClause = "";
    let params = [];

    if (search) {
      whereClause = " WHERE name LIKE ? OR company_name LIKE ? OR phone LIKE ?";
      const searchPattern = `%${search}%`;
      params = [searchPattern, searchPattern, searchPattern];
    }

    // Get total count
    const countResult = await executeQuery(`SELECT COUNT(*) as total FROM rental_customers${whereClause}`, params);
    const totalCount = countResult[0].total;

    // Get paginated data
    const customers = await executeQuery(
      `SELECT * FROM rental_customers${whereClause} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit.toString(), offset.toString()]
    );

    return NextResponse.json({
      success: true,
      data: customers,
      pagination: {
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit: limit
      }
    });
  } catch (error) {
    console.error("Customers API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { name, company_name, phone } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await executeQuery(
      'INSERT INTO rental_customers (name, company_name, phone) VALUES (?, ?, ?)',
      [name, company_name, phone]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
