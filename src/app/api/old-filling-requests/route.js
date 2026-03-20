// src/app/api/old-filling-requests/route.js
import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('=== Old Filling Requests API Called ===');

    // Query with customer name join
    const sql = `
      SELECT 
        ofr.id,
        ofr.rid as request_id,
        ofr.product,
        ofr.vehicle_number as vehicle_no,
        ofr.cid as customer_id,
        c.name as client_name,
        ofr.aqty as loading_station,
        ofr.fs_id as station_name,
        ofr.driver_number,
        ofr.completed_date,
        ofr.status,
        ofr.remark
      FROM old_filling_requests ofr
      LEFT JOIN customers c ON ofr.cid = c.id
      ORDER BY ofr.id DESC
    `;

    console.log('Fetching all records from old_filling_requests...');
    
    const results = await executeQuery(sql);
    console.log(`Found ${results.length} records`);

    // Format the data for frontend
    const formattedRequests = results.map(row => {
      return {
        request_id: row.request_id || row.id,
        product: row.product || 'N/A',
        loading_station: row.loading_station || row.station_name || 'N/A',
        vehicle_no: row.vehicle_no || 'N/A',
        client_name: row.client_name || 'N/A',
        completed_date: row.completed_date ? new Date(row.completed_date).toLocaleString('en-IN') : '',
        status: row.status || 0,
        remark: row.remark || ''
      };
    });

    return NextResponse.json({
      success: true,
      requests: formattedRequests,
      total: formattedRequests.length
    });

  } catch (error) {
    console.error('Error in old-filling-requests API:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch old filling requests',
      requests: []
    }, { status: 500 });
  }
}