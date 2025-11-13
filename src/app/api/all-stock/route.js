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

    // Merge data based on fs_id and product
    const mergedData = {};

    stockResult.forEach(row => {
      const { fs_id, product, stock } = row;

      // Initialize the station if it doesn't exist
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

      // Add stock based on product type with new mappings
      switch (parseInt(product)) {
        case 2: // Industrial Oil 40
          mergedData[fs_id].industrial_oil_40 += parseInt(stock);
          break;
        case 3: // Industrial Oil 60
          mergedData[fs_id].industrial_oil_60 += parseInt(stock);
          break;
        case 4: // DEF Loose
          mergedData[fs_id].def_loose += parseInt(stock);
          break;
        case 5: // DEF Bucket
          mergedData[fs_id].def_bucket += parseInt(stock);
          break;
        default:
          console.log(`Unmapped product ID: ${product}`);
          break;
      }
    });

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