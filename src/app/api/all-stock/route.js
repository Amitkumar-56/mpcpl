import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch filling station names
    const fsResult = await executeQuery(`
      SELECT id, station_name 
      FROM filling_stations
    `);
    
    const fillingStations = {};
    fsResult.forEach(row => {
      fillingStations[row.id] = row.station_name;
    });

    // Fetch product names
    const productResult = await executeQuery(`
      SELECT id, pname 
      FROM products
    `);
    
    const products = {};
    productResult.forEach(row => {
      products[row.id] = row.pname;
    });

    // Fetch stock data
    const stockResult = await executeQuery(`
      SELECT fs_id, product, stock 
      FROM filling_station_stocks 
      ORDER BY fs_id, product
    `);

    // Merge data based on fs_id and product (defensive, with logging)
    const mergedData = {};

    if (!Array.isArray(stockResult)) {
      console.error('Unexpected stockResult:', stockResult);
      return NextResponse.json({ success: false, error: 'Unexpected stock data format from DB' }, { status: 500 });
    }

    try {
      stockResult.forEach((row, idx) => {
        // Support alternate column names and guard against nulls
        const fs_id = row.fs_id ?? row.station_id ?? null;
        const product = row.product ?? row.product_id ?? null;
        const stockNum = Number(row.stock) || 0;

        if (!fs_id || product === null || product === undefined) {
          console.warn('Skipping invalid stock row at index', idx, row);
          return; // skip this row
        }

        // Initialize station entry
        if (!mergedData[fs_id]) {
          mergedData[fs_id] = {
            station_id: fs_id,
            station_name: fillingStations[fs_id] || 'Unknown Station',
            industrial_oil_40: 0,
            industrial_oil_60: 0,
            def_loose: 0,
            def_bucket: 0,
          };
        }

        // Sum into correct product bucket
        switch (Number(product)) {
          case 2: // Industrial Oil 40
            mergedData[fs_id].industrial_oil_40 += stockNum;
            break;
          case 3: // Industrial Oil 60
            mergedData[fs_id].industrial_oil_60 += stockNum;
            break;
          case 4: // DEF Loose
            mergedData[fs_id].def_loose += stockNum;
            break;
          case 5: // DEF Bucket
            mergedData[fs_id].def_bucket += stockNum;
            break;
          default:
            // Log unmapped product to help debugging but do not fail
            console.warn('Unmapped product ID in stock row:', { index: idx, product, row });
            break;
        }
      });
    } catch (err) {
      console.error('Error processing stockResult:', err);
      return NextResponse.json({ success: false, error: 'Failed to process stock data: ' + err.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: Object.values(mergedData)
    });

  } catch (error) {
    console.error('Error fetching stock data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock data' },
      { status: 500 }
    );
  }
}