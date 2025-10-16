import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch suppliers
    const suppliersQuery = 'SELECT id, name FROM suppliers ORDER BY name';
    const suppliers = await executeQuery(suppliersQuery);
    
    // Fetch products
    const productsQuery = 'SELECT id, pname FROM products ORDER BY pname';
    const products = await executeQuery(productsQuery);
    
    // Fetch stations
    const stationsQuery = 'SELECT id, station_name FROM filling_stations ORDER BY station_name';
    const stations = await executeQuery(stationsQuery);

    return NextResponse.json({
      success: true,
      suppliers: suppliers || [],
      products: products || [],
      stations: stations || []
    });
  } catch (error) {
    console.error('Error fetching dropdown data:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Error fetching dropdown data', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}