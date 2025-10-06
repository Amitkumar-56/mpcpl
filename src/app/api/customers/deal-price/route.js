//src/app/api/customers/deal-price/schedule/route.js
import { executeQuery } from "@/lib/db";
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    // Fetch customer details
    const [customer] = await executeQuery.query(
      'SELECT name FROM customers WHERE id = ?',
      [id]
    );

    if (!customer || customer.length === 0) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Fetch all stations
    const stations = await executeQuery.query(
      'SELECT id, station_name FROM filling_stations'
    );

    // Fetch all products
    const products = await executeQuery.query(
      'SELECT id, pname FROM product'
    );

    // Fetch existing deal prices
    const dealPrices = await executeQuery.query(
      'SELECT station_id, product_id, price FROM deal_price WHERE com_id = ?',
      [id]
    );

    // Organize deal prices
    const pricesMap = {};
    dealPrices.forEach(row => {
      if (!pricesMap[row.station_id]) {
        pricesMap[row.station_id] = {};
      }
      pricesMap[row.station_id][row.product_id] = row.price;
    });

    return NextResponse.json({
      customer: customer[0],
      stations,
      products,
      dealPrices: pricesMap
    });

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { com_id, prices } = body;

    if (!com_id) {
      return NextResponse.json({ error: 'com_id is required' }, { status: 400 });
    }

    // Start transaction
    await executeQuery.query('START TRANSACTION');

    try {
      // Delete existing prices
      await executeQuery.query('DELETE FROM deal_price WHERE com_id = ?', [com_id]);

      // Insert new prices
      for (const [key, price] of Object.entries(prices)) {
        if (price && price.trim() !== '') {
          const [stationId, productId] = key.split('_');
          await db.query(
            'INSERT INTO deal_price (com_id, station_id, product_id, price) VALUES (?, ?, ?, ?)',
            [com_id, stationId, productId, price]
          );
        }
      }

      await executeQuery.query('COMMIT');
      return NextResponse.json({ success: true, message: 'Prices updated successfully' });

    } catch (error) {
      await executeQuery.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}