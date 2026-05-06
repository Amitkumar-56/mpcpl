import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 1. Fetch all products to know their names
    const productList = await executeQuery('SELECT id, pname FROM products');
    const productsMap = {};
    productList.forEach(p => productsMap[p.id] = p.pname);

    // 2. Fetch all filling stations
    const stationList = await executeQuery('SELECT id, station_name FROM filling_stations');
    const stationsMap = {};
    stationList.forEach(s => stationsMap[s.id] = s.station_name);

    // 3. Fetch all stock records from filling_station_stocks
    const stockRecords = await executeQuery('SELECT fs_id, product as product_id, stock FROM filling_station_stocks');

    // 4. Fetch invoice numbers from stock table
    const invoiceRecords = await executeQuery('SELECT DISTINCT fs_id, invoice_number FROM stock WHERE fs_id IS NOT NULL');
    const invoicesMap = {};
    invoiceRecords.forEach(inv => {
      if (!invoicesMap[inv.fs_id]) invoicesMap[inv.fs_id] = [];
      invoicesMap[inv.fs_id].push(inv.invoice_number);
    });

    // 5. Merge data dynamically
    const mergedData = {};

    stockRecords.forEach(record => {
      const fsId = record.fs_id;
      const productId = record.product_id;
      const stockVal = parseFloat(record.stock) || 0;

      if (!mergedData[fsId]) {
        mergedData[fsId] = {
          station_id: fsId,
          station_name: stationsMap[fsId] || `Station ${fsId}`,
          products: {}, // Dynamic product stocks
          invoice_numbers: invoicesMap[fsId] || []
        };
      }

      const pName = productsMap[productId] || `Product ${productId}`;
      mergedData[fsId].products[productId] = {
        id: productId,
        name: pName,
        stock: stockVal
      };
    });

    // Ensure all stations are included even if no stock
    stationList.forEach(s => {
      if (!mergedData[s.id]) {
        mergedData[s.id] = {
          station_id: s.id,
          station_name: s.station_name,
          products: {},
          invoice_numbers: invoicesMap[s.id] || []
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: Object.values(mergedData),
      allProducts: productList // Send all products for reference
    });

  } catch (error) {
    console.error('Error fetching dynamic stock data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock data: ' + error.message },
      { status: 500 }
    );
  }
}