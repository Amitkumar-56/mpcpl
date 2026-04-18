// src/app/api/loading-unloading-report/route.js

import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const party = searchParams.get('party');
    
    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page')) || 1);
    const limit = Math.max(1, parseInt(searchParams.get('limit')) || 25); 
    const offset = Math.max(0, (page - 1) * limit);
    
    console.log('🔢 Report Pagination values:', { page, limit, offset });

    console.log('📊 Report API Called with:', { userId, startDate, endDate, party, page, limit, offset });

    if (!userId) {
      console.log('❌ No userId provided');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Test: Check if there's any data at all
    try {
      const testQuery = "SELECT COUNT(*) as total FROM shipment_records LIMIT 1";
      const testResult = await executeQuery(testQuery, []);
      console.log('🧪 Test - Total records in shipment_records:', testResult[0]?.total || 0);
    } catch (testErr) {
      console.error('❌ Test query failed:', testErr);
    }

    // Base filter logic
    let filterClause = " WHERE 1=1";
    const params = [];

    if (startDate) {
      filterClause += " AND DATE(final_loading_datetime) >= ?";
      params.push(startDate);
    }
    if (endDate) {
      filterClause += " AND DATE(final_loading_datetime) <= ?";
      params.push(endDate);
    }
    if (party) {
      filterClause += " AND (consignee LIKE ? OR tanker LIKE ? OR driver LIKE ?)";
      params.push(`%${party}%`, `%${party}%`, `%${party}%`);
    }

    // Count query for pagination
    const countQuery = `SELECT COUNT(*) as total FROM shipment_records ${filterClause}`;
    console.log('🔍 Count Query:', countQuery);
    console.log('🔍 Count Params:', params);
    const countResult = await executeQuery(countQuery, params);
    const totalRecords = countResult[0]?.total || 0;
    console.log('📊 Total Records:', totalRecords);

    // Data query
    let dataQuery = `
      SELECT 
        shipment_id as id,
        shipment_id,
        tanker,
        driver,
        dispatch,
        driver_mobile,
        consignee,
        empty_weight_loading,
        loaded_weight_loading,
        net_weight_loading,
        density_loading,
        temperature_loading,
        final_loading_datetime,
        entered_by_loading,
        empty_weight_unloading,
        loaded_weight_unloading,
        net_weight_unloading,
        density_unloading,
        temperature_unloading,
        final_unloading_datetime,
        entered_by_unloading,
        created_at
      FROM shipment_records
      ${filterClause}
      ORDER BY final_loading_datetime DESC 
      LIMIT ? OFFSET ?
    `;
    
    // Use template literals for LIMIT/OFFSET to avoid MySQL parameter issues
    const finalQuery = dataQuery.replace('LIMIT ? OFFSET ?', `LIMIT ${limit} OFFSET ${offset}`);
    console.log('Final Query:', finalQuery);
    console.log('Final Params:', params);
    const shipments = await executeQuery(finalQuery, params);
    console.log('📦 Shipments Found:', shipments?.length || 0);

    // Summary query (un-paginated but filtered)
    const summaryQuery = `
      SELECT 
        SUM(net_weight_loading) as total_kg,
        COUNT(*) as total_count
      FROM shipment_records 
      ${filterClause}
    `;
    const summaryResult = await executeQuery(summaryQuery, params);

    return NextResponse.json({
      success: true,
      shipments: shipments || [],
      pagination: {
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
        limit
      },
      summary: summaryResult[0] || { total_kg: 0, total_count: 0 }
    });

  } catch (error) {
    console.error('Report API Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal Server Error',
      message: error.message 
    }, { status: 500 });
  }
}
