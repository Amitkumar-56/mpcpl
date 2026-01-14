import { executeQuery } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    console.log('🔍 Fetching all stock transfer logs...');
    
    // Fetch all stock transfer logs with employee names and station/product details
    const logsQuery = `
      SELECT 
        stl.*,
        COALESCE(ep.name, stl.performed_by_name) as user_name,
        ep.name as employee_name,
        ep.id as employee_profile_id,
        fs_from.station_name as station_from_name,
        fs_to.station_name as station_to_name,
        p.pname as product_name
      FROM stock_transfer_logs stl
      LEFT JOIN employee_profile ep ON stl.performed_by = ep.id
      LEFT JOIN filling_stations fs_from ON stl.station_from = fs_from.id
      LEFT JOIN filling_stations fs_to ON stl.station_to = fs_to.id
      LEFT JOIN products p ON stl.product_id = p.id
      ORDER BY stl.performed_at DESC, stl.id DESC
      LIMIT 500
    `;
    
    const logs = await executeQuery(logsQuery);
    
    console.log(`✅ Found ${logs.length} stock transfer logs`);

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: logs.length
    });

  } catch (error) {
    console.error('❌ Error fetching stock transfer logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock transfer logs: ' + error.message },
      { status: 500 }
    );
  }
}
