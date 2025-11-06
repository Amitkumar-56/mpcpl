// src/app/api/cst/loading-stations/route.js
import { executeQuery } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');
    
    if (!cid || cid === '0') {
      return NextResponse.json({ stations: [] });
    }

    // Get customer data
    const customerQuery = "SELECT id, name, blocklocation FROM customers WHERE id = ?";
    const customerResult = await executeQuery(customerQuery, [cid]);
    
    if (customerResult.length === 0) {
      return NextResponse.json({ stations: [] });
    }

    const customer = customerResult[0];
    const stations = [];

    if (customer.blocklocation) {
      const blocklocations = customer.blocklocation
        .split(',')
        .filter(loc => !isNaN(parseInt(loc)) && loc.trim() !== '')
        .map(loc => parseInt(loc));

      if (blocklocations.length > 0) {
        const placeholders = blocklocations.map(() => '?').join(',');
        const stationsQuery = `
          SELECT id, station_name, phone, map_link 
          FROM filling_stations 
          WHERE id IN (${placeholders})
        `;
        
        const stationsResult = await executeQuery(stationsQuery, blocklocations);
        stations.push(...stationsResult);
      }
    }

    return NextResponse.json({
      customerId: cid,
      stations: stations
    });

  } catch (error) {
    console.error('Error fetching stations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}