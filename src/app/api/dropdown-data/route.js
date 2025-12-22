import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch suppliers
    const suppliers = await executeQuery('SELECT id, name FROM suppliers ORDER BY name');
    
    // Fetch products
    const products = await executeQuery('SELECT id, pname FROM products ORDER BY pname');
    
    // Fetch stations
    const stations = await executeQuery('SELECT id, station_name FROM filling_stations ORDER BY station_name');

    // Ensure arrays are always returned
    const response = {
      success: true,
      suppliers: Array.isArray(suppliers) ? suppliers : [],
      products: Array.isArray(products) ? products : [],
      stations: Array.isArray(stations) ? stations : []
    };

    console.log('📦 Dropdown data loaded:', {
      suppliers: response.suppliers.length,
      products: response.products.length,
      stations: response.stations.length
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error fetching dropdown data:', error);
    // Return empty arrays on error instead of failing
    return NextResponse.json({
      success: false,
      message: 'Error fetching dropdown data',
      error: error.message,
      suppliers: [],
      products: [],
      stations: []
    }, { status: 500 });
  }
}