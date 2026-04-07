// src/app/api/nb-stock/activity-log/options/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get all unique stations
    const stationsResult = await executeQuery(`
      SELECT DISTINCT fs.station_name as name
      FROM non_billing_stocks nbs
      LEFT JOIN filling_stations fs ON nbs.station_id = fs.id
      WHERE fs.station_name IS NOT NULL
      ORDER BY name
    `);

    // Get all unique products
    const productsResult = await executeQuery(`
      SELECT DISTINCT p.pname as name
      FROM non_billing_stocks nbs
      LEFT JOIN products p ON nbs.product_id = p.id
      WHERE p.pname IS NOT NULL
      ORDER BY name
    `);

    return NextResponse.json({
      success: true,
      data: {
        stations: stationsResult.map(s => s.name).filter(Boolean),
        products: productsResult.map(p => p.name).filter(Boolean)
      }
    });

  } catch (error) {
    console.error('Error fetching options for NB stock activity logs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch options: ' + error.message },
      { status: 500 }
    );
  }
}
