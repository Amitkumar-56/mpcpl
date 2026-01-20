//src/app/api/stock-transfers/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET - Fetch combined stock transactions
export async function GET(request) {
  try {
    console.log('📦 API called: /api/stock-transactions');
    
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const subType = searchParams.get('subType') || 'all';
    const status = searchParams.get('status') || 'all';
    const stationId = searchParams.get('stationId');
    const productId = searchParams.get('productId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    console.log('🔍 Filters:', { type, subType, status, stationId, productId, startDate, endDate });

    // Build base queries
    let nbStockQuery = `
      SELECT 
        CONCAT('nb-', nbs.id) as id,
        nbs.station_id,
        COALESCE(fs.station_name, 'Station ' + nbs.station_id) as station_name,
        nbs.product_id,
        COALESCE(p.pname, 'Product ' + nbs.product_id) as product_name,
        nbs.stock as quantity,
        'Inward' as type,
        'NB-Stock' as sub_type,
        nbs.created_at,
        DATE_FORMAT(nbs.created_at, '%d %b %Y %h:%i %p') as date_formatted,
        'Completed' as status,
        'Non-Billing Stock Entry' as remarks,
        NULL as destination_station,
        NULL as driver_name,
        NULL as vehicle_no,
        'nb-stock' as source,
        nbs.stock as current_stock
      FROM non_billing_stocks nbs
      LEFT JOIN products p ON nbs.product_id = p.id
      LEFT JOIN filling_stations fs ON nbs.station_id = fs.id
      WHERE 1=1
    `;
    
    let transferQuery = `
      SELECT 
        CONCAT('st-', st.id) as id,
        st.station_from as station_id,
        COALESCE(fs_from.station_name, 'Station ' + st.station_from) as station_name,
        st.product as product_id,
        COALESCE(p.pname, 'Product ' + st.product) as product_name,
        st.transfer_quantity as quantity,
        'Outward' as type,
        'Stock Transfer' as sub_type,
        st.created_at,
        DATE_FORMAT(st.created_at, '%d %b %Y %h:%i %p') as date_formatted,
        CASE 
          WHEN st.status = 1 THEN 'Dispatch'
          WHEN st.status = 2 THEN 'Pending'
          WHEN st.status = 3 THEN 'Completed'
          ELSE 'Unknown'
        END as status,
        CONCAT('Transfer to ', COALESCE(fs_to.station_name, 'Station ' + st.station_to)) as remarks,
        COALESCE(fs_to.station_name, 'Station ' + st.station_to) as destination_station,
        COALESCE(ep.name, 'Driver ' + st.driver_id) as driver_name,
        COALESCE(v.licence_plate, 'Vehicle ' + st.vehicle_id) as vehicle_no,
        'stock-transfer' as source,
        NULL as current_stock
      FROM stock_transfers st
      LEFT JOIN filling_stations fs_from ON st.station_from = fs_from.id
      LEFT JOIN filling_stations fs_to ON st.station_to = fs_to.id
      LEFT JOIN products p ON st.product = p.id
      LEFT JOIN employee_profile ep ON st.driver_id = ep.id
      LEFT JOIN vehicles v ON st.vehicle_id = v.id
      WHERE 1=1
    `;
    
    // Build WHERE conditions
    const nbParams = [];
    const transferParams = [];
    
    if (stationId) {
      nbStockQuery += ' AND nbs.station_id = ?';
      transferQuery += ' AND st.station_from = ?';
      nbParams.push(stationId);
      transferParams.push(stationId);
    }
    
    if (productId) {
      nbStockQuery += ' AND nbs.product_id = ?';
      transferQuery += ' AND st.product = ?';
      nbParams.push(productId);
      transferParams.push(productId);
    }
    
    if (startDate) {
      nbStockQuery += ' AND DATE(nbs.created_at) >= ?';
      transferQuery += ' AND DATE(st.created_at) >= ?';
      nbParams.push(startDate);
      transferParams.push(startDate);
    }
    
    if (endDate) {
      nbStockQuery += ' AND DATE(nbs.created_at) <= ?';
      transferQuery += ' AND DATE(st.created_at) <= ?';
      nbParams.push(endDate);
      transferParams.push(endDate);
    }
    
    // Add ORDER BY
    nbStockQuery += ' ORDER BY nbs.created_at DESC';
    transferQuery += ' ORDER BY st.created_at DESC';
    
    console.log('📥 Executing NB-Stock query...');
    const nbStocks = await executeQuery(nbStockQuery, nbParams);
    console.log('✅ NB-Stocks fetched:', nbStocks?.length);
    
    console.log('📥 Executing Stock Transfer query...');
    const stockTransfers = await executeQuery(transferQuery, transferParams);
    console.log('✅ Stock Transfers fetched:', stockTransfers?.length);

    // Combine results
    let combinedData = [...nbStocks, ...stockTransfers];

    // Apply filters
    if (type !== 'all') {
      combinedData = combinedData.filter(item => 
        item.type.toLowerCase() === type.toLowerCase()
      );
    }
    
    if (subType !== 'all') {
      combinedData = combinedData.filter(item => 
        item.sub_type.toLowerCase().replace(' ', '-') === subType.toLowerCase()
      );
    }
    
    if (status !== 'all') {
      combinedData = combinedData.filter(item => 
        item.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Sort by date
    combinedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Calculate statistics
    const totalInward = nbStocks.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const totalOutward = stockTransfers.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    const netStock = totalInward - totalOutward;
    
    const uniqueStations = [...new Set(combinedData.map(item => item.station_id))].length;
    const uniqueProducts = [...new Set(combinedData.map(item => item.product_id))].length;

    console.log('🎯 Final combined data:', combinedData.length, 'records');

    return NextResponse.json({
      success: true,
      data: combinedData,
      summary: {
        totalTransactions: combinedData.length,
        totalInward,
        totalOutward,
        netStock,
        uniqueStations,
        uniqueProducts,
        nbStockCount: nbStocks.length,
        transferCount: stockTransfers.length,
        inwardCount: nbStocks.length,
        outwardCount: stockTransfers.length,
        completedCount: combinedData.filter(item => item.status === 'Completed').length,
        pendingCount: combinedData.filter(item => item.status === 'Pending').length,
        dispatchCount: combinedData.filter(item => item.status === 'Dispatch').length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in /api/stock-transactions:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Database error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST - Create new transaction
export async function POST(request) {
  try {
    const body = await request.json();
    const { type, ...data } = body;
    
    console.log('➕ Creating transaction:', { type, data });
    
    if (type === 'nb-stock') {
      // Validate
      if (!data.station_id || !data.product_id || !data.quantity) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: station_id, product_id, quantity' },
          { status: 400 }
        );
      }
      
      const query = `
        INSERT INTO non_billing_stocks (station_id, product_id, stock)
        VALUES (?, ?, ?)
      `;
      const result = await executeQuery(query, [
        data.station_id,
        data.product_id,
        data.quantity
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'NB-Stock entry created successfully',
        id: result.insertId,
        type: 'nb-stock',
        timestamp: new Date().toISOString()
      });
      
    } else if (type === 'stock-transfer') {
      // Validate
      if (!data.station_from || !data.station_to || !data.product_id || !data.quantity) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: station_from, station_to, product_id, quantity' },
          { status: 400 }
        );
      }
      
      const query = `
        INSERT INTO stock_transfers 
        (station_from, station_to, product, transfer_quantity, driver_id, vehicle_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await executeQuery(query, [
        data.station_from,
        data.station_to,
        data.product_id,
        data.quantity,
        data.driver_id || null,
        data.vehicle_id || null,
        data.status || 2 // Default to Pending
      ]);
      
      return NextResponse.json({
        success: true,
        message: 'Stock transfer created successfully',
        id: result.insertId,
        type: 'stock-transfer',
        timestamp: new Date().toISOString()
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid transaction type. Use "nb-stock" or "stock-transfer"' 
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create transaction',
        message: error.message 
      },
      { status: 500 }
    );
  }
}